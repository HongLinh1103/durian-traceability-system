import type { WeatherData } from "@/lib/weather";

export type WeatherAdvice = {
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    summary: string;
    recommendations: string[];
    warnings: string[];
    monitor: string[];
    contextUsed: string[];
    draftNotification?: string;
};

type FarmAdviceContext = {
    farmName: string;
    durianVariety: string;
    areaSize?: number;
    latestStage?: string | null;
    recentLogs?: Array<{ stage: string; activityType: string; actionDate: Date; notes: string | null }>;
};

type CacheEntry = { expiresAt: number; value: WeatherAdvice };
const aiCache = new Map<string, CacheEntry>();
const AI_TTL_MS = 20 * 60_000;

const stageLabels: Record<string, string> = { MAKING_SPROUT: "làm đọt", FLOWERING: "ra hoa", FRUIT_SETTING: "đậu trái", FRUIT_GROWING: "nuôi trái", HARVEST: "thu hoạch" };
const activityLabels: Record<string, string> = { SPRAY_PESTICIDE: "phun thuốc BVTV", FERTILIZE: "bón phân", IRRIGATE: "tưới nước", PRUNE: "cắt tỉa", WEEDING: "làm cỏ" };

function humanizeInternalCodes(text: string) {
    const labels = { ...stageLabels, ...activityLabels };
    return Object.entries(labels).reduce((value, [code, label]) => value
        .replace(new RegExp(`\\s*\\(${code}\\)`, "gu"), "")
        .replace(new RegExp(`\\b${code}\\b`, "gu"), label), text);
}

function humanizeAdvice(advice: WeatherAdvice): WeatherAdvice {
    return {
        ...advice,
        summary: humanizeInternalCodes(advice.summary),
        recommendations: advice.recommendations.map(humanizeInternalCodes),
        warnings: advice.warnings.map(humanizeInternalCodes),
        monitor: advice.monitor.map(humanizeInternalCodes),
        contextUsed: advice.contextUsed.map(humanizeInternalCodes),
        ...(advice.draftNotification ? { draftNotification: humanizeInternalCodes(advice.draftNotification) } : {}),
    };
}

function fallbackAdvice(weather: WeatherData, regional: boolean, farm?: FarmAdviceContext): WeatherAdvice {
    const highRain = weather.hourly.slice(0, 72).some((item) => item.precipitationProbability >= 70);
    const strongWind = weather.hourly.slice(0, 72).some((item) => item.windSpeed >= 35);
    const hot = weather.hourly.slice(0, 72).some((item) => item.temperature >= 35);
    const peakRain = Math.max(...weather.hourly.slice(0, 72).map((item) => item.precipitationProbability), 0);
    const peakWind = Math.max(...weather.hourly.slice(0, 72).map((item) => item.windSpeed), 0);
    const peakTemperature = Math.max(...weather.hourly.slice(0, 72).map((item) => item.temperature), weather.current.temperature);
    const risks = [highRain, strongWind, hot, weather.alerts.length > 0].filter(Boolean).length;
    const stage = farm?.latestStage ? (stageLabels[farm.latestStage] ?? farm.latestStage) : null;
    const latestLog = farm?.recentLogs?.[0];
    const latestActivity = latestLog ? (activityLabels[latestLog.activityType] ?? latestLog.activityType) : null;
    const latestDate = latestLog ? latestLog.actionDate.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : null;
    const recommendations: string[] = [];
    const monitor = ["Ghi nhận lượng mưa thực tế tại vườn và so sánh với dự báo", "Kiểm tra độ ẩm đất ở vùng rễ trước khi quyết định tưới", "Quan sát tán, cành và trái sầu riêng sau mỗi đợt mưa hoặc gió"];

    if (!regional) {
        if (highRain) {
            recommendations.push("Trong 72 giờ có khả năng mưa cao: kiểm tra rãnh thoát nước và các điểm đọng nước trong vườn sầu riêng trước đợt mưa; chỉ quyết định công việc tiếp theo sau khi kiểm tra độ ẩm đất thực tế.");
        } else {
            recommendations.push("Dự báo 72 giờ chưa có mưa cao kéo dài: vẫn kiểm tra độ ẩm vùng rễ tại vườn trước khi quyết định tưới, không chỉ dựa vào dự báo.");
        }
        if (latestLog?.activityType === "IRRIGATE" && highRain) recommendations.push(`Nhật ký ngày ${latestDate} ghi nhận tưới nước: theo dõi độ ẩm và tạm hoãn lần tưới kế tiếp nếu đất còn ẩm hoặc mưa đã xảy ra.`);
        if (latestLog?.activityType === "FERTILIZE" && highRain) recommendations.push(`Nhật ký ngày ${latestDate} ghi nhận bón phân: sau mưa, kiểm tra dấu hiệu rửa trôi hoặc đọng nước; không tự bón bù khi chưa đánh giá tại vườn.`);
        if (latestLog?.activityType === "SPRAY_PESTICIDE" && highRain) recommendations.push(`Nhật ký ngày ${latestDate} ghi nhận phun thuốc BVTV: ghi lại thời điểm mưa so với lần phun và kiểm tra nhãn/hướng dẫn chuyên môn trước mọi quyết định xử lý lại; không tự động phun bù.`);
        if (stage === "ra hoa" && highRain) recommendations.push("Vườn đang ở giai đoạn ra hoa: sau mưa cần quan sát độ khô của chùm hoa, tình trạng rụng hoa và độ thông thoáng tán; đây là theo dõi hiện tượng, không phải chẩn đoán bệnh.");
        if (["đậu trái", "nuôi trái"].includes(stage ?? "") && strongWind) recommendations.push(`Vườn đang ở giai đoạn ${stage}: kiểm tra cành mang trái, dây neo/điểm chống đỡ và trái bị va chạm sau thời điểm gió mạnh.`);
        if (stage === "thu hoạch" && highRain) recommendations.push("Vườn đang ở giai đoạn thu hoạch: ưu tiên kiểm tra mặt vườn, đường vận chuyển và tình trạng trái sau mưa; lựa chọn thời điểm làm việc khi điều kiện thực địa an toàn.");
        if (hot) recommendations.push(`Có thời điểm nhiệt độ dự báo từ 35°C: quan sát dấu hiệu mất nước trên lá và trái vào đầu giờ chiều, đồng thời kiểm tra ẩm đất trước khi điều chỉnh lịch tưới.`);
    }
    return {
        riskLevel: risks >= 2 ? "HIGH" : risks === 1 ? "MEDIUM" : "LOW",
        summary: regional
            ? "Tổng hợp tham khảo từ dữ liệu dự báo; ưu tiên kiểm tra các vườn có mưa, gió hoặc nhiệt độ cao."
            : `Vườn ${farm?.farmName ?? "đã chọn"}${farm?.durianVariety ? ` trồng sầu riêng giống ${farm.durianVariety}` : " trồng sầu riêng"}${stage ? `, đang ở giai đoạn ${stage}` : ""}. ${latestActivity ? `Nhật ký gần nhất ngày ${latestDate}: ${latestActivity}.` : "Chưa có nhật ký gần đây để đối chiếu."}`,
        recommendations: regional
            ? ["Rà soát các vườn có trạng thái cần chú ý.", "Chuẩn bị nội dung cảnh báo phù hợp cho từng nhóm vườn bị ảnh hưởng."]
            : recommendations,
        warnings: [highRain ? `Xác suất mưa cao nhất trong 72 giờ tới khoảng ${peakRain}%.` : `Xác suất mưa cao nhất trong 72 giờ tới khoảng ${peakRain}%, chưa đạt ngưỡng mưa cao 70%.`, strongWind ? `Gió mạnh nhất dự báo khoảng ${peakWind} km/h, cần kiểm tra cành và trái sau thời điểm gió tăng.` : `Gió mạnh nhất dự báo khoảng ${peakWind} km/h, chưa đạt ngưỡng cảnh báo 35 km/h.`, hot ? `Nhiệt độ cao nhất dự báo khoảng ${peakTemperature}°C.` : `Nhiệt độ cao nhất dự báo khoảng ${peakTemperature}°C.`],
        monitor: regional ? ["Lượng mưa thực tế theo từng vườn", "Vườn có gió mạnh", "Vườn thiếu tọa độ hoặc dữ liệu"] : monitor,
        contextUsed: regional
            ? ["Thời tiết hiện tại", "Dự báo 72 giờ", "Trạng thái thời tiết từng vườn"]
            : [
                `Vườn: ${farm?.farmName ?? "không xác định"}`,
                `Giống sầu riêng: ${farm?.durianVariety ?? "chưa cập nhật"}`,
                `Giai đoạn: ${stage ?? "chưa có nhật ký xác định giai đoạn"}`,
                ...(farm?.recentLogs?.length
                    ? farm.recentLogs.slice(0, 3).map((log) => `Nhật ký ${log.actionDate.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}: ${activityLabels[log.activityType] ?? log.activityType} · ${stageLabels[log.stage] ?? log.stage}`)
                    : ["Nhật ký gần nhất: chưa có"]),
                "Thời tiết hiện tại và dự báo 72 giờ",
            ],
        ...(regional ? { draftNotification: "Dự báo thời tiết có thể biến đổi trong thời gian tới. Đề nghị bà con theo dõi thông báo, kiểm tra vườn và chủ động bảo đảm an toàn." } : {}),
    };
}

function isAdvice(value: unknown): value is WeatherAdvice {
    if (!value || typeof value !== "object") return false;
    const item = value as Record<string, unknown>;
    return ["LOW", "MEDIUM", "HIGH"].includes(String(item.riskLevel))
        && typeof item.summary === "string"
        && Array.isArray(item.recommendations)
        && Array.isArray(item.warnings)
        && Array.isArray(item.monitor)
        && Array.isArray(item.contextUsed);
}

export async function generateWeatherAdvice(input: {
    cacheKey: string;
    regional: boolean;
    weather: WeatherData;
    farm?: FarmAdviceContext;
    regionalSummary?: Array<{ farmName: string; status: string; temperature: number; rainProbability: number; windSpeed: number }>;
}) {
    const cached = aiCache.get(input.cacheKey);
    if (cached && cached.expiresAt > Date.now()) return { advice: humanizeAdvice(cached.value), source: "cache" as const };
    const fallback = fallbackAdvice(input.weather, input.regional, input.farm);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        aiCache.set(input.cacheKey, { expiresAt: Date.now() + AI_TTL_MS, value: fallback });
        return { advice: fallback, source: "weather-rules" as const };
    }

    const safePayload = {
        role: input.regional ? "regional_manager" : "farmer",
        currentWeather: input.weather.current,
        forecast72Hours: input.weather.hourly.slice(0, 72),
        dailyForecast: input.weather.daily,
        alerts: input.weather.alerts,
        farm: input.farm,
        regionalSummary: input.regionalSummary,
    };
    const instruction = input.regional
        ? "Chỉ tổng hợp thời tiết, nêu vườn/khu vực cần ưu tiên theo dõi và soạn một draftNotification ngắn. Không hướng dẫn bón/phun trực tiếp cho toàn vùng. Không tự gửi thông báo."
        : "Đưa gợi ý canh tác tham khảo cụ thể cho sầu riêng. Mỗi khuyến nghị phải nêu căn cứ từ giống, giai đoạn, một nhật ký gần nhất hoặc một chỉ số dự báo; không viết lời khuyên chung chung. Chỉ dùng tên tiếng Việt cho giai đoạn và hoạt động; tuyệt đối không xuất mã enum nội bộ như FRUIT_GROWING, FLOWERING, FERTILIZE hoặc mã viết hoa có dấu gạch dưới. Trả contextUsed liệt kê chính xác dữ liệu đã dùng. Không chẩn đoán chắc chắn bệnh, không kê thuốc, không chỉ định liều lượng, không khuyến nghị thuốc cấm. Nếu nhật ký có phun/bón trước mưa, chỉ yêu cầu đối chiếu nhãn và đánh giá thực địa, không yêu cầu phun/bón bù.";
    const prompt = `Bạn là trợ lý thời tiết nông nghiệp an toàn. ${instruction}\nDữ liệu đã loại bỏ thông tin cá nhân:\n${JSON.stringify(safePayload)}`;
    const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json", responseSchema: {
                type: "OBJECT",
                required: ["riskLevel", "summary", "recommendations", "warnings", "monitor", "contextUsed"],
                properties: {
                    riskLevel: { type: "STRING", enum: ["LOW", "MEDIUM", "HIGH"] },
                    summary: { type: "STRING" },
                    recommendations: { type: "ARRAY", items: { type: "STRING" } },
                    warnings: { type: "ARRAY", items: { type: "STRING" } },
                    monitor: { type: "ARRAY", items: { type: "STRING" } },
                    contextUsed: { type: "ARRAY", items: { type: "STRING" } },
                    draftNotification: { type: "STRING" },
                },
            } },
        }),
        signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
        const failure = await response.json().catch(() => null) as { error?: { message?: string; status?: string } } | null;
        const detail = failure?.error?.message;
        if (response.status === 401 || response.status === 403) throw new Error("Khóa Gemini không hợp lệ, bị chặn hoặc chưa được cấp quyền sử dụng API.");
        if (response.status === 404) throw new Error(`Model Gemini '${model}' không khả dụng cho khóa hiện tại.`);
        if (response.status === 429) throw new Error("Gemini đã vượt giới hạn yêu cầu hoặc hạn mức. Vui lòng thử lại sau.");
        throw new Error(detail ? `Gemini lỗi: ${detail}` : "Dịch vụ Gemini hiện không phản hồi.");
    }
    const result = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("AI không trả về nội dung hợp lệ.");
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { parsed = null; }
    const advice = humanizeAdvice(isAdvice(parsed) ? parsed : fallback);
    aiCache.set(input.cacheKey, { expiresAt: Date.now() + AI_TTL_MS, value: advice });
    return { advice, source: "gemini" as const };
}
