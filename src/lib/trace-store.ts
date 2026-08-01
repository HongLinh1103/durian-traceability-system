import { buildGoogleMapsEmbed } from "@/lib/workflow";
import { traceHistory, traceSummary } from "@/lib/mock-data";

export type TraceRecord = {
    qrCodeString: string;
    scanCount: number;
    farmName: string;
    farmCode: string;
    latitude: number;
    longitude: number;
    packhouseName: string;
    packhouseCode: string;
    variety: string;
    gaccReady: boolean;
    traceHistory: typeof traceHistory;
    mapsEmbedUrl: string;
    lastUpdatedAt: string;
};

const traceRecords = new Map<string, TraceRecord>();

function createDefaultRecord(qrCodeString: string): TraceRecord {
    const latitude = traceSummary.latitude ?? 11.181;
    const longitude = traceSummary.longitude ?? 107.121;

    return {
        qrCodeString,
        scanCount: traceSummary.scanCount,
        farmName: traceSummary.farmName,
        farmCode: traceSummary.farmCode,
        latitude,
        longitude,
        packhouseName: traceSummary.packhouseName,
        packhouseCode: traceSummary.packhouseCode,
        variety: traceSummary.variety,
        gaccReady: traceSummary.gaccReady,
        traceHistory,
        mapsEmbedUrl: buildGoogleMapsEmbed(latitude, longitude),
        lastUpdatedAt: new Date().toISOString(),
    };
}

export function registerTraceRecord(input: {
    qrCodeString: string;
    farmName: string;
    farmCode: string;
    latitude: number;
    longitude: number;
    packhouseName: string;
    packhouseCode: string;
    variety: string;
    gaccReady: boolean;
    scanCount?: number;
}) {
    const record: TraceRecord = {
        ...createDefaultRecord(input.qrCodeString),
        ...input,
        scanCount: input.scanCount ?? 0,
        mapsEmbedUrl: buildGoogleMapsEmbed(input.latitude, input.longitude),
        lastUpdatedAt: new Date().toISOString(),
    };

    traceRecords.set(input.qrCodeString, record);
    return record;
}

export function getTraceRecord(qrCodeString: string) {
    return traceRecords.get(qrCodeString) ?? createDefaultRecord(qrCodeString);
}

export function incrementTraceScan(qrCodeString: string) {
    const current = getTraceRecord(qrCodeString);
    const next: TraceRecord = {
        ...current,
        scanCount: current.scanCount + 1,
        lastUpdatedAt: new Date().toISOString(),
    };

    traceRecords.set(qrCodeString, next);
    return next;
}
