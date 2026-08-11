import { openDB, type DBSchema } from "idb";
import type { FarmingLogInput } from "@/lib/validation";
import { toIsoDate, toIsoDateTime } from "@/lib/date-format";

export type FarmingLogImage = File;

export type OfflineFarmingLogPayload = FarmingLogInput & {
    isGACCCompliant: boolean;
    images: FarmingLogImage[];
};

export type OfflineFarmingLogRecord = {
    id: string;
    payload: OfflineFarmingLogPayload;
    createdAt: string;
};

interface OfflineFarmingLogDB extends DBSchema {
    farmingLogs: {
        key: string;
        value: OfflineFarmingLogRecord;
    };
}

const dbPromise = openDB<OfflineFarmingLogDB>("triviet-farming-logs", 1, {
    upgrade(database) {
        if (!database.objectStoreNames.contains("farmingLogs")) {
            database.createObjectStore("farmingLogs", { keyPath: "id" });
        }
    },
});

function createId() {
    return globalThis.crypto?.randomUUID?.() ?? `offline-log-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function queueOfflineFarmingLog(payload: OfflineFarmingLogPayload) {
    const record: OfflineFarmingLogRecord = {
        id: createId(),
        payload,
        createdAt: new Date().toISOString(),
    };

    const db = await dbPromise;
    await db.put("farmingLogs", record);

    return record;
}

export async function listQueuedFarmingLogs() {
    const db = await dbPromise;
    return db.getAll("farmingLogs");
}

export async function removeQueuedFarmingLog(id: string) {
    const db = await dbPromise;
    await db.delete("farmingLogs", id);
}

async function submitQueuedLog(record: OfflineFarmingLogRecord) {
    const formData = new FormData();

    formData.append("farmId", record.payload.farmId);
    formData.append("stage", record.payload.stage);
    formData.append("actionDate", toIsoDateTime(record.payload.actionDate, record.payload.actionTime));
    formData.append("activityType", record.payload.activityType);
    formData.append("otherActivity", record.payload.otherActivity ?? "");
    formData.append("chemicalName", record.payload.chemicalName ?? "");
    formData.append("dosage", record.payload.dosage ?? "");
    formData.append("phiDays", String(record.payload.phiDays));
    formData.append("plannedHarvestDate", record.payload.plannedHarvestDate ? toIsoDate(record.payload.plannedHarvestDate) : "");
    formData.append("notes", record.payload.notes ?? "");
    formData.append("isGACCCompliant", String(record.payload.isGACCCompliant));

    for (const image of record.payload.images) {
        formData.append("images", image, image.name);
    }

    const response = await fetch("/api/farming-logs", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Không thể đồng bộ nhật ký ngoại tuyến");
    }
}

export async function syncQueuedFarmingLogs() {
    if (!navigator.onLine) {
        return { synced: 0, remaining: await listQueuedFarmingLogs() };
    }

    const queued = await listQueuedFarmingLogs();
    let synced = 0;

    for (const record of queued) {
        try {
            await submitQueuedLog(record);
            await removeQueuedFarmingLog(record.id);
            synced += 1;
        } catch {
            // Leave the record queued for the next online retry.
        }
    }

    return { synced, remaining: await listQueuedFarmingLogs() };
}
