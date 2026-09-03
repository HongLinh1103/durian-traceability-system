export interface PreviewTraceData {
    shipmentCode: string;
    shipmentType: "EXPORT" | "DOMESTIC";
    productName: string;
    lotCode?: string;
    weight: number;
    boxCount?: number;
    destinationCountry?: string;
    portOfDestination?: string;
    portOfLoading?: string;
    containerNumber?: string;
    sealNumber?: string;
    truckPlate?: string;
    carrierName?: string;
    customerName?: string;
    customerPhone?: string;
    deliveryAddress?: string;
    transportMethod?: string;
    driverName?: string;
    farmName?: string;
    regionCode?: string;
    rawLotCode?: string;
    variety?: string;
    facilityName?: string;
    updatedAt: number;
}

const globalPreview = globalThis as unknown as {
    __tracePreviewMap?: Map<string, PreviewTraceData>;
};

if (!globalPreview.__tracePreviewMap) {
    globalPreview.__tracePreviewMap = new Map();
}

export function savePreviewTrace(data: PreviewTraceData) {
    if (!data.shipmentCode) return;
    const map = globalPreview.__tracePreviewMap!;
    map.set(data.shipmentCode.toUpperCase(), data);
    map.set(data.shipmentCode.trim(), data);
}

export function getPreviewTrace(codeOrToken: string): PreviewTraceData | undefined {
    if (!codeOrToken) return undefined;
    const map = globalPreview.__tracePreviewMap;
    if (!map) return undefined;
    return map.get(codeOrToken.toUpperCase()) || map.get(codeOrToken.trim());
}
