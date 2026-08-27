/**
 * Tiện ích tính toán hình học không gian (Geodesic Geometry) cho ranh giới vườn sầu riêng
 * Sử dụng công thức Spherical Polygon Area (tương đương Google Geometry Library computeArea)
 */

const EARTH_RADIUS = 6378137; // Bán kính Trái Đất (WGS-84) theo mét

export interface LatLngPoint {
    lat: number;
    lng: number;
}

/**
 * Chuyển đổi độ sang radian
 */
function toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
}

/**
 * Tính diện tích của một đa giác khép kín (Polygon) trên bề mặt Trái Đất theo mét vuông (m²)
 * @param points Danh sách các điểm [lat, lng]
 * @returns Diện tích theo m²
 */
export function computePolygonArea(points: LatLngPoint[]): number {
    if (!points || points.length < 3) {
        return 0;
    }

    let total = 0;
    const n = points.length;

    for (let i = 0; i < n; i++) {
        const prev = points[(i - 1 + n) % n];
        const next = points[(i + 1) % n];
        const current = points[i];

        const prevLngRad = toRadians(prev.lng);
        const nextLngRad = toRadians(next.lng);
        const currentLatRad = toRadians(current.lat);

        total += (nextLngRad - prevLngRad) * Math.sin(currentLatRad);
    }

    const areaM2 = Math.abs((total * EARTH_RADIUS * EARTH_RADIUS) / 2);
    return Math.round(areaM2 * 100) / 100; // Làm tròn 2 chữ số thập phân
}

/**
 * Tính tọa độ trọng tâm (Centroid) của đa giác
 */
export function computePolygonCentroid(points: LatLngPoint[]): LatLngPoint | null {
    if (!points || points.length === 0) return null;

    let sumLat = 0;
    let sumLng = 0;
    for (const p of points) {
        sumLat += p.lat;
        sumLng += p.lng;
    }

    return {
        lat: Number((sumLat / points.length).toFixed(7)),
        lng: Number((sumLng / points.length).toFixed(7)),
    };
}

export interface AreaComparisonResult {
    declaredAreaHa: number;
    declaredAreaM2: number;
    mappedAreaM2: number;
    mappedAreaHa: number;
    diffHa: number;
    diffPercent: number;
    status: "NOT_MAPPED" | "EXACT" | "ACCEPTABLE" | "WARNING";
    message: string;
}

/**
 * So sánh diện tích khai báo trong hồ sơ và diện tích đo đạc thực tế từ bản đồ
 */
export function compareFarmAreas(
    declaredArea: number,
    declaredUnit: "HECTARE" | "SQUARE_METER",
    mappedAreaM2: number
): AreaComparisonResult {
    const declaredAreaM2 = declaredUnit === "HECTARE" ? declaredArea * 10_000 : declaredArea;
    const declaredAreaHa = declaredUnit === "HECTARE" ? declaredArea : declaredArea / 10_000;

    if (!mappedAreaM2 || mappedAreaM2 <= 0) {
        return {
            declaredAreaHa,
            declaredAreaM2,
            mappedAreaM2: 0,
            mappedAreaHa: 0,
            diffHa: 0,
            diffPercent: 0,
            status: "NOT_MAPPED",
            message: "Chưa vẽ ranh giới trên bản đồ.",
        };
    }

    const mappedAreaHa = mappedAreaM2 / 10_000;
    const diffHa = Math.abs(declaredAreaHa - mappedAreaHa);
    const diffPercent = declaredAreaHa > 0 ? (diffHa / declaredAreaHa) * 100 : 0;

    if (diffPercent < 0.05) {
        return {
            declaredAreaHa,
            declaredAreaM2,
            mappedAreaM2,
            mappedAreaHa,
            diffHa,
            diffPercent,
            status: "EXACT",
            message: "Diện tích bản đồ khớp hoàn toàn với diện tích khai báo.",
        };
    }

    if (diffPercent <= 15) {
        return {
            declaredAreaHa,
            declaredAreaM2,
            mappedAreaM2,
            mappedAreaHa,
            diffHa,
            diffPercent,
            status: "ACCEPTABLE",
            message: "Chênh lệch trong phạm vi cho phép (dưới 15%).",
        };
    }

    return {
        declaredAreaHa,
        declaredAreaM2,
        mappedAreaM2,
        mappedAreaHa,
        diffHa,
        diffPercent,
        status: "WARNING",
        message: "Diện tích ranh giới vẽ trên bản đồ chênh lệch đáng kể so với diện tích khai báo. Vui lòng kiểm tra lại.",
    };
}
