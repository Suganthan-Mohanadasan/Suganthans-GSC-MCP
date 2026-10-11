// Tests for the outbound-fetch guard (image_page_audit) and the report-path
// restriction (generate_report). Run with `npm test` (builds first).
// No network access is needed: DNS and fetch are injected where a public host
// is involved, and the only real requests go to a server on 127.0.0.1 that
// must never be reached.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as http from "node:http";
import * as os from "node:os";
import * as path from "node:path";

import {
  FetchBlockedError,
  assertPublicUrl,
  hostMatchesProperties,
  isBlockedAddress,
  readBodyLimited,
  safeFetch,
} from "../dist/safe-fetch.js";
import { reportFileName, writeReportFile } from "../dist/tools/generate-report.js";

const publicResolver = async () => ["93.184.216.34"];

test("isBlockedAddress: private, loopback, link-local, CGNAT and mapped forms are blocked", () => {
  for (const address of [
    "127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.20.1",
    "169.254.169.254", "100.72.91.118", "0.0.0.0", "224.0.0.1", "255.255.255.255",
    "::1", "::", "fe80::1", "fd00::1", "ff02::1",
    "::ffff:192.168.20.1", "::ffff:c0a8:1401", "::ffff:127.0.0.1", "64:ff9b::10.0.0.1",
    "not-an-ip",
  ]) {
    assert.equal(isBlockedAddress(address), true, address);
  }
});

test("isBlockedAddress: public addresses pass", () => {
  for (const address of ["93.184.216.34", "8.8.8.8", "172.32.0.1", "100.128.0.1", "2606:4700::1111", "::ffff:8.8.8.8"]) {
    assert.equal(isBlockedAddress(address), false, address);
  }
});

test("assertPublicUrl refuses non-http schemes, IP literals in private ranges and private DNS answers", async () => {
  const refused = [
    ["file:///etc/passwd", publicResolver],
    ["ftp://example.com/", publicResolver],
    ["http://127.0.0.1:8080/", publicResolver],
    ["http://192.168.20.1/", publicResolver],
    ["http://[::1]/", publicResolver],
    ["http://[::ffff:192.168.20.1]/", publicResolver],
    ["http://169.254.169.254/latest/meta-data/", publicResolver],
    ["http://router.example.com/", async () => ["192.168.20.1"]],
    ["http://mixed.example.com/", async () => ["93.184.216.34", "10.0.0.5"]],
    ["http://nowhere.invalid/", async () => { throw new Error("ENOTFOUND"); }],
    ["not a url", publicResolver],
  ];
  for (const [url, resolver] of refused) {
    await assert.rejects(assertPublicUrl(url, resolver), FetchBlockedError, url);
  }
  const ok = await assertPublicUrl("https://www.example.com/page", publicResolver);
  assert.equal(ok.hostname, "www.example.com");
});

function fakeFetch(routes) {
  const calls = [];
  const impl = async (url) => {
    calls.push(url);
    const route = routes[url];
    if (!route) throw new Error(`unexpected fetch ${url}`);
    return new Response(route.body ?? "", { status: route.status ?? 200, headers: route.headers ?? {} });
  };
  return { impl, calls };
}

test("safeFetch: a redirect from a public page to an internal address is refused before it is fetched", async () => {
  const { impl, calls } = fakeFetch({
    "https://www.example.com/": { status: 302, headers: { location: "http://192.168.20.1/admin" } },
  });
  await assert.rejects(
    safeFetch("https://www.example.com/", { timeoutMs: 1000, resolve: publicResolver, fetchImpl: impl }),
    FetchBlockedError
  );
  assert.deepEqual(calls, ["https://www.example.com/"]);
});

test("safeFetch: the per-hop check also applies to redirect targets", async () => {
  const { impl, calls } = fakeFetch({
    "https://www.example.com/": { status: 301, headers: { location: "https://other.example.net/" } },
  });
  const onlyExampleCom = (url) => {
    if (!hostMatchesProperties(url.hostname, ["sc-domain:example.com"])) throw new FetchBlockedError("foreign host");
  };
  await assert.rejects(
    safeFetch("https://www.example.com/", { timeoutMs: 1000, resolve: publicResolver, fetchImpl: impl, checkUrl: onlyExampleCom }),
    /foreign host/
  );
  assert.equal(calls.length, 1);
});

test("safeFetch: follows public redirects, reports the final URL, stops after maxRedirects", async () => {
  const { impl } = fakeFetch({
    "https://example.com/": { status: 301, headers: { location: "/home" } },
    "https://example.com/home": { status: 200, body: "<html></html>" },
  });
  const { response, url } = await safeFetch("https://example.com/", { timeoutMs: 1000, resolve: publicResolver, fetchImpl: impl });
  assert.equal(response.status, 200);
  assert.equal(url, "https://example.com/home");

  const loop = fakeFetch({ "https://example.com/a": { status: 302, headers: { location: "/a" } } });
  await assert.rejects(
    safeFetch("https://example.com/a", { timeoutMs: 1000, resolve: publicResolver, fetchImpl: loop.impl, maxRedirects: 3 }),
    /More than 3 redirects/
  );
});

test("safeFetch with the real fetch never reaches a server on 127.0.0.1", async () => {
  let hits = 0;
  const server = http.createServer((req, res) => { hits++; res.end("secret"); });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    await assert.rejects(safeFetch(`http://127.0.0.1:${port}/`, { timeoutMs: 2000 }), FetchBlockedError);
    await assert.rejects(safeFetch(`http://localhost:${port}/`, { timeoutMs: 2000 }), FetchBlockedError);
    assert.equal(hits, 0);
  } finally {
    server.close();
  }
});

test("readBodyLimited: caps declared and streamed bodies", async () => {
  const small = await readBodyLimited(new Response("hello"), 10);
  assert.equal(small.toString(), "hello");
  assert.equal(await readBodyLimited(new Response("x".repeat(11)), 10), null);
  assert.equal(await readBodyLimited(new Response("x", { headers: { "content-length": "999999" } }), 10), null);
  const stream = new ReadableStream({
    pull(controller) { controller.enqueue(new Uint8Array(4096)); }, // endless
  });
  assert.equal(await readBodyLimited(new Response(stream), 64 * 1024), null);
});

test("hostMatchesProperties: domain properties cover subdomains, URL-prefix properties one host", () => {
  const props = ["sc-domain:example.com", "https://shop.example.org/"];
  assert.equal(hostMatchesProperties("example.com", props), true);
  assert.equal(hostMatchesProperties("www.example.com", props), true);
  assert.equal(hostMatchesProperties("WWW.Example.COM.", props), true);
  assert.equal(hostMatchesProperties("shop.example.org", props), true);
  assert.equal(hostMatchesProperties("example.org", props), false);
  assert.equal(hostMatchesProperties("evilexample.com", props), false);
  assert.equal(hostMatchesProperties("example.com.evil.net", props), false);
  assert.equal(hostMatchesProperties("example.com", []), false);
});

test("image_page_audit refuses internal and foreign page URLs without fetching them", async () => {
  let hits = 0;
  const server = http.createServer((req, res) => { hits++; res.end("<html><img src='/x.png'></html>"); });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  // Configured property, and a key file that exists but holds no credentials,
  // so sites.list fails and only the configured property counts.
  process.env.GSC_SITE_URL = "sc-domain:example.com";
  process.env.GSC_KEY_FILE = path.resolve("package.json");
  delete process.env.GSC_AUTH_MODE;
  delete process.env.GSC_SITE_URLS;
  try {
    const { imagePageAudit } = await import("../dist/tools/image-page-audit.js");
    const { audits } = await imagePageAudit([
      `http://127.0.0.1:${port}/`,
      "https://attacker.example.net/",
    ], false);
    assert.equal(audits[0].status, "fetch_refused");
    assert.match(audits[0].error, /not part of a Search Console property/);
    assert.equal(audits[1].status, "fetch_refused");
    assert.match(audits[1].error, /not part of a Search Console property/);
    assert.equal(hits, 0);
  } finally {
    server.close();
  }
});

test("generate_report: output_path must be a plain file name", () => {
  for (const bad of ["../escape.md", "..\\escape.md", "/etc/passwd", "C:\\Windows\\x.md", "sub/x.md", ".bashrc", "a..b.md", ""]) {
    if (bad === "") continue; // empty means "use the default name"
    assert.throws(() => reportFileName(bad, "2026-10-11"), /plain file name/, bad);
  }
  assert.equal(reportFileName(undefined, "2026-10-11"), "gsc-report-2026-10-11.md");
  assert.equal(reportFileName("weekly report", "2026-10-11"), "weekly report.md");
  assert.equal(reportFileName("weekly.md", "2026-10-11"), "weekly.md");
});

test("generate_report: existing files are never overwritten", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gsc-report-test-"));
  try {
    const first = writeReportFile(dir, "weekly.md", "one");
    const second = writeReportFile(dir, "weekly.md", "two");
    assert.equal(path.basename(first), "weekly.md");
    assert.equal(path.basename(second), "weekly-2.md");
    assert.equal(fs.readFileSync(first, "utf8"), "one");
    assert.equal(fs.readFileSync(second, "utf8"), "two");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
