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
    // Domestic fields (3-level channel)
    distributionChannel?: string;
    partnerSystem?: string;
    partnerBranch?: string;
    customerName?: string;
    contactPerson?: string;
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

export function encodePreviewPayload(data: Partial<PreviewTraceData>): string {
    try {
        const json = JSON.stringify(data);
        if (typeof Buffer !== "undefined") {
            return Buffer.from(json, "utf-8").toString("base64url");
        }
        return btoa(unescape(encodeURIComponent(json)))
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");
    } catch {
        return "";
    }
}

export function decodePreviewPayload(encoded: string): PreviewTraceData | undefined {
    if (!encoded) return undefined;
    try {
        let json = "";
        if (typeof Buffer !== "undefined") {
            json = Buffer.from(encoded, "base64url").toString("utf-8");
        } else {
            let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
            while (base64.length % 4) {
                base64 += "=";
            }
            json = decodeURIComponent(escape(atob(base64)));
        }
        const parsed = JSON.parse(json);
        if (parsed && (parsed.shipmentCode || parsed.productName || parsed.weight)) {
            return parsed as PreviewTraceData;
        }
        return undefined;
    } catch {
        return undefined;
    }
}

export function savePreviewTrace(data: PreviewTraceData) {
    if (!data.shipmentCode) return;
    const map = globalPreview.__tracePreviewMap!;
    map.set(data.shipmentCode.toUpperCase(), data);
    map.set(data.shipmentCode.trim(), data);
}

export function getPreviewTrace(codeOrToken: string, encodedPayload?: string): PreviewTraceData | undefined {
    if (encodedPayload) {
        const decoded = decodePreviewPayload(encodedPayload);
        if (decoded) {
            savePreviewTrace(decoded);
            return decoded;
        }
    }

    if (!codeOrToken) return undefined;
    const map = globalPreview.__tracePreviewMap;
    if (!map) return undefined;
    return map.get(codeOrToken.toUpperCase()) || map.get(codeOrToken.trim());
}
