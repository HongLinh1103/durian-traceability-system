export type WeatherPoint = {
    time: string;
    temperature: number;
    apparentTemperature: number;
    humidity: number;
    precipitationProbability: number;
    precipitation: number;
    windSpeed: number;
    uvIndex: number;
    weatherCode: number;
    description: string;
};

export type HourlyForecast = {
    time: string;
    isDay: boolean;
    temperature: number;
    precipitationProbability: number;
    precipitation: number;
    windSpeed: number;
    weatherCode: number;
};

export type DailyForecast = {
    date: string;
    weatherCode: number;
    description: string;
    temperatureMax: number;
    temperatureMin: number;
    precipitationProbability: number;
    precipitation: number;
    windSpeed: number;
    uvIndex: number;
};

export type WeatherData = {
    latitude: number;
    longitude: number;
    timezone: string;
    current: WeatherPoint;
    hourly: HourlyForecast[];
    daily: DailyForecast[];
    alerts: string[];
    fetchedAt: string;
};

type CacheEntry<T> = { expiresAt: number; value: T };
type OpenMeteoResponse = {
    timezone?: string;
    current?: Record<string, number | string>;
    hourly?: Record<string, Array<number | string>>;
    daily?: Record<string, Array<number | string>>;
};
const weatherCache = new Map<string, CacheEntry<WeatherData>>();
const WEATHER_TTL_MS = 10 * 60_000;

function numberAt(value: unknown, fallback = 0) {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function weatherDescription(code: number) {
    if (code === 0) return "Trời quang";
    if ([1, 2, 3].includes(code)) return "Có mây";
    if ([45, 48].includes(code)) return "Sương mù";
    if ([51, 53, 55, 56, 57].includes(code)) return "Mưa phùn";
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Có mưa";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "Có tuyết";
    if ([95, 96, 99].includes(code)) return "Dông";
    return "Thời tiết biến đổi";
}

export function weatherStatus(data: WeatherData) {
    const rain = Math.max(data.current.precipitationProbability, ...data.hourly.slice(0, 12).map((item) => item.precipitationProbability));
    const wind = Math.max(data.current.windSpeed, ...data.hourly.slice(0, 12).map((item) => item.windSpeed));
    const heat = Math.max(data.current.temperature, ...data.hourly.slice(0, 12).map((item) => item.temperature));
    if (data.alerts.length) return "ALERT" as const;
    if (wind >= 35) return "STRONG_WIND" as const;
    if (heat >= 35) return "HOT" as const;
    if (rain >= 70) return "HIGH_RAIN" as const;
    return "NORMAL" as const;
}

export async function getWeather(latitude: number, longitude: number): Promise<WeatherData> {
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        throw new Error("Tọa độ không hợp lệ.");
    }
    const key = `${latitude.toFixed(3)}:${longitude.toFixed(3)}`;
    const cached = weatherCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(latitude));
    url.searchParams.set("longitude", String(longitude));
    url.searchParams.set("timezone", "auto");
    // Request one extra calendar day so the rolling hourly window still covers
    // every displayed day when the user opens the page late in the day.
    url.searchParams.set("forecast_days", "11");
    url.searchParams.set("current", "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m,uv_index");
    url.searchParams.set("hourly", "temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,is_day");
    url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,uv_index_max");

    const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(12_000) });
    if (!response.ok) throw new Error("Dịch vụ thời tiết hiện không phản hồi.");
    const raw = await response.json() as OpenMeteoResponse;
    const current = raw.current ?? {};
    const hourlyRaw = raw.hourly ?? {};
    const dailyRaw = raw.daily ?? {};
    const currentHourIndex = Array.isArray(hourlyRaw.time)
        ? Math.max(0, hourlyRaw.time.findIndex((time) => String(time) >= String(current.time)))
        : 0;
    const probability = numberAt(hourlyRaw.precipitation_probability?.[currentHourIndex]);
    const point: WeatherPoint = {
        time: String(current.time ?? new Date().toISOString()),
        temperature: numberAt(current.temperature_2m),
        apparentTemperature: numberAt(current.apparent_temperature),
        humidity: numberAt(current.relative_humidity_2m),
        precipitationProbability: probability,
        precipitation: numberAt(current.precipitation ?? current.rain),
        windSpeed: numberAt(current.wind_speed_10m),
        uvIndex: numberAt(current.uv_index),
        weatherCode: numberAt(current.weather_code),
        description: weatherDescription(numberAt(current.weather_code)),
    };
    const hourly: HourlyForecast[] = (hourlyRaw.time ?? []).slice(currentHourIndex, currentHourIndex + 168).map((time, offset: number) => {
        const index = currentHourIndex + offset;
        return {
            time: String(time),
            isDay: numberAt(hourlyRaw.is_day?.[index], 1) === 1,
            temperature: numberAt(hourlyRaw.temperature_2m?.[index]),
            precipitationProbability: numberAt(hourlyRaw.precipitation_probability?.[index]),
            precipitation: numberAt(hourlyRaw.precipitation?.[index]),
            windSpeed: numberAt(hourlyRaw.wind_speed_10m?.[index]),
            weatherCode: numberAt(hourlyRaw.weather_code?.[index]),
        };
    });
    const daily: DailyForecast[] = (dailyRaw.time ?? []).slice(0, 10).map((date, index: number) => ({
        date: String(date),
        weatherCode: numberAt(dailyRaw.weather_code?.[index]),
        description: weatherDescription(numberAt(dailyRaw.weather_code?.[index])),
        temperatureMax: numberAt(dailyRaw.temperature_2m_max?.[index]),
        temperatureMin: numberAt(dailyRaw.temperature_2m_min?.[index]),
        precipitationProbability: numberAt(dailyRaw.precipitation_probability_max?.[index]),
        precipitation: numberAt(dailyRaw.precipitation_sum?.[index]),
        windSpeed: numberAt(dailyRaw.wind_speed_10m_max?.[index]),
        uvIndex: numberAt(dailyRaw.uv_index_max?.[index]),
    }));
    const alerts: string[] = [];
    if (Math.max(...hourly.slice(0, 24).map((item) => item.precipitationProbability), 0) >= 85) alerts.push("Khả năng mưa rất cao trong 24 giờ tới.");
    if (Math.max(...hourly.slice(0, 24).map((item) => item.windSpeed), 0) >= 45) alerts.push("Dự báo có gió mạnh trong 24 giờ tới.");
    if (Math.max(...hourly.slice(0, 24).map((item) => item.temperature), 0) >= 37) alerts.push("Nhiệt độ cao có thể gây stress nhiệt cho cây.");
    if (daily.some((item) => item.uvIndex >= 8)) alerts.push("Chỉ số UV ở mức cao hoặc rất cao.");

    const value = { latitude, longitude, timezone: String(raw.timezone ?? "auto"), current: point, hourly, daily, alerts, fetchedAt: new Date().toISOString() };
    weatherCache.set(key, { expiresAt: Date.now() + WEATHER_TTL_MS, value });
    return value;
}
