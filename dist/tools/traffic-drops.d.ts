interface TrafficDrop {
    page: string;
    currentClicks: number;
    priorClicks: number;
    clickChange: number;
    currentPosition: number;
    priorPosition: number;
    positionChange: number;
    diagnosis: string;
}
export declare function trafficDrops(days?: number): Promise<TrafficDrop[]>;
export {};
