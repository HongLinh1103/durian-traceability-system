// Stable catalog IDs are resolved on the server, never accepted as warehouse IDs.
export const SELF_OWNED_MATERIALS = [
    { id: "self-owned:composted-manure", name: "Phân chuồng ủ hoai mục", unit: "kg", quantity: 0, type: "FERTILIZER" as const, source: "SELF_OWNED" as const },
];

export function selfOwnedMaterial(id: string, unit = "kg") {
    if (!id || typeof id !== "string") return undefined;
    if (id.startsWith("self-owned:")) {
        const raw = id.slice("self-owned:".length);
        let name = raw;
        try {
            name = decodeURIComponent(raw);
        } catch {
            name = raw;
        }
        if (raw === "composted-manure") {
            name = "Phân chuồng ủ hoai mục";
        }
        return {
            id,
            name: name.trim(),
            unit: unit || "kg",
            quantity: 0,
            type: "FERTILIZER" as const,
            source: "SELF_OWNED" as const,
        };
    }
    return SELF_OWNED_MATERIALS.find(material => material.id === id);
}

export function allowsSelfOwnedMaterials(activity: string) {
    return ["FERTILIZE", "BASE_FERTILIZING", "FOLIAR_FERTILIZING"].includes(activity);
}
