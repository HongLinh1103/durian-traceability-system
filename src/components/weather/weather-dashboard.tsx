"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bot, Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSun, Droplets, History, Loader2, LocateFixed, MapPin, Moon, RefreshCw, Send, Sun, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { WeatherScene } from "@/components/weather/weather-scene";

type Farm = { id: string; farmCode: string; farmName: string; latitude: number | null; longitude: number | null; address: string; durianVariety: string };
type Region = { id: string; code: string; name: string; farms: Farm[] };
type Weather = {
    current: { temperature: number; apparentTemperature: number; humidity: number; precipitationProbability: number; precipitation: number; windSpeed: number; uvIndex: number; weatherCode: number; description: string };
    hourly: Array<{ time: string; isDay: boolean; temperature: number; precipitationProbability: number; precipitation: number; windSpeed: number; weatherCode: number }>;
    daily: Array<{ date: string; weatherCode: number; description: string; temperatureMax: number; temperatureMin: number; precipitationProbability: number; precipitation: number; windSpeed: number; uvIndex: number }>;
    alerts: string[];
    fetchedAt: string;
};
type Advice = { riskLevel: "LOW" | "MEDIUM" | "HIGH"; summary: string; recommendations: string[]; warnings: string[]; monitor: string[]; contextUsed: string[]; draftNotification?: string };
type RegionalFarm = Farm & { status: Status; weather: Weather; currentStage: string | null; stageUpdatedAt: string | null };
type Status = "NORMAL" | "HIGH_RAIN" | "STRONG_WIND" | "HOT" | "ALERT";

const statusLabels: Record<Status, string> = { NORMAL: "Bình thường", HIGH_RAIN: "Mưa cao", STRONG_WIND: "Gió mạnh", HOT: "Nắng nóng", ALERT: "Có cảnh báo" };
const stageLabels: Record<string, string> = { MAKING_SPROUT: "Làm đọt", FLOWERING: "Ra hoa", FRUIT_SETTING: "Đậu trái", FRUIT_GROWING: "Nuôi trái", HARVEST: "Thu hoạch" };

async function readJson(response: Response) {
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || "Yêu cầu không thành công.");
    return payload;
}

export function WeatherDashboard({ role }: { role: "FARMER" | "AREA_MANAGER" }) {
    const { toast } = useToast();
    const [loadingContext, setLoadingContext] = useState(true);
    const [contextError, setContextError] = useState("");
    const [farms, setFarms] = useState<Farm[]>([]);
    const [regions, setRegions] = useState<Region[]>([]);
    const [selectedFarmId, setSelectedFarmId] = useState("");
    const [selectedRegionId, setSelectedRegionId] = useState("");
    const [weather, setWeather] = useState<Weather | null>(null);
    const [regionalFarms, setRegionalFarms] = useState<RegionalFarm[]>([]);
    const [totalFarms, setTotalFarms] = useState(0);
    const [missingCoordinates, setMissingCoordinates] = useState(0);
    const [weatherLoading, setWeatherLoading] = useState(false);
    const [weatherError, setWeatherError] = useState("");
    const [gpsError, setGpsError] = useState("");
    const [gpsNotice, setGpsNotice] = useState("");
    const [advice, setAdvice] = useState<Advice | null>(null);
    const [adviceSource, setAdviceSource] = useState<"gemini" | "weather-rules" | "cache" | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState("");
    const [selectedAffected, setSelectedAffected] = useState<string[]>([]);
    const [notificationText, setNotificationText] = useState("");
    const [confirmSend, setConfirmSend] = useState(false);
    const [sending, setSending] = useState(false);
    const weatherRequestRef = useRef(0);
    const lastWeatherQueryRef = useRef("");
    const automaticGpsAttemptedRef = useRef(false);
    const automaticAiContextRef = useRef("");
    const [currentTime, setCurrentTime] = useState(() => new Date());

    const loadContext = useCallback(async () => {
        setLoadingContext(true); setContextError("");
        try {
            const data = await readJson(await fetch("/api/weather/context", { cache: "no-store" }));
            if (role === "FARMER") {
                setFarms(data.farms);
            } else {
                setRegions(data.regions);
                if (data.regions.length) setSelectedRegionId((current) => current || data.regions[0].id);
            }
        } catch (error) { setContextError(error instanceof Error ? error.message : "Không thể tải phạm vi vườn."); }
        finally { setLoadingContext(false); }
    }, [role]);

    useEffect(() => { void loadContext(); }, [loadContext]);
    useEffect(() => {
        const interval = window.setInterval(() => setCurrentTime(new Date()), 30_000);
        return () => window.clearInterval(interval);
    }, []);

    const loadWeather = useCallback(async (query: string) => {
        lastWeatherQueryRef.current = query;
        const requestId = ++weatherRequestRef.current;
        setWeatherLoading(true); setWeatherError(""); setAiError("");
        try {
            const data = await readJson(await fetch(`/api/weather?${query}`, { cache: "no-store" }));
            if (requestId !== weatherRequestRef.current) return;
            automaticAiContextRef.current = "";
            setAdvice(null);
            setAdviceSource(null);
            if (data.mode === "region") {
                setRegionalFarms(data.farms); setTotalFarms(data.totalFarms); setMissingCoordinates(data.missingCoordinates); setWeather(data.forecast);
                setSelectedAffected(data.farms.filter((farm: RegionalFarm) => farm.status !== "NORMAL").map((farm: RegionalFarm) => farm.id));
            } else { setWeather(data.weather); setRegionalFarms([]); }
        } catch (error) { if (requestId === weatherRequestRef.current) { setWeatherError(error instanceof Error ? error.message : "Không thể tải thời tiết."); setWeather(null); } }
        finally { if (requestId === weatherRequestRef.current) setWeatherLoading(false); }
    }, []);

    useEffect(() => {
        const refresh = () => {
            if (document.visibilityState === "visible" && lastWeatherQueryRef.current) void loadWeather(lastWeatherQueryRef.current);
        };
        const interval = window.setInterval(refresh, 10 * 60_000);
        document.addEventListener("visibilitychange", refresh);
        return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", refresh); };
    }, [loadWeather]);

    useEffect(() => {
        if (role === "FARMER" && selectedFarmId) void loadWeather(`farmId=${encodeURIComponent(selectedFarmId)}`);
    }, [loadWeather, role, selectedFarmId]);
    useEffect(() => {
        if (role === "AREA_MANAGER" && selectedRegionId) void loadWeather(`regionId=${encodeURIComponent(selectedRegionId)}`);
    }, [loadWeather, role, selectedRegionId]);

    const requestCurrentLocation = useCallback((automatic = false) => {
        setGpsError("");
        setGpsNotice("");
        setSelectedFarmId("");
        setWeather(null);
        weatherRequestRef.current += 1;
        const reportGpsProblem = (message: string) => {
            if (automatic) {
                const fallbackFarm = farms[0];
                if (fallbackFarm) {
                    setSelectedFarmId(fallbackFarm.id);
                    setGpsNotice(`Không lấy được vị trí hiện tại. Đang hiển thị thời tiết tại ${fallbackFarm.farmName}.`);
                } else {
                    setGpsNotice("Không lấy được vị trí hiện tại và tài khoản chưa có vườn để hiển thị thay thế.");
                }
                return;
            }
            setGpsError(message);
        };
        if (!window.isSecureContext) {
            reportGpsProblem("Trình duyệt chỉ cho phép lấy vị trí trên HTTPS hoặc localhost. Hãy mở ứng dụng bằng HTTPS rồi thử lại.");
            return;
        }
        if (!navigator.geolocation) { reportGpsProblem("Trình duyệt không hỗ trợ GPS."); return; }
        setWeatherLoading(true);
        const onSuccess = (position: GeolocationPosition) => {
            setGpsError("");
            setGpsNotice("");
            void loadWeather(`latitude=${position.coords.latitude}&longitude=${position.coords.longitude}`);
        };
        const showFinalError = (error: GeolocationPositionError) => {
            setWeatherLoading(false);
            if (error.code === 1) {
                reportGpsProblem("Chrome vẫn trả về trạng thái từ chối quyền vị trí. Nhấn biểu tượng bên trái thanh địa chỉ → Quyền truy cập trang web → Vị trí → Cho phép, sau đó tải lại trang.");
            } else if (error.code === 2) {
                reportGpsProblem("Chrome đã có quyền nhưng Windows/thiết bị không cung cấp được tọa độ. Hãy bật Location services và mục 'Let desktop apps access your location', rồi thử lại.");
            } else if (error.code === 3) {
                reportGpsProblem("Không lấy được vị trí từ GPS lẫn mạng/Wi‑Fi trong thời gian cho phép. Hãy kiểm tra dịch vụ vị trí và kết nối mạng rồi thử lại.");
            } else {
                reportGpsProblem(`Không thể xác định vị trí hiện tại${error.message ? `: ${error.message}` : "."}`);
            }
        };
        navigator.geolocation.getCurrentPosition(
            onSuccess,
            (firstError) => {
                if (firstError.code === 1) {
                    showFinalError(firstError);
                    return;
                }
                navigator.geolocation.getCurrentPosition(
                    onSuccess,
                    showFinalError,
                    { enableHighAccuracy: false, timeout: 20_000, maximumAge: 10 * 60_000 },
                );
            },
            { enableHighAccuracy: true, timeout: 8_000, maximumAge: 300_000 },
        );
    }, [farms, loadWeather]);

    useEffect(() => {
        if (role !== "FARMER" || loadingContext || contextError || automaticGpsAttemptedRef.current) return;
        automaticGpsAttemptedRef.current = true;
        requestCurrentLocation(true);
    }, [contextError, loadingContext, requestCurrentLocation, role]);

    const loadAi = useCallback(async () => {
        setAiLoading(true); setAiError("");
        try {
            const body = role === "FARMER" ? {} : { regionId: selectedRegionId };
            const data = await readJson(await fetch("/api/weather/advice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
            setAdvice(data.advice);
            setAdviceSource(data.source);
            if (data.advice.draftNotification) setNotificationText(data.advice.draftNotification);
        } catch (error) { setAiError(error instanceof Error ? error.message : "Không thể tạo gợi ý AI."); }
        finally { setAiLoading(false); }
    }, [role, selectedRegionId]);

    useEffect(() => {
        if (!weather) return;
        const contextKey = role === "FARMER" ? "farmer-account" : selectedRegionId;
        if (!contextKey || automaticAiContextRef.current === contextKey) return;
        automaticAiContextRef.current = contextKey;
        void loadAi();
    }, [loadAi, role, selectedRegionId, weather]);

    async function sendNotification() {
        setSending(true);
        try {
            const data = await readJson(await fetch("/api/weather/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ regionId: selectedRegionId, farmIds: selectedAffected, message: notificationText, confirmed: confirmSend }) }));
            toast({ title: "Đã gửi thông báo", description: `Đã gửi đến ${data.recipients} nông dân.`, variant: "success" });
            setConfirmSend(false);
        } catch (error) { toast({ title: "Không thể gửi thông báo", description: error instanceof Error ? error.message : "Vui lòng thử lại.", variant: "destructive" }); }
        finally { setSending(false); }
    }

    function toggleAffectedFarm(farmId: string) {
        setSelectedAffected((items) => items.includes(farmId) ? items.filter((id) => id !== farmId) : [...items, farmId]);
        setConfirmSend(false);
    }

    function updateNotificationText(value: string) {
        setNotificationText(value);
        setConfirmSend(false);
    }

    if (loadingContext) return <StateBox icon={<Loader2 className="h-8 w-8 animate-spin" />} title="Đang tải dữ liệu vườn..." />;
    if (contextError) return <StateBox icon={<AlertTriangle className="h-8 w-8" />} title={contextError} action={<Button onClick={() => void loadContext()}><RefreshCw className="mr-2 h-4 w-4" />Thử lại</Button>} />;

    return (
        <main className="min-h-screen bg-[#f3f5f7] pb-12">
            <header className="border-b border-white/10 bg-gradient-to-br from-[#082c50] via-[#0b4775] to-[#177aa5] text-white shadow-lg">
                <div className="mx-auto max-w-7xl px-4 pb-6 pt-7 sm:px-6 lg:px-8">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-200">TriViet Weather</p>
                            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Dự báo thời tiết</h1>
                            <time className="mt-2 block text-sm text-sky-100" dateTime={currentTime.toISOString()}>Cập nhật lúc {currentTime.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</time>
                        </div>
                        <div className="rounded-full bg-white/10 px-4 py-2 text-xs text-sky-50 backdrop-blur">Tự động cập nhật mỗi 10 phút</div>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">

                {role === "FARMER" ? (
                    <section className="flex flex-col gap-3 rounded-3xl border bg-white p-4 sm:flex-row">
                        <select value={selectedFarmId} onChange={(event) => { setGpsError(""); setGpsNotice(""); setSelectedFarmId(event.target.value); }} className="h-12 flex-1 rounded-2xl border border-slate-200 px-4">
                            <option value="">Chọn vườn để xem dự báo</option>
                            {farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.farmName}{farm.address ? ` — ${farm.address}` : ` — ${farm.farmCode}`}</option>)}
                        </select>
                        <Button variant="outline" onClick={() => requestCurrentLocation(false)}><LocateFixed className="mr-2 h-4 w-4" />Dùng vị trí hiện tại</Button>
                    </section>
                ) : (
                    <section className="rounded-3xl border bg-white p-4">
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Vùng được phân công</label>
                        <select value={selectedRegionId} onChange={(event) => setSelectedRegionId(event.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 px-4 sm:max-w-md">
                            {regions.map((region) => <option key={region.id} value={region.id}>{region.name} · {region.code}</option>)}
                        </select>
                    </section>
                )}

                {gpsError && <ErrorBanner message={gpsError} />}
                {gpsNotice && <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">{gpsNotice}</div>}
                {weatherLoading ? <StateBox icon={<Loader2 className="h-8 w-8 animate-spin" />} title="Đang cập nhật thời tiết..." /> : weatherError ? <StateBox icon={<CloudRain className="h-8 w-8" />} title={weatherError} action={<Button onClick={() => selectedFarmId ? void loadWeather(`farmId=${selectedFarmId}`) : selectedRegionId ? void loadWeather(`regionId=${selectedRegionId}`) : requestCurrentLocation()}><RefreshCw className="mr-2 h-4 w-4" />Thử lại</Button>} /> : weather ? (
                    <>
                        {role === "AREA_MANAGER" && <RegionalOverview total={totalFarms} farms={regionalFarms} missing={missingCoordinates} />}
                        <CurrentWeather weather={weather} />
                        {role === "AREA_MANAGER" && (
                            <section className="space-y-4">
                                <div className="flex flex-col gap-3 rounded-2xl border border-sky-100 bg-sky-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h2 className="font-bold text-slate-900">Vườn trong vùng và thông báo</h2>
                                        <p className="mt-1 text-sm text-slate-600">Chọn các vườn cần liên hệ, sau đó soạn thông báo ngay bên dưới danh sách.</p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-sky-800">Đã chọn {selectedAffected.length}/{regionalFarms.length} vườn</span>
                                        <Button type="button" size="sm" variant="outline" onClick={() => { setSelectedAffected(regionalFarms.filter((farm) => farm.status !== "NORMAL").map((farm) => farm.id)); setConfirmSend(false); }}>Chọn vườn cảnh báo</Button>
                                        {selectedAffected.length > 0 && <Button type="button" size="sm" variant="ghost" onClick={() => { setSelectedAffected([]); setConfirmSend(false); }}>Bỏ chọn</Button>}
                                    </div>
                                </div>
                                <div className="overflow-hidden rounded-3xl border bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-4">Chọn</th><th className="p-4">Vườn</th><th className="p-4">Giai đoạn canh tác</th><th className="p-4">Nhiệt độ</th><th className="p-4">Khả năng mưa</th><th className="p-4">Gió</th><th className="p-4">Trạng thái</th><th className="p-4">Nhật ký</th></tr></thead><tbody>{regionalFarms.map((farm) => <tr key={farm.id} className="border-t"><td className="p-4"><input type="checkbox" checked={selectedAffected.includes(farm.id)} onChange={() => toggleAffectedFarm(farm.id)} aria-label={`Chọn ${farm.farmName}`} /></td><td className="p-4"><b>{farm.farmName}</b><div className="text-xs text-slate-500">{farm.farmCode}</div></td><td className="p-4"><span className="font-semibold text-emerald-700">{farm.currentStage ? stageLabels[farm.currentStage] ?? farm.currentStage : "Chưa cập nhật"}</span>{farm.stageUpdatedAt && <div className="mt-1 text-xs text-slate-500">Nhật ký {new Date(farm.stageUpdatedAt).toLocaleDateString("vi-VN")}</div>}</td><td className="p-4">{farm.weather.current.temperature}°C</td><td className="p-4">{farm.weather.current.precipitationProbability}%</td><td className="p-4">{farm.weather.current.windSpeed} km/h</td><td className="p-4"><StatusBadge status={farm.status} /></td><td className="p-4"><Button asChild size="sm" variant="outline"><Link href={`/region-manager/gardens/${farm.id}/logs`}><History className="mr-1.5 h-4 w-4" />Xem nhật ký</Link></Button></td></tr>)}</tbody></table></div></div>
                                <NotificationComposer selectedCount={selectedAffected.length} text={notificationText} confirmed={confirmSend} sending={sending} onText={updateNotificationText} onConfirm={setConfirmSend} onSend={() => void sendNotification()} />
                            </section>
                        )}
                    <AiSection role={role} advice={advice} source={adviceSource} loading={aiLoading} error={aiError} onRetry={() => void loadAi()} />
                    </>
                ) : <StateBox icon={<MapPin className="h-8 w-8" />} title={role === "FARMER" && !farms.length ? "Bạn chưa có vườn. Có thể dùng vị trí hiện tại để xem thời tiết." : "Chưa có vườn hoặc tọa độ phù hợp."} />}
            </div>
        </main>
    );
}

function CurrentWeather({ weather }: { weather: Weather }) {
    const [metric, setMetric] = useState<"temperature" | "rain" | "wind">("temperature");
    const [selectedDate, setSelectedDate] = useState(weather.daily[0]?.date ?? "");
    useEffect(() => { setSelectedDate(weather.daily[0]?.date ?? ""); }, [weather]);
    const selectedDay = weather.daily.find((day) => day.date === selectedDate) ?? weather.daily[0];
    const selectedHours = weather.hourly.filter((hour) => hour.time.slice(0, 10) === selectedDate);
    const chartHours = (selectedHours.length ? selectedHours : weather.hourly.slice(0, 24)).filter((_, index) => index % 3 === 0);
    const values = chartHours.map((hour) => metric === "temperature" ? hour.temperature : metric === "rain" ? hour.precipitation : hour.windSpeed);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = Math.max(max - min, 1);
    const points = values.map((value, index) => `${(index / Math.max(values.length - 1, 1)) * 100},${88 - ((value - min) / range) * 65}`).join(" ");
    const unit = metric === "temperature" ? "°" : metric === "rain" ? " mm" : " km/h";
    const tabs = [{ value: "temperature", label: "Nhiệt độ" }, { value: "rain", label: "Lượng mưa" }, { value: "wind", label: "Gió" }] as const;
    const currentHour = weather.hourly[0];
    const currentPresentation = getWeatherPresentation(weather.current.weatherCode, currentHour?.isDay ?? true);
    const WeatherIcon = currentPresentation.icon;
    return (
        <section className="space-y-4">
            <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
                <CardContent className="p-0">
                    <div className="relative isolate min-h-[230px] overflow-hidden p-5 sm:p-8">
                    <WeatherScene weatherCode={weather.current.weatherCode} isDay={currentHour?.isDay ?? true} />
                    <div className="relative z-10 flex flex-wrap items-center gap-5">
                            <div className="rounded-full bg-white/70 p-5 text-[#1677a7] shadow-sm"><WeatherIcon className="h-14 w-14" /></div>
                            <div>
                                <div className="flex items-start"><span className="text-7xl font-light leading-none text-slate-900">{Math.round(weather.current.temperature)}</span><span className="mt-2 text-xl">°C</span></div>
                                <p className="mt-2 text-lg font-semibold text-slate-800">{currentPresentation.label}</p>
                                <p className="mt-1 text-sm text-slate-600">Cảm giác như <b>{weather.current.apparentTemperature}°C</b></p>
                            </div>
                    </div>

                    </div>

                    <div className="grid border-y border-slate-100 bg-white sm:grid-cols-2 lg:grid-cols-4">
                        <WeatherDetail icon={<Droplets />} label="Độ ẩm" value={`${weather.current.humidity}%`} />
                        <WeatherDetail icon={<Wind />} label="Gió" value={`${weather.current.windSpeed} km/h`} />
                        <WeatherDetail icon={<CloudRain />} label="Khả năng mưa" value={`${weather.current.precipitationProbability}%`} />
                        <WeatherDetail icon={<Sun />} label="Chỉ số UV" value={String(weather.current.uvIndex)} />
                    </div>

                    <div className="p-5 sm:p-8">
                    {selectedDay && (
                        <div className="mt-7 rounded-2xl bg-slate-50 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="font-bold capitalize text-slate-900">{selectedDay.date === weather.daily[0]?.date ? "Hôm nay" : new Date(`${selectedDay.date}T00:00:00`).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" })}</p>
                                    <p className="mt-1 text-sm text-slate-600">{selectedDay.description}</p>
                                </div>
                                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-700">
                                    <span><b>{Math.round(selectedDay.temperatureMax)}°</b> / {Math.round(selectedDay.temperatureMin)}°</span>
                                    <span>Mưa <b>{selectedDay.precipitationProbability}%</b> · {selectedDay.precipitation} mm</span>
                                    <span>Gió <b>{selectedDay.windSpeed} km/h</b></span>
                                    <span>UV <b>{selectedDay.uvIndex}</b></span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-5">
                        <h3 className="mb-3 text-sm font-bold text-slate-800">Dự báo theo giờ</h3>
                        <div className="flex gap-2 overflow-x-auto pb-3">
                            {(selectedHours.length ? selectedHours : weather.hourly.slice(0, 24)).map((hour) => {
                                const presentation = getWeatherPresentation(hour.weatherCode, hour.isDay);
                                const HourIcon = presentation.icon;
                                const thunderstorm = [95, 96, 99].includes(hour.weatherCode);
                                return <div key={hour.time} className="flex min-w-[88px] flex-col items-center rounded-2xl border border-slate-100 bg-white px-3 py-3 text-center shadow-sm">
                                    <time className="text-xs font-semibold text-slate-600" dateTime={hour.time}>{new Date(hour.time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</time>
                                    <HourIcon className={`my-2 h-7 w-7 ${weatherIconColor(hour.weatherCode, hour.isDay)}`} aria-hidden="true" />
                                    <span className="sr-only">{presentation.label}</span>
                                    <b className="text-base text-slate-900">{Math.round(hour.temperature)}°</b>
                                    <span className="mt-1 text-xs text-sky-700">{hour.precipitationProbability}% mưa</span>
                                    {thunderstorm && <span className="mt-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Dông</span>}
                                </div>;
                            })}
                        </div>
                    </div>

                    <div className="mt-5 flex gap-2 border-b border-slate-200">
                        {tabs.map((tab) => <button type="button" key={tab.value} onClick={() => setMetric(tab.value)} className={`border-b-2 px-3 py-3 text-sm font-semibold transition ${metric === tab.value ? "border-amber-400 text-slate-900" : "border-transparent text-slate-500"}`}>{tab.label}</button>)}
                    </div>
                    <div className="mt-5 overflow-x-auto">
                        <div className="min-w-[700px]">
                            <div className="relative h-44">
                                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-36 w-full overflow-visible">
                                    <defs><linearGradient id={`weather-chart-${metric}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={metric === "temperature" ? "#facc15" : metric === "rain" ? "#38bdf8" : "#94a3b8"} stopOpacity="0.35" /><stop offset="100%" stopColor="white" stopOpacity="0" /></linearGradient></defs>
                                    <polygon points={`0,100 ${points} 100,100`} fill={`url(#weather-chart-${metric})`} />
                                    <polyline points={points} fill="none" stroke={metric === "temperature" ? "#eab308" : metric === "rain" ? "#0284c7" : "#64748b"} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                                </svg>
                                <div className="absolute inset-x-0 top-0 flex justify-between">
                                    {chartHours.map((hour, index) => <div key={hour.time} className="flex w-16 flex-col items-center text-xs"><b className="text-slate-500">{values[index]}{unit}</b><span className="mt-28 text-slate-500">{new Date(hour.time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span></div>)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
                        {weather.daily.map((day) => {
                            const active = day.date === selectedDate;
                            const presentation = getWeatherPresentation(day.weatherCode, true);
                            const DayIcon = presentation.icon;
                            return (
                                <button type="button" key={day.date} onClick={() => setSelectedDate(day.date)} aria-pressed={active} className={`min-w-32 rounded-2xl border p-4 text-center transition ${active ? "border-sky-300 bg-slate-100 shadow-sm ring-2 ring-sky-100" : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50"}`}>
                                    <p className="font-bold capitalize">{new Date(`${day.date}T00:00:00`).toLocaleDateString("vi-VN", { weekday: "short" })}</p>
                                    <DayIcon className={`mx-auto my-3 h-9 w-9 ${weatherIconColor(day.weatherCode, true)}`} aria-hidden="true" />
                                    <span className="sr-only">{presentation.label}</span>
                                    <p className="font-semibold">{Math.round(day.temperatureMax)}° <span className="text-slate-400">{Math.round(day.temperatureMin)}°</span></p>
                                    <p className="mt-1 text-xs text-sky-700">Mưa {day.precipitationProbability}%</p>
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-xs text-slate-500"><span>Nguồn: Open-Meteo · Dữ liệu theo tọa độ, tự làm mới mỗi 10 phút</span><span>Cập nhật lúc {new Date(weather.fetchedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span></div>
                    </div>
                </CardContent>
            </Card>
            {weather.alerts.length > 0 && <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5"><h2 className="flex items-center gap-2 font-bold text-amber-900"><AlertTriangle className="h-5 w-5" />Cảnh báo thời tiết</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">{weather.alerts.map((item) => <li key={item}>{item}</li>)}</ul></div>}
        </section>
    );
}

function getWeatherPresentation(code: number, isDay: boolean) {
    if (code === 0) return { icon: isDay ? Sun : Moon, label: "Trời quang" };
    if ([1, 2].includes(code)) return { icon: isDay ? CloudSun : CloudMoon, label: "Có mây" };
    if (code === 3) return { icon: Cloud, label: "Nhiều mây" };
    if ([45, 48].includes(code)) return { icon: CloudFog, label: "Sương mù" };
    if ([51, 53, 55, 56, 57].includes(code)) return { icon: CloudDrizzle, label: "Mưa nhẹ" };
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { icon: CloudRain, label: "Có mưa" };
    if ([95, 96, 99].includes(code)) return { icon: CloudLightning, label: "Mưa dông" };
    return { icon: Cloud, label: "Thời tiết biến đổi" };
}

function weatherIconColor(code: number, isDay: boolean) {
    if ([95, 96, 99].includes(code)) return "text-amber-600";
    if ([45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "text-sky-600";
    if (isDay && [0, 1, 2].includes(code)) return "text-amber-500";
    if (!isDay) return "text-indigo-500";
    return "text-slate-500";
}

function WeatherDetail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><span className="text-[#1879a8] [&>svg]:h-5 [&>svg]:w-5">{icon}</span><div><p className="text-xs text-slate-500">{label}</p><p className="font-semibold text-slate-900">{value}</p></div></div>;
}

function AiSection({ role, advice, source, loading, error, onRetry }: { role: string; advice: Advice | null; source: "gemini" | "weather-rules" | "cache" | null; loading: boolean; error: string; onRetry: () => void }) {
    return <Card className="border-violet-200"><CardHeader><CardTitle className="flex items-center gap-2"><Bot className="h-6 w-6 text-violet-600" />{role === "FARMER" ? "AI gợi ý canh tác" : "AI hỗ trợ theo dõi vùng trồng"}</CardTitle></CardHeader><CardContent className="space-y-4">{loading && !advice && <div className="flex items-center gap-3 rounded-2xl bg-violet-50 p-4 text-sm font-semibold text-violet-800"><Loader2 className="h-5 w-5 animate-spin" />Đang tự động phân tích thời tiết, thông tin vườn và nhật ký gần nhất...</div>}{error && <><ErrorBanner message={error} /><Button variant="outline" onClick={onRetry} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Thử lại</Button></>}{advice ? <div className="space-y-4">{source === "weather-rules" && <p className="rounded-2xl bg-sky-50 p-3 text-xs text-sky-800">Gợi ý tự động đã liên kết thời tiết, thông tin vườn và nhật ký gần nhất. Khi cấu hình Gemini, hệ thống sẽ phân tích sâu hơn trên cùng dữ liệu này.</p>}<div className="flex items-center gap-3"><RiskBadge level={advice.riskLevel} /><p className="text-sm text-slate-700">{advice.summary}</p></div><AdviceList title={role === "FARMER" ? "Khuyến nghị theo vườn và nhật ký" : "Ưu tiên theo dõi"} items={advice.recommendations} /><AdviceList title="Cảnh báo" items={advice.warnings} /><AdviceList title="Chỉ số cần ghi nhận tại vườn" items={advice.monitor} /></div> : !loading && !error ? <p className="text-sm text-slate-500">Đang chờ dữ liệu thời tiết để tự động tạo gợi ý.</p> : null}<p className="rounded-2xl bg-slate-100 p-3 text-xs leading-5 text-slate-600"><b>Lưu ý:</b> Nội dung AI chỉ mang tính tham khảo, không thay thế đánh giá thực địa hoặc tư vấn chuyên môn. AI không chẩn đoán chắc chắn bệnh, kê thuốc, chỉ định liều lượng hay khuyến nghị thuốc cấm.</p></CardContent></Card>;
}

function RegionalOverview({ total, farms, missing }: { total: number; farms: RegionalFarm[]; missing: number }) {
    const normal = farms.filter((farm) => farm.status === "NORMAL").length;
    const rain = farms.filter((farm) => farm.status === "HIGH_RAIN").length;
    const attention = farms.filter((farm) => farm.status !== "NORMAL").length;
    return <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Stat label="Số vườn" value={total} /><Stat label="Bình thường" value={normal} /><Stat label="Khả năng mưa cao" value={rain} /><Stat label="Cần chú ý" value={attention} tone="warning" />{missing > 0 && <p className="sm:col-span-2 lg:col-span-4 text-xs text-amber-700">{missing} vườn chưa có tọa độ nên chưa thể tổng hợp thời tiết.</p>}</section>;
}

function NotificationComposer({ selectedCount, text, confirmed, sending, onText, onConfirm, onSend }: { selectedCount: number; text: string; confirmed: boolean; sending: boolean; onText: (value: string) => void; onConfirm: (value: boolean) => void; onSend: () => void }) {
    return <Card><CardHeader><CardTitle className="flex items-center gap-2"><Send className="h-5 w-5 text-sky-600" />Gửi thông báo cho nông dân</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-slate-600">Đã chọn {selectedCount} vườn. AI chỉ có thể soạn nháp; bạn phải xem và xác nhận trước khi gửi.</p><textarea value={text} onChange={(event) => onText(event.target.value)} maxLength={1000} rows={5} placeholder="Nhập hoặc chỉnh sửa nội dung thông báo..." className="w-full rounded-2xl border border-slate-200 p-4 text-sm" /><label className="flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" className="mt-1" checked={confirmed} onChange={(event) => onConfirm(event.target.checked)} /><span>Tôi đã xem nội dung, chọn đúng các vườn bị ảnh hưởng và xác nhận gửi.</span></label><Button onClick={onSend} disabled={sending || !confirmed || !selectedCount || text.trim().length < 10}>{sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Gửi thông báo</Button></CardContent></Card>;
}

function AdviceList({ title, items }: { title: string; items: string[] }) { return <div><h3 className="font-bold text-slate-900">{title}</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">{items.map((item) => <li key={item}>{item}</li>)}</ul></div>; }
function ErrorBanner({ message }: { message: string }) { return <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{message}</div>; }
function StateBox({ icon, title, action }: { icon: React.ReactNode; title: string; action?: React.ReactNode }) { return <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center gap-4 px-4 text-center text-slate-600">{icon}<p className="font-semibold">{title}</p>{action}</main>; }
function Stat({ label, value, tone }: { label: string; value: number; tone?: "warning" }) { return <div className={`rounded-3xl border p-5 ${tone ? "border-amber-200 bg-amber-50" : "bg-white"}`}><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-3xl font-black text-slate-900">{value}</p></div>; }
function StatusBadge({ status }: { status: Status }) { return <span className={`rounded-full px-3 py-1 text-xs font-bold ${status === "NORMAL" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>{statusLabels[status]}</span>; }
function RiskBadge({ level }: { level: Advice["riskLevel"] }) { return <span className={`rounded-full px-3 py-1 text-xs font-black ${level === "LOW" ? "bg-emerald-100 text-emerald-700" : level === "MEDIUM" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-700"}`}>{level}</span>; }
