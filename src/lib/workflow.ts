import { prohibitedChemicals } from "@/lib/constants";

type DateLike = string | Date;

function toDate(value: DateLike) {
    return value instanceof Date ? value : new Date(value);
}

function normalizeText(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isProhibitedChemical(chemicalName: string) {
    const normalizedName = normalizeText(chemicalName);
    return prohibitedChemicals.some((chemical) => normalizeText(chemical) === normalizedName);
}

export function evaluatePhiSafety(input: { sprayDate: DateLike; harvestDate: DateLike; phiDays: number }) {
    const sprayDate = toDate(input.sprayDate);
    const harvestDate = toDate(input.harvestDate);

    if (Number.isNaN(sprayDate.getTime()) || Number.isNaN(harvestDate.getTime())) {
        return {
            isSafe: false,
            remainingDays: null as number | null,
            safeHarvestDate: null as Date | null,
        };
    }

    const safeHarvestDate = new Date(sprayDate);
    safeHarvestDate.setDate(safeHarvestDate.getDate() + input.phiDays);

    const remainingDays = Math.ceil((safeHarvestDate.getTime() - harvestDate.getTime()) / (24 * 60 * 60 * 1000));

    return {
        isSafe: remainingDays <= 0,
        remainingDays,
        safeHarvestDate,
    };
}
