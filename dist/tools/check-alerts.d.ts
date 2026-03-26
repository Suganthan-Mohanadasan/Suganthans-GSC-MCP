interface Alert {
    severity: "critical" | "warning" | "info";
    type: "position_drop" | "ctr_drop" | "click_drop" | "disappeared";
    entity: string;
    detail: string;
    currentValue: number;
    previousValue: number;
    change: number;
}
interface AlertResult {
    alerts: Alert[];
    summary: {
        critical: number;
        warning: number;
        info: number;
        total: number;
    };
    period: {
        days: number;
        startDate: string;
        endDate: string;
    };
    thresholds: {
        positionDrop: number;
        ctrDrop: number;
        clickDrop: number;
    };
}
export declare function checkAlerts(days?: number, positionDropThreshold?: number, ctrDropThreshold?: number, clickDropThreshold?: number): Promise<AlertResult>;
export {};
