import { searchconsole_v1 } from "googleapis";
export declare function getConfig(): {
    keyFile: string;
    siteUrl: string;
};
export declare function getSearchConsoleClient(): Promise<searchconsole_v1.Searchconsole>;
