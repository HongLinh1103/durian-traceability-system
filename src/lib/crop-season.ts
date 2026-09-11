type Season = {
    name: string;
    year: number;
    startedAt?: Date | string | null;
    expectedEndAt?: Date | string | null;
    closedAt?: Date | string | null;
};

export function seasonYears(season: Season) {
    const match = season.name.match(/(\d{4})\s*[-–]\s*(\d{4})/);
    return match ? [Number(match[1]), Number(match[2])] : [season.year - 1, season.year];
}

export function formatSeasonName(season: Season) {
    const [start, end] = seasonYears(season);
    const round = season.name.match(/·\s*Đợt\s+\d+/)?.[0];
    return `${start}-${end}${round ? ` ${round}` : ""}`;
}

export function seasonDateBounds(season: Season) {
    const [start, end] = seasonYears(season);
    const day = (value: Date | string) => new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date(value));
    const min = [ `${start}-01-01`, ...(season.startedAt ? [day(season.startedAt)] : []) ].sort().pop()!;
    const max = [ `${end}-12-31`, ...(season.expectedEndAt ? [day(season.expectedEndAt)] : []), ...(season.closedAt ? [day(season.closedAt)] : []) ].sort()[0];
    return { min, max };
}
