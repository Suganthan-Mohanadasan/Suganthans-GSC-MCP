/**
 * `npx suganthan-gsc-mcp setup`
 *
 * Guided setup: authenticates with Google, verifies API access with a live
 * sites.list call, then writes the MCP entry into Claude Desktop and/or
 * Claude Code config for the user. The goal is that nobody ever edits a
 * config file or reads an OAuth tutorial to get started.
 *
 * Privacy model: tokens are cached at ~/.gsc-mcp/ on this machine and every
 * API call goes straight from this machine to Google. Nothing touches any
 * third party server.
 */
import { google } from "googleapis";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as readline from "node:readline/promises";
import { spawnSync } from "child_process";
import {
  authenticateWithOAuth,
  clearCachedToken,
  tokenPath,
  ScopeTier,
} from "./oauth.js";
import { embeddedClientAvailable } from "./embedded-client.js";

interface SetupOptions {
  client: "desktop" | "code" | "both" | "print" | null;
  scopes: ScopeTier | null;
  site: string | null;
  secrets: string | null;
  reauth: boolean;
  force: boolean;
  dryRun: boolean;
  yes: boolean;
  help: boolean;
}

const USAGE = `
Usage: npx suganthan-gsc-mcp setup [options]

Guided setup for the GSC MCP server. Signs you in with Google, checks the
connection works, and writes the config for Claude Desktop or Claude Code.

Options:
  --client <target>   Where to install: desktop, code, both, or print
                      (print shows the JSON without writing anything)
  --scopes <tier>     readonly (recommended) or full
                      (full adds sitemap submission and the Indexing API)
  --site <property>   Default GSC property, e.g. sc-domain:yoursite.com
  --secrets <path>    Path to your own OAuth client secrets JSON file
  --reauth            Discard the cached token and sign in again
  --force             Overwrite an existing gsc entry without asking
  --dry-run           Show what would be written without signing in or writing
  --yes               Accept defaults for any prompt not covered by a flag
  --help              Show this help

Your Search Console data goes straight from this machine to Google.
Tokens are stored locally in ~/.gsc-mcp/ and never leave this machine.
`.trim();

function parseArgs(argv: string[]): SetupOptions {
  const opts: SetupOptions = {
    client: null,
    scopes: null,
    site: null,
    secrets: null,
    reauth: false,
    force: false,
    dryRun: false,
    yes: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--client": {
        const v = argv[++i];
        if (v === "desktop" || v === "code" || v === "both" || v === "print") opts.client = v;
        else throw new Error(`Invalid --client value: ${v}. Use desktop, code, both, or print.`);
        break;
      }
      case "--scopes": {
        const v = argv[++i];
        if (v === "readonly" || v === "full") opts.scopes = v;
        else throw new Error(`Invalid --scopes value: ${v}. Use readonly or full.`);
        break;
      }
      case "--site":
        opts.site = argv[++i] ?? null;
        break;
      case "--secrets":
        opts.secrets = argv[++i] ?? null;
        break;
      case "--reauth":
        opts.reauth = true;
        break;
      case "--force":
        opts.force = true;
        break;
      case "--dry-run":
        opts.dryRun = true;
        break;
      case "--yes":
      case "-y":
        opts.yes = true;
        break;
      case "--help":
      case "-h":
        opts.help = true;
        break;
      default:
        throw new Error(`Unknown option: ${a}. Run with --help for usage.`);
    }
  }
  return opts;
}

function desktopConfigPath(): string {
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "Claude", "claude_desktop_config.json");
  }
  if (process.platform === "win32") {
    const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, "Claude", "claude_desktop_config.json");
  }
  return path.join(os.homedir(), ".config", "Claude", "claude_desktop_config.json");
}

interface Prompter {
  ask(question: string, fallback: string): Promise<string>;
  close(): void;
}

function makePrompter(nonInteractive: boolean): Prompter {
  if (nonInteractive || !process.stdin.isTTY) {
    return {
      ask: async (_q: string, fallback: string) => fallback,
      close: () => undefined,
    };
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return {
    ask: async (question: string, fallback: string) => {
      const answer = (await rl.question(question)).trim();
      return answer.length > 0 ? answer : fallback;
    },
    close: () => rl.close(),
  };
}

function buildEnv(opts: { scopes: ScopeTier; site: string; secretsPath: string | null }): Record<string, string> {
  const env: Record<string, string> = {
    GSC_AUTH_MODE: "oauth",
    GSC_SCOPES: opts.scopes,
    GSC_SITE_URL: opts.site,
  };
  if (opts.secretsPath) {
    env.GSC_OAUTH_SECRETS_FILE = opts.secretsPath;
  } else if (process.env.GSC_OAUTH_CLIENT_ID && process.env.GSC_OAUTH_CLIENT_SECRET) {
    env.GSC_OAUTH_CLIENT_ID = process.env.GSC_OAUTH_CLIENT_ID;
    env.GSC_OAUTH_CLIENT_SECRET = process.env.GSC_OAUTH_CLIENT_SECRET;
  }
  // With the embedded client, no credential env vars are needed at all.
  return env;
}

function serverEntry(env: Record<string, string>) {
  return {
    command: "npx",
    args: ["-y", "suganthan-gsc-mcp"],
    env,
  };
}

async function writeDesktopConfig(
  env: Record<string, string>,
  prompter: Prompter,
  force: boolean,
  dryRun: boolean
): Promise<boolean> {
  const configPath = desktopConfigPath();
  const entry = serverEntry(env);

  if (dryRun) {
    console.log(`\n[dry run] Would write to: ${configPath}`);
    console.log(JSON.stringify({ mcpServers: { gsc: entry } }, null, 2));
    return true;
  }

  let config: any = {};
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, "utf8");
    try {
      config = raw.trim().length > 0 ? JSON.parse(raw) : {};
    } catch {
      console.error(`\nCould not parse ${configPath}.`);
      console.error("The file contains invalid JSON. Fix it first, then re-run setup. Nothing was changed.");
      return false;
    }
  } else {
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      console.error(`\nClaude Desktop config folder not found at ${dir}.`);
      console.error("Is Claude Desktop installed? Creating the folder anyway.");
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  config.mcpServers = config.mcpServers || {};
  if (config.mcpServers.gsc && !force) {
    const overwrite = await prompter.ask("A gsc entry already exists in Claude Desktop. Overwrite it? [y/N] ", "n");
    if (overwrite.toLowerCase() !== "y") {
      console.log("Left the existing Claude Desktop entry alone.");
      return false;
    }
  }

  if (fs.existsSync(configPath)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    fs.copyFileSync(configPath, `${configPath}.backup-${stamp}`);
  }

  config.mcpServers.gsc = entry;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
  console.log(`\nClaude Desktop configured: ${configPath}`);
  console.log("Restart Claude Desktop to pick it up.");
  return true;
}

function writeCodeConfig(env: Record<string, string>, force: boolean, dryRun: boolean): boolean {
  const envFlags: string[] = [];
  for (const [k, v] of Object.entries(env)) {
    envFlags.push("-e", `${k}=${v}`);
  }
  const addArgs = ["mcp", "add", "--scope", "user", ...envFlags, "gsc", "--", "npx", "-y", "suganthan-gsc-mcp"];
  const manualCommand = `claude ${addArgs.map((a) => (a.includes(" ") ? JSON.stringify(a) : a)).join(" ")}`;

  if (dryRun) {
    console.log("\n[dry run] Would run:");
    console.log(`  ${manualCommand}`);
    return true;
  }

  if (force) {
    spawnSync("claude", ["mcp", "remove", "--scope", "user", "gsc"], { stdio: "ignore" });
  }

  const result = spawnSync("claude", addArgs, { stdio: "inherit" });
  if (result.error && (result.error as NodeJS.ErrnoException).code === "ENOENT") {
    console.error("\nThe claude CLI was not found on PATH. Run this yourself once it is installed:");
    console.error(`  ${manualCommand}`);
    return false;
  }
  if (result.status !== 0) {
    console.error("\nclaude mcp add did not succeed. If an entry already exists, remove it first:");
    console.error("  claude mcp remove --scope user gsc");
    console.error("then re-run setup, or run manually:");
    console.error(`  ${manualCommand}`);
    return false;
  }
  console.log("\nClaude Code configured (user scope).");
  return true;
}

export async function runSetup(argv: string[]): Promise<number> {
  let opts: SetupOptions;
  try {
    opts = parseArgs(argv);
  } catch (err: any) {
    console.error(err.message);
    return 1;
  }

  if (opts.help) {
    console.log(USAGE);
    return 0;
  }

  console.log("Suganthan's GSC MCP setup");
  console.log("Free, open source, and private. Your data goes straight from this machine to Google.\n");

  const prompter = makePrompter(opts.yes);
  try {
    // 1. Credentials
    let secretsPath: string | null = null;
    if (opts.secrets) {
      secretsPath = path.resolve(opts.secrets);
      if (!fs.existsSync(secretsPath)) {
        console.error(`Secrets file not found: ${secretsPath}`);
        return 1;
      }
    } else if (process.env.GSC_OAUTH_CLIENT_ID && process.env.GSC_OAUTH_CLIENT_SECRET) {
      console.log("Using OAuth client from GSC_OAUTH_CLIENT_ID / GSC_OAUTH_CLIENT_SECRET.");
    } else if (process.env.GSC_OAUTH_SECRETS_FILE && fs.existsSync(process.env.GSC_OAUTH_SECRETS_FILE)) {
      secretsPath = path.resolve(process.env.GSC_OAUTH_SECRETS_FILE);
      console.log(`Using OAuth client from ${secretsPath}.`);
    } else if (embeddedClientAvailable()) {
      console.log("Using the built in Google sign in. No Google Cloud setup needed.");
    } else if (!opts.dryRun) {
      console.log("This build has no embedded OAuth client yet, so you need your own (5 minutes, one time):");
      console.log("  1. console.cloud.google.com > create a project > enable the Search Console API");
      console.log("  2. Credentials > Create credentials > OAuth client ID > Desktop app");
      console.log("  3. Download the JSON file");
      console.log("Full walkthrough: https://github.com/Suganthan-Mohanadasan/Suganthans-GSC-MCP#quick-start\n");
      const p = await prompter.ask("Path to your client secrets JSON file: ", "");
      if (!p) {
        console.error("No credentials provided. Re-run setup when you have the JSON file.");
        return 1;
      }
      secretsPath = path.resolve(p.replace(/^~\//, os.homedir() + "/"));
      if (!fs.existsSync(secretsPath)) {
        console.error(`Secrets file not found: ${secretsPath}`);
        return 1;
      }
    }

    // 2. Scope tier
    let scopes: ScopeTier;
    if (opts.scopes) {
      scopes = opts.scopes;
    } else {
      const answer = await prompter.ask(
        "Access level? [1] Read only (recommended)  [2] Full, adds sitemap and URL submission tools. Choose [1/2]: ",
        "1"
      );
      scopes = answer.trim() === "2" ? "full" : "readonly";
    }
    console.log(scopes === "readonly"
      ? "Read only access. The consent screen will show a single view permission."
      : "Full access. Includes sitemap submission and the Indexing API.");

    // 3. Authenticate and verify, unless dry run
    let siteUrl = opts.site;
    if (!opts.dryRun) {
      process.env.GSC_SCOPES = scopes;
      if (secretsPath) process.env.GSC_OAUTH_SECRETS_FILE = secretsPath;
      if (opts.reauth) clearCachedToken();

      console.log("\nOpening your browser for Google sign in...");
      const auth = await authenticateWithOAuth();

      const sc = google.searchconsole({ version: "v1", auth });
      const res = await sc.sites.list({});
      const sites = (res.data.siteEntry || []).filter((s) => s.siteUrl);
      console.log(`\nConnected. Your Google account has ${sites.length} Search Console propert${sites.length === 1 ? "y" : "ies"}.`);

      if (!siteUrl) {
        if (sites.length === 0) {
          console.log("No properties found on this account. You can still set one manually.");
          siteUrl = await prompter.ask("Default property (e.g. sc-domain:yoursite.com): ", "");
          if (!siteUrl) {
            console.error("A default property is required. Re-run setup once the Google account has GSC access.");
            return 1;
          }
        } else if (sites.length === 1) {
          siteUrl = sites[0].siteUrl!;
          console.log(`Default property: ${siteUrl}`);
        } else {
          sites.forEach((s, i) => console.log(`  [${i + 1}] ${s.siteUrl}  (${s.permissionLevel})`));
          const pick = await prompter.ask(`Default property [1-${sites.length}]: `, "1");
          const idx = Math.min(Math.max(parseInt(pick, 10) || 1, 1), sites.length) - 1;
          siteUrl = sites[idx].siteUrl!;
          console.log(`Default property: ${siteUrl}`);
        }
      }
    } else if (!siteUrl) {
      siteUrl = "sc-domain:yoursite.com";
    }

    // 4. Choose where to install
    let client = opts.client;
    if (!client) {
      const answer = await prompter.ask(
        "\nInstall where? [1] Claude Desktop  [2] Claude Code  [3] Both  [4] Just print the config. Choose [1-4]: ",
        "1"
      );
      client = answer.trim() === "2" ? "code" : answer.trim() === "3" ? "both" : answer.trim() === "4" ? "print" : "desktop";
    }

    const env = buildEnv({ scopes, site: siteUrl!, secretsPath });

    let ok = true;
    if (client === "print") {
      console.log("\nAdd this to your MCP client config:");
      console.log(JSON.stringify({ mcpServers: { gsc: serverEntry(env) } }, null, 2));
    } else {
      if (client === "desktop" || client === "both") {
        ok = (await writeDesktopConfig(env, prompter, opts.force, opts.dryRun)) && ok;
      }
      if (client === "code" || client === "both") {
        ok = writeCodeConfig(env, opts.force, opts.dryRun) && ok;
      }
    }

    if (!opts.dryRun && ok) {
      console.log("\nDone. Try asking Claude:");
      console.log('  "What are my quick win keywords?"');
      console.log('  "Which pages lost traffic this month and why?"');
      console.log('  "What are my top image search queries?"');
      console.log(`\nToken lives at ${tokenPath()} and never leaves this machine.`);
      console.log("Revoke access any time at https://myaccount.google.com/permissions");
      console.log("Change access level later by re-running: npx suganthan-gsc-mcp setup --reauth");
    }
    return ok ? 0 : 1;
  } catch (err: any) {
    console.error(`\nSetup failed: ${err.message}`);
    return 1;
  } finally {
    prompter.close();
  }
}
