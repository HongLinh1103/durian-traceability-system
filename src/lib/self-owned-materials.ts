// Stable catalog IDs are resolved on the server, never accepted as warehouse IDs.
export const SELF_OWNED_MATERIALS = [
    { id: "self-owned:composted-manure", name: "Phân chuồng ủ hoai mục", unit: "kg", quantity: 0, type: "FERTILIZER" as const, source: "SELF_OWNED" as const },
];

export function selfOwnedMaterial(id: string) {
    return SELF_OWNED_MATERIALS.find(material => material.id === id);
}

export function allowsSelfOwnedMaterials(activity: string) {
    return ["FERTILIZE", "BASE_FERTILIZING", "FOLIAR_FERTILIZING"].includes(activity);
}
