type DateLike = string | Date;

function toDate(value: DateLike) {
    return value instanceof Date ? value : new Date(value);
}

export function normalizeChemicalName(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "d")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");
}

export type ProhibitedChemicalEntry = {
    pesticideName?: string | null;
    tradeName: string;
    activeIngredient: string;
};

export type ChemicalMatch = {
    status: "exact" | "suspected" | "none";
    matchedValue?: string;
};

function levenshteinDistance(left: string, right: string) {
    const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
    for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
        let diagonal = previous[0];
        previous[0] = leftIndex;
        for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
            const above = previous[rightIndex];
            previous[rightIndex] = Math.min(
                previous[rightIndex] + 1,
                previous[rightIndex - 1] + 1,
                diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
            );
            diagonal = above;
        }
    }
    return previous[right.length];
}

export function matchProhibitedChemical(input: string, entries: ProhibitedChemicalEntry[]): ChemicalMatch {
    const normalizedInput = normalizeChemicalName(input);
    if (!normalizedInput) return { status: "none" };

    const candidates = entries
        .flatMap((entry) => [entry.pesticideName ?? "", entry.tradeName, entry.activeIngredient])
        .filter(Boolean);

    for (const candidate of candidates) {
        const normalizedCandidate = normalizeChemicalName(candidate);
        if (!normalizedCandidate) continue;
        const shorterLength = Math.min(normalizedInput.length, normalizedCandidate.length);
        if (
            normalizedInput === normalizedCandidate ||
            (shorterLength >= 4 && (
                normalizedInput.includes(normalizedCandidate) ||
                normalizedCandidate.includes(normalizedInput)
            ))
        ) {
            return { status: "exact", matchedValue: candidate };
        }
    }

    for (const candidate of candidates) {
        const normalizedCandidate = normalizeChemicalName(candidate);
        const longestLength = Math.max(normalizedInput.length, normalizedCandidate.length);
        if (Math.min(normalizedInput.length, normalizedCandidate.length) < 5) continue;
        const similarity = 1 - levenshteinDistance(normalizedInput, normalizedCandidate) / longestLength;
        if (similarity >= 0.8) return { status: "suspected", matchedValue: candidate };
    }

    return { status: "none" };
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
