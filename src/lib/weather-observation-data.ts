import { prisma } from "@/lib/prisma";

const conditions = ["SUNNY", "PARTLY_CLOUDY", "CLOUDY", "LIGHT_RAIN", "RAIN", "THUNDERSTORM", "FOG"];
const rainConditions = ["LIGHT_RAIN", "RAIN", "THUNDERSTORM"];

function num(value: FormDataEntryValue | null) {
    if (value == null || String(value).trim() === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : NaN;
}

function vietnamTime(date: Date) {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(date);
    const rawHour = parts.find(part => part.type === "hour")?.value ?? "00";
    const minute = parts.find(part => part.type === "minute")?.value ?? "00";
    return `${rawHour === "24" ? "00" : rawHour}:${minute}`;
}

export async function observationData(request: Request, farmerId: string, existingObservedAt?: Date) {
    const form = await request.formData();
    const farmId = String(form.get("farmId") || "");
    const date = String(form.get("date") || "");
    const selectedConditions = form.getAll("condition").map(String).filter(value => conditions.includes(value));
    const condition = [...new Set(selectedConditions)].join(",");
    const windLevel = "NONE";
    const farm = await prisma.farm.findFirst({ where: { id: farmId, farmerId, isActive: true }, select: { id: true } });
    if (!farm) throw new Error("Vườn không tồn tại hoặc không thuộc tài khoản này.");
    if (!date || !selectedConditions.length) throw new Error("Vui lòng nhập đầy đủ ngày và chọn ít nhất một tình trạng trời.");
    const observedAt = new Date(`${date}T${vietnamTime(existingObservedAt ?? new Date())}:00+07:00`);
    if (Number.isNaN(observedAt.getTime())) throw new Error("Ngày ghi nhận không hợp lệ.");
    const temperatureMax = num(form.get("temperatureMax"));
    const temperatureMin = num(form.get("temperatureMin"));
    const humidity = num(form.get("humidity"));
    const soilHumidity = num(form.get("soilHumidity"));
    const rainfallMm = num(form.get("rainfallMm"));
    const windSpeed = num(form.get("windSpeed"));
    if ([temperatureMax, temperatureMin, humidity, soilHumidity, rainfallMm, windSpeed].some(Number.isNaN)) throw new Error("Các chỉ số đo phải là số hợp lệ.");
    if (temperatureMax != null && temperatureMin != null && temperatureMin > temperatureMax) throw new Error("Nhiệt độ thấp nhất không được lớn hơn nhiệt độ cao nhất.");
    if ((humidity != null && (humidity < 0 || humidity > 100)) || (soilHumidity != null && (soilHumidity < 0 || soilHumidity > 100))) throw new Error("Độ ẩm phải nằm trong khoảng 0–100%.");
    const files = form.getAll("images").filter((item): item is File => item instanceof File && item.size > 0);
    if (files.some(file => !file.type.startsWith("image/") || file.size > 5 * 1024 * 1024)) throw new Error("Mỗi ảnh phải đúng định dạng và không vượt quá 5 MB.");
    const added = await Promise.all(files.map(async file => `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`));
    return {
        farmId, farmerId, observedAt, condition,
        temperature: temperatureMax,
        temperatureMax,
        temperatureMin,
        humidity,
        soilHumidity,
        rainLevel: null,
        rainStartedAt: null,
        rainfallMm: selectedConditions.some(value => rainConditions.includes(value)) ? rainfallMm : null,
        windLevel,
        windDirection: String(form.get("windDirection") || "") || null,
        windSpeed,
        phenomena: form.getAll("phenomena").map(String),
        note: String(form.get("note") || "").trim() || null,
        images: [...form.getAll("existingImages").map(String).filter(Boolean), ...added],
    };
}
