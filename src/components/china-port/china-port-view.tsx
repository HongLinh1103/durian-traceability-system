"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
    Search,
    RotateCcw,
    Columns,
    Eye,
    Globe,
    Building2,
    CheckCircle2,
    AlertCircle,
    X,
    FileSpreadsheet,
    ShieldCheck,
    ChevronLeft,
    ChevronRight,
    Check,
    Settings,
    Bell,
    Mail,
    MessageSquare,
    Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { formatVietnameseDate } from "@/lib/date-format";

// Types
export type ChinaPortCountry = {
    countryIso?: string | null;
    countryCode?: string | null;
    countryNameEn?: string | null;
    countryNameCn?: string | null;
};

export type ChinaPortCorpType = {
    corpTypeCode: string;
    corpTypeNameEn: string;
    corpTypeNameCn: string;
    corpDescriptionEn?: string;
    corpDescriptionCn?: string;
};

export type ChinaPortRow = {
    countryCode?: string;
    countryIso?: string;
    countryNameEn?: string;
    countryNameCn?: string;
    provinceCode?: string;
    provinceNameEn?: string;
    provinceNameCn?: string;
    prodTypeCode?: string;
    prodTypeNameEn?: string;
    prodTypeNameCn?: string;
    prodCategoryCode?: string;
    prodCategoryNameEn?: string;
    prodCategoryNameCn?: string;
    corpTypeCode?: string;
    corpTypeNameCn?: string;
    corpTypeNameEn?: string;
    prodNameEn?: string;
    prodNameCn?: string;
    prodNameLa?: string;
    chinaRegNo?: string;
    overseasOfficialRegNo?: string;
    corpNameEn?: string;
    corpNameMo?: string;
    corpAddrNameEn?: string;
    corpAddrNameMo?: string;
    validFrom?: string;
    validTo?: string;
    regState?: string;
    [key: string]: any;
};

// Chuẩn hóa tên các cột dạng viết hoa rút gọn theo yêu cầu
const DEFAULT_COLUMNS = [
    { key: "country", label: "QUỐC GIA", visible: true },
    { key: "product", label: "SẢN PHẨM", visible: true },
    { key: "overseasOfficialRegNo", label: "MÃ NƯỚC NGOÀI", visible: true },
    { key: "chinaRegNo", label: "MÃ TRUNG QUỐC", visible: true },
    { key: "corpNameEn", label: "DOANH NGHIỆP", visible: true },
    { key: "corpNameMo", label: "TÊN ĐỊA PHƯƠNG", visible: false },
    { key: "corpType", label: "LOẠI DN", visible: true },
    { key: "validFrom", label: "HIỆU LỰC TỪ", visible: true },
    { key: "validTo", label: "HIỆU LỰC ĐẾN", visible: true },
    { key: "status", label: "TRẠNG THÁI", visible: true },
    { key: "view", label: "CHI TIẾT", visible: true },
];

const clean = (value: any) => String(value ?? "").replace(/\n+$/g, "").trim();
const searchable = (value: unknown) => clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
const countryLabel = (country: ChinaPortCountry) => {
    const iso = clean(country.countryIso) || "---";
    const names = [clean(country.countryNameEn), clean(country.countryNameCn)].filter(Boolean).join(" · ");
    return `[${iso}] ${names || "Chưa có tên"}`;
};
const fmtDate = (value: any) => {
    const s = clean(value).slice(0, 10);
    if (!s) return "—";
    const d = new Date(s);
    return !Number.isNaN(d.getTime()) ? formatVietnameseDate(d) : s;
};
const statusLabel = (value: any) => (value === "1" ? "Còn hiệu lực" : value === "2" ? "Tạm dừng" : clean(value) || "—");

type NotificationEvent = "NEW_RECORD" | "STATUS_CHANGED" | "DATA_CHANGED";
type NotificationSettings = {
    countryCode: string;
    events: NotificationEvent[];
    emailEnabled: boolean;
    smsEnabled: boolean;
    emails: string[];
    phones: string[];
};

export function ChinaPortView({ canConfigureNotifications = false, adminEmail = "", adminPhone = "" }: { canConfigureNotifications?: boolean; adminEmail?: string; adminPhone?: string }) {
    const { toast } = useToast();
    // Search Form States
    const [countryCode, setCountryCode] = useState<string>("704"); // Default Vietnam
    const [countryToggleLabel, setCountryToggleLabel] = useState<string>("[VNM] Viet Nam · 越南");
    const [countrySearchFilter, setCountrySearchFilter] = useState<string>("");
    const [countryPanelOpen, setCountryPanelOpen] = useState<boolean>(false);

    const [overseasOfficialRegNo, setOverseasOfficialRegNo] = useState<string>("");
    const [chinaRegNo, setChinaRegNo] = useState<string>("");
    const [corpNameEn, setCorpNameEn] = useState<string>("");
    const [prodName, setProdName] = useState<string>("榴莲"); // Default Durian in Chinese
    const [regState, setRegState] = useState<string>("");
    const [selectedCorpTypes, setSelectedCorpTypes] = useState<string[]>(["02"]); // Packaging & Processing
    const [corpTypePanelOpen, setCorpTypePanelOpen] = useState<boolean>(false);
    const [pageSize, setPageSize] = useState<number>(15);

    // Filter, Data, & Table States
    const [countries, setCountries] = useState<ChinaPortCountry[]>([]);
    const [corpTypes, setCorpTypes] = useState<ChinaPortCorpType[]>([]);
    const [rows, setRows] = useState<ChinaPortRow[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [loading, setLoading] = useState<boolean>(false);
    const [statusMessage, setStatusMessage] = useState<string>("Sẵn sàng");
    const [liveFilter, setLiveFilter] = useState<string>("");
    const [statusChipFilter, setStatusChipFilter] = useState<string>("");

    const [columns, setColumns] = useState(DEFAULT_COLUMNS);
    const [columnsPanelOpen, setColumnsPanelOpen] = useState<boolean>(false);

    // Detail Modal State
    const [selectedDetailRow, setSelectedDetailRow] = useState<ChinaPortRow | null>(null);
    const [exportingExcel, setExportingExcel] = useState<boolean>(false);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [notificationConfigured, setNotificationConfigured] = useState(false);
    const [notificationError, setNotificationError] = useState("");
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [savingSettings, setSavingSettings] = useState(false);
    const [emailServiceReady, setEmailServiceReady] = useState<boolean | null>(null);
    const [testEvent, setTestEvent] = useState<NotificationEvent>("NEW_RECORD");
    const [emailPreview, setEmailPreview] = useState<{ subject: string; recipients: string[]; html: string } | null>(null);
    const [sendingTestEmail, setSendingTestEmail] = useState(false);
    const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);
    const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
        countryCode: "704",
        events: ["NEW_RECORD", "STATUS_CHANGED", "DATA_CHANGED"],
        emailEnabled: true,
        smsEnabled: false,
        emails: [adminEmail].filter(Boolean),
        phones: [adminPhone].filter(Boolean),
    });

    useEffect(() => {
        if (!canConfigureNotifications) return;
        let active = true;
        fetch("/api/china-port/notification-settings").then(async response => {
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            if (!active) return;
            setEmailServiceReady(result.emailService.configured);
            if (result.data) {
                setNotificationSettings(result.data);
                setNotificationConfigured(result.data.emailEnabled);
            } else {
                const saved = window.localStorage.getItem("china-port-admin-notifications");
                if (saved) {
                    try { setNotificationSettings({ ...JSON.parse(saved), countryCode: "704", smsEnabled: false }); } catch {}
                }
            }
        }).catch(error => { if (active) setNotificationError(error.message || "Không thể tải cấu hình."); })
          .finally(() => { if (active) setLoadingSettings(false); });
        return () => { active = false; };
    }, [canConfigureNotifications]);

    // Lock body scroll and handle Escape key when modals are open
    useEffect(() => {
        const isModalOpen = Boolean(notificationOpen || emailPreview || selectedDetailRow);
        if (!isModalOpen || typeof document === "undefined") return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (emailPreview) {
                    setEmailPreview(null);
                } else if (notificationOpen) {
                    setNotificationOpen(false);
                } else if (selectedDetailRow) {
                    setSelectedDetailRow(null);
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [notificationOpen, emailPreview, selectedDetailRow]);

    function openNotificationSettings() {
        setTestEmailResult(null);
        setNotificationOpen(true);
    }

    async function sendTestEmail(preview = false) {
        if (sendingTestEmail) return;
        const emails = [...new Set(notificationSettings.emails.map((value) => value.trim()).filter(Boolean))];
        if (!emails.length || emails.length > 10 || emails.some((value) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) {
            setTestEmailResult({ success: false, message: "Nhập từ 1 đến 10 email hợp lệ ở mục Email trước khi gửi thử." });
            return;
        }
        setSendingTestEmail(true);
        setTestEmailResult(null);
        try {
            const response = await fetch("/api/china-port/test-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ emails, event: testEvent, preview }),
            });
            const result = await response.json();
            if (preview && response.ok && result.success) {
                setEmailPreview(result);
                return;
            }
            setTestEmailResult({ success: response.ok && result.success === true, message: result.message || "Không thể gửi email thử." });
        } catch {
            setTestEmailResult({ success: false, message: "Không thể kết nối để gửi email thử. Kiểm tra kết nối và thử lại." });
        } finally {
            setSendingTestEmail(false);
        }
    }

    async function saveNotificationSettings() {
        if (savingSettings || loadingSettings) return;
        setNotificationError("");
        if (!notificationSettings.events.length) return setNotificationError("Chọn ít nhất một loại thông báo.");
        const emails = notificationSettings.emails.map((value) => value.trim()).filter(Boolean);
        const phones = notificationSettings.phones.map((value) => value.trim()).filter(Boolean);
        if (notificationSettings.emailEnabled && (!emails.length || emails.some((value) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)))) return setNotificationError("Email không đúng định dạng.");
        if (notificationSettings.smsEnabled && (!phones.length || phones.some((value) => !/^\+?[0-9\s.-]{8,20}$/.test(value)))) return setNotificationError("Số điện thoại không đúng định dạng.");
        const saved = { ...notificationSettings, emails, phones };
        setSavingSettings(true);
        try {
            const response = await fetch("/api/china-port/notification-settings", {
                method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(saved),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            setNotificationSettings(result.data);
            setNotificationConfigured(result.data.emailEnabled);
            setEmailServiceReady(result.emailService.configured);
            window.localStorage.removeItem("china-port-admin-notifications");
            toast({ title: "Đã lưu cấu hình vào hệ thống", description: result.data.emailEnabled ? "Email nhận đã được lưu. Thông báo được gửi khi đồng bộ phát hiện thay đổi phù hợp và dịch vụ gửi email đã sẵn sàng." : "Đã tắt nhận thông báo email.", variant: "success" });
        } catch (error) {
            setNotificationError(error instanceof Error ? error.message : "Không thể lưu cấu hình.");
        } finally { setSavingSettings(false); }
    }

    // Load initial reference data
    useEffect(() => {
        let isMounted = true;
        const loadInitialData = async () => {
            try {
                // Fetch Countries
                const countryRes = await fetch("/api/china-port/countries");
                const countryJson = await countryRes.json();
                if (isMounted && countryJson.data) {
                    setCountries(countryJson.data);
                    const vnm = countryJson.data.find(
                        (c: ChinaPortCountry) => clean(c.countryIso).toUpperCase() === "VNM" || clean(c.countryCode) === "704"
                    );
                    if (vnm) {
                        setCountryCode(clean(vnm.countryCode));
                        setCountryToggleLabel(countryLabel(vnm));
                    }
                }

                // Fetch Corp Types
                const corpRes = await fetch("/api/china-port/params?level=corp");
                const corpJson = await corpRes.json();
                if (isMounted && corpJson.data) {
                    setCorpTypes(corpJson.data);
                }
            } catch (err) {
                console.error("Error loading initial China Port data:", err);
            }
        };

        void loadInitialData();
        return () => {
            isMounted = false;
        };
    }, []);

    // Perform Search
    const executeSearch = useCallback(
        async (page = 1) => {
            setLoading(true);
            setCurrentPage(page);
            setStatusMessage("Đang tải dữ liệu từ China Port (GACC)...");

            const payload: Record<string, any> = {
                pageNum: page,
                pageSize,
                prodName: prodName.trim() || undefined,
            };

            if (countryCode) payload.countryCode = countryCode;
            if (overseasOfficialRegNo.trim()) payload.overseasOfficialRegNo = overseasOfficialRegNo.trim();
            if (chinaRegNo.trim()) payload.chinaRegNo = chinaRegNo.trim();
            if (corpNameEn.trim()) payload.corpNameEn = corpNameEn.trim();
            if (regState) payload.regState = regState;
            if (selectedCorpTypes.length > 0) payload.corpTypeCode = selectedCorpTypes.join("|");

            try {
                const res = await fetch("/api/china-port/search", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                const json = await res.json();
                if (json.code === 200 && json.data) {
                    setRows(json.data.rows || []);
                    setTotal(Number(json.data.total || 0));
                    setStatusMessage("Đã đồng bộ dữ liệu chính thức");
                } else {
                    setRows([]);
                    setTotal(0);
                    setStatusMessage(json.message || "Không tìm thấy dữ liệu phù hợp");
                }
            } catch (err: any) {
                console.error("China Port search error:", err);
                setRows([]);
                setTotal(0);
                setStatusMessage("Lỗi kết nối hệ thống");
            } finally {
                setLoading(false);
            }
        },
        [countryCode, overseasOfficialRegNo, chinaRegNo, corpNameEn, prodName, regState, selectedCorpTypes, pageSize]
    );

    // Initial search once countries/types are loaded
    useEffect(() => {
        void executeSearch(1);
    }, [executeSearch]);

    // Live filtering helper
    const filteredRows = useMemo(() => {
        let result = rows;
        if (statusChipFilter) {
            result = result.filter((r) => clean(r.regState) === statusChipFilter);
        }
        if (!liveFilter.trim()) return result;

        const q = liveFilter.trim().toLowerCase();
        return result.filter((row) => {
            const overseas = clean(row.overseasOfficialRegNo).toLowerCase();
            const corpEn = clean(row.corpNameEn).toLowerCase();
            const corpMo = clean(row.corpNameMo).toLowerCase();
            const chinaCode = clean(row.chinaRegNo).toLowerCase();
            const prod = clean(row.prodNameEn || row.prodNameCn).toLowerCase();
            const addr = clean(row.corpAddrNameEn || row.corpAddrNameMo).toLowerCase();
            const province = clean(row.provinceNameEn || row.provinceNameCn).toLowerCase();

            return (
                overseas.includes(q) ||
                corpEn.includes(q) ||
                corpMo.includes(q) ||
                chinaCode.includes(q) ||
                prod.includes(q) ||
                addr.includes(q) ||
                province.includes(q)
            );
        });
    }, [rows, liveFilter, statusChipFilter]);

    // Filtered countries for country selection panel
    const filteredCountries = useMemo(() => {
        if (!countrySearchFilter.trim()) return countries;
        const q = searchable(countrySearchFilter);
        return countries.filter(
            (c) =>
                searchable(c.countryIso).includes(q) ||
                searchable(c.countryNameEn).includes(q) ||
                searchable(c.countryNameCn).includes(q) ||
                searchable(c.countryCode).includes(q)
        );
    }, [countries, countrySearchFilter]);

    function handleReset() {
        setCountryCode("704");
        setCountryToggleLabel("[VNM] Viet Nam · 越南");
        setOverseasOfficialRegNo("");
        setChinaRegNo("");
        setCorpNameEn("");
        setProdName("榴莲");
        setRegState("");
        setSelectedCorpTypes(["02"]);
        setPageSize(15);
        setLiveFilter("");
        setStatusChipFilter("");
        setTimeout(() => executeSearch(1), 50);
    }

    function getCellContent(row: ChinaPortRow, key: string) {
        switch (key) {
            case "country":
                return `${clean(row.countryNameEn)}\n${clean(row.countryNameCn)}`;
            case "product":
                return `${clean(row.prodCategoryNameEn || row.prodTypeNameEn)}\n${clean(row.prodNameEn || row.prodNameCn)}`;
            case "corpType":
                return clean(row.corpTypeNameEn || row.corpTypeNameCn);
            case "validFrom":
                return fmtDate(row.validFrom);
            case "validTo":
                return fmtDate(row.validTo);
            case "status":
                return statusLabel(row.regState);
            default:
                return clean(row[key]);
        }
    }

    // Xuất Excel / CSV
    async function handleExportExcel() {
        if (!filteredRows.length) return;
        setExportingExcel(true);

        try {
            const visibleCols = columns.filter((c) => c.visible && c.key !== "view");
            const headers = visibleCols.map((c) => `"${c.label}"`).join(",");
            const csvRows = filteredRows.map((row) =>
                visibleCols
                    .map((col) => {
                        const val = getCellContent(row, col.key).replace(/\n/g, " - ").replace(/"/g, '""');
                        return `"${val}"`;
                    })
                    .join(",")
            );

            const csvContent = "\uFEFF" + [headers, ...csvRows].join("\r\n");
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `ChinaPort-GACC-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setStatusMessage(`Đã xuất ${filteredRows.length} dòng dữ liệu`);
        } catch (err) {
            console.error("Export error:", err);
            setStatusMessage("Lỗi khi xuất dữ liệu");
        } finally {
            setExportingExcel(false);
        }
    }

    return (
        <div className="space-y-6">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 p-6 sm:p-8 text-white shadow-xl">
                <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
                <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-black uppercase tracking-wider text-emerald-300 border border-emerald-400/30">
                                <Globe className="h-3.5 w-3.5" />
                                INT · DỮ LIỆU CHINA PORT (GACC)
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                            Danh Sách Doanh Nghiệp & Vùng Trồng Kiểm Dịch
                        </h1>
                        <p className="text-xs sm:text-sm text-emerald-100/80 max-w-2xl">
                            Tra cứu trực tiếp từ nguồn dữ liệu chính thức của Tổng cục Hải quan Trung Quốc (GACC - scintl.chinaport.gov.cn), lọc tức thời và đối soát mã số phục vụ xuất khẩu.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 self-start sm:self-center rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-md border border-white/10 shrink-0">
                        <span
                            className={`h-3 w-3 rounded-full animate-pulse ${
                                loading ? "bg-amber-400" : "bg-emerald-400"
                            }`}
                        />
                        <div>
                            <div className="text-xs font-black text-white">{statusMessage}</div>
                            <div className="text-[10px] text-white/70 font-mono">scintl.chinaport.gov.cn</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 01: Điều Kiện Tìm Kiếm */}
            <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs">
                            01
                        </span>
                        <h2 className="text-lg font-black text-slate-900">Điều kiện tìm trên China Port</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {canConfigureNotifications && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={openNotificationSettings}
                                className="relative rounded-xl border-emerald-200 text-xs font-bold text-emerald-800 hover:bg-emerald-50 gap-1.5"
                            >
                                {notificationConfigured ? <Bell className="h-3.5 w-3.5" /> : <Settings className="h-3.5 w-3.5" />}
                                {notificationConfigured ? "Thông báo đang bật" : "Cài đặt thông báo"}
                                {notificationConfigured && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleReset}
                            className="text-xs font-bold text-slate-600 hover:text-rose-600 rounded-xl gap-1.5"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Đặt lại
                        </Button>
                    </div>
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        executeSearch(1);
                    }}
                    className="space-y-4"
                >
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {/* Quốc gia / Vùng */}
                        <div className="relative min-w-0 space-y-1">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                                Quốc gia / Vùng
                            </label>
                            <button
                                type="button"
                                onClick={() => setCountryPanelOpen(!countryPanelOpen)}
                                className="flex h-10 w-full min-w-0 items-center justify-between overflow-hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs font-bold text-slate-800 hover:border-emerald-500 focus:outline-none"
                            >
                                <span className="truncate">{countryToggleLabel}</span>
                                <Globe className="h-4 w-4 shrink-0 text-slate-400" />
                            </button>

                            {countryPanelOpen && (
                                <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-64 min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl space-y-2">
                                    <input
                                        type="search"
                                        value={countrySearchFilter}
                                        onChange={(e) => setCountrySearchFilter(e.target.value)}
                                        placeholder="Tìm mã, tên Anh hoặc Trung..."
                                        className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-emerald-500"
                                        autoFocus
                                    />
                                    <div className="max-h-48 min-w-0 overflow-x-hidden overflow-y-auto divide-y divide-slate-100">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCountryCode("");
                                                setCountryToggleLabel("Tất cả quốc gia");
                                                setCountryPanelOpen(false);
                                            }}
                                            className="w-full px-3 py-2 text-left text-xs font-bold hover:bg-emerald-50 text-slate-700"
                                        >
                                            Tất cả quốc gia
                                        </button>
                                        {filteredCountries.map((c, index) => (
                                            <button
                                                key={`${clean(c.countryCode) || "country"}-${index}`}
                                                type="button"
                                                onClick={() => {
                                                    setCountryCode(clean(c.countryCode));
                                                    setCountryToggleLabel(countryLabel(c));
                                                    setCountryPanelOpen(false);
                                                }}
                                                className={`flex w-full min-w-0 items-center justify-between gap-2 overflow-hidden px-3 py-2 text-left text-xs transition hover:bg-emerald-50 ${
                                                    countryCode === clean(c.countryCode) ? "bg-emerald-50 font-black text-emerald-900" : "text-slate-800 font-medium"
                                                }`}
                                            >
                                                <span className="block min-w-0 flex-1 truncate">{countryLabel(c)}</span>
                                                {countryCode === clean(c.countryCode) && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
                                            </button>
                                        ))}
                                        {!filteredCountries.length && <p className="px-3 py-4 text-center text-xs text-slate-500">Không tìm thấy quốc gia phù hợp.</p>}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Mã đăng ký nước ngoài */}
                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                                Mã đăng ký nước ngoài (PUC / PHC)
                            </label>
                            <input
                                value={overseasOfficialRegNo}
                                onChange={(e) => setOverseasOfficialRegNo(e.target.value)}
                                placeholder="Ví dụ: VN-DNOR-0269, VN-DNPH-131"
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:border-emerald-500 focus:outline-none h-10"
                            />
                        </div>

                        {/* Mã đăng ký Trung Quốc */}
                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                                Mã đăng ký Trung Quốc (GACC)
                            </label>
                            <input
                                value={chinaRegNo}
                                onChange={(e) => setChinaRegNo(e.target.value)}
                                placeholder="Ví dụ: QVNM1425052000371"
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:border-emerald-500 focus:outline-none h-10"
                            />
                        </div>

                        {/* Tên doanh nghiệp (EN) */}
                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                                Tên doanh nghiệp (EN)
                            </label>
                            <input
                                value={corpNameEn}
                                onChange={(e) => setCorpNameEn(e.target.value)}
                                placeholder="Nhập một phần tên doanh nghiệp"
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none h-10"
                            />
                        </div>

                        {/* Tên sản phẩm */}
                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                                Tên sản phẩm (Anh / Trung)
                            </label>
                            <input
                                value={prodName}
                                onChange={(e) => setProdName(e.target.value)}
                                placeholder="Tên Anh / Trung (Mặc định: 榴莲)"
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none h-10"
                            />
                        </div>

                        {/* Trạng thái */}
                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                                Trạng thái kiểm dịch
                            </label>
                            <select
                                value={regState}
                                onChange={(e) => setRegState(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none h-10"
                            >
                                <option value="">Tất cả trạng thái</option>
                                <option value="1">Còn hiệu lực (Hoạt động)</option>
                                <option value="2">Tạm dừng (Bị khóa/treo)</option>
                            </select>
                        </div>

                        {/* Loại hình doanh nghiệp */}
                        <div className="relative space-y-1">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                                Loại hình doanh nghiệp
                            </label>
                            <button
                                type="button"
                                onClick={() => setCorpTypePanelOpen(!corpTypePanelOpen)}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs font-bold text-slate-800 hover:border-emerald-500 focus:outline-none flex items-center justify-between truncate h-10"
                            >
                                <span className="truncate">
                                    {selectedCorpTypes.length === 0
                                        ? "Tất cả loại doanh nghiệp"
                                        : selectedCorpTypes.length === 1
                                        ? corpTypes.find((c) => c.corpTypeCode === selectedCorpTypes[0])?.corpTypeNameEn || "Đã chọn 1 loại"
                                        : `Đã chọn ${selectedCorpTypes.length} loại`}
                                </span>
                                <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
                            </button>

                            {corpTypePanelOpen && (
                                <div className="absolute left-0 right-0 top-full z-40 mt-1 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl space-y-2">
                                    <div className="max-h-52 overflow-y-auto space-y-1.5">
                                        {corpTypes.map((c) => {
                                            const isChecked = selectedCorpTypes.includes(c.corpTypeCode);
                                            return (
                                                <label
                                                    key={c.corpTypeCode}
                                                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs font-medium text-slate-800"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => {
                                                            if (isChecked) {
                                                                setSelectedCorpTypes(selectedCorpTypes.filter((t) => t !== c.corpTypeCode));
                                                            } else {
                                                                setSelectedCorpTypes([...selectedCorpTypes, c.corpTypeCode]);
                                                            }
                                                        }}
                                                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                    />
                                                    <span>{c.corpTypeNameEn} · {c.corpTypeNameCn}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                    <div className="pt-2 border-t flex justify-end">
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => setCorpTypePanelOpen(false)}
                                            className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold h-8"
                                        >
                                            Xong · Áp dụng
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Số dòng tải */}
                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                                Số dòng tải
                            </label>
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none h-10"
                            >
                                <option value={15}>15 dòng (Mặc định)</option>
                                <option value={30}>30 dòng</option>
                                <option value={50}>50 dòng</option>
                                <option value={100}>100 dòng</option>
                                <option value={200}>200 dòng</option>
                                <option value={500}>500 dòng</option>
                                <option value={1000}>1000 dòng</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                        <p className="text-xs text-slate-500">
                            Kết quả tự cập nhật khi bạn nhập/chọn điều kiện. Các trường chữ được tự động chuyển sang tìm gần đúng <code>%từ khoá%</code> đúng như trang gốc China Port.
                        </p>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl px-6 h-10 text-xs gap-2 shrink-0 shadow-sm"
                        >
                            <Search className="h-4 w-4" />
                            {loading ? "Đang tìm..." : "Tìm dữ liệu"}
                        </Button>
                    </div>
                </form>
            </section>

            {/* SECTION 02: Bảng Kết Quả */}
            <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm space-y-4">
                {/* Result Title & Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs">
                            02
                        </span>
                        <div>
                            <h2 className="text-lg font-black text-slate-900">Kết quả</h2>
                            <p className="text-xs text-slate-500">
                                Hiển thị <b>{filteredRows.length}</b>/{rows.length} dòng đã tải · Tổng nguồn China Port: <b>{total.toLocaleString("vi-VN")}</b>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleExportExcel}
                            disabled={exportingExcel || !filteredRows.length}
                            className="rounded-xl text-xs font-bold gap-1.5 h-9 border-slate-200 text-slate-700 hover:text-emerald-700"
                        >
                            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                            {exportingExcel ? "Đang xuất..." : "Xuất Excel / CSV"}
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setColumnsPanelOpen(!columnsPanelOpen)}
                            className="rounded-xl text-xs font-bold gap-1.5 h-9 border-slate-200 text-slate-700"
                        >
                            <Columns className="h-4 w-4 text-slate-600" />
                            Tuỳ chỉnh cột
                        </Button>
                    </div>
                </div>

                {/* Column Customizer Panel */}
                {columnsPanelOpen && (
                    <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 text-xs space-y-2">
                        <p className="font-bold text-slate-700">Chọn các cột muốn hiển thị:</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                            {columns.map((col, idx) => (
                                <label
                                    key={col.key}
                                    className="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-emerald-50"
                                >
                                    <input
                                        type="checkbox"
                                        checked={col.visible}
                                        onChange={(e) => {
                                            const updated = [...columns];
                                            updated[idx].visible = e.target.checked;
                                            setColumns(updated);
                                        }}
                                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span className="truncate text-slate-800 font-bold">{col.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {/* Live Filter Bar & Status Chips */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                            value={liveFilter}
                            onChange={(e) => setLiveFilter(e.target.value)}
                            placeholder="Lọc tức thời · ưu tiên mã nước ngoài và tên doanh nghiệp (Ví dụ PH, TS 647, tên công ty...)"
                            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs font-medium focus:border-emerald-500 focus:outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shrink-0">
                        <button
                            type="button"
                            onClick={() => setStatusChipFilter("")}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                                statusChipFilter === "" ? "bg-emerald-800 text-white" : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            Tất cả
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusChipFilter("1")}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1 ${
                                statusChipFilter === "1" ? "bg-emerald-800 text-white" : "text-emerald-700 hover:bg-emerald-50"
                            }`}
                        >
                            ● Hoạt động
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusChipFilter("2")}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1 ${
                                statusChipFilter === "2" ? "bg-rose-800 text-white" : "text-rose-700 hover:bg-rose-50"
                            }`}
                        >
                            ● Tạm dừng
                        </button>
                    </div>

                    {liveFilter && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setLiveFilter("")}
                            className="text-xs text-slate-500 hover:text-slate-800"
                        >
                            Xoá lọc
                        </Button>
                    )}
                </div>

                {/* Table Data */}
                <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-slate-300 text-left text-xs">
                            <thead className="bg-slate-100/90 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                                <tr>
                                    {columns
                                        .filter((c) => c.visible)
                                        .map((col) => {
                                            const isDateField = col.key === "validFrom" || col.key === "validTo";
                                            return (
                                                <th
                                                    key={col.key}
                                                    className={`border border-slate-300 px-3.5 py-3 font-semibold align-middle whitespace-nowrap ${
                                                        isDateField ? "w-32 min-w-[130px] max-w-[130px] text-center" : ""
                                                    }`}
                                                >
                                                    {col.label}
                                                </th>
                                            );
                                        })}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRows.map((row, index) => (
                                    <tr
                                        key={row.chinaRegNo || row.overseasOfficialRegNo || index}
                                        className="hover:bg-slate-50/70 transition group"
                                    >
                                        {columns
                                            .filter((c) => c.visible)
                                            .map((col) => {
                                                if (col.key === "view") {
                                                    return (
                                                        <td key={col.key} className="border border-slate-200 px-3.5 py-2.5 whitespace-nowrap text-center">
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                onClick={() => setSelectedDetailRow(row)}
                                                                className="bg-emerald-100 hover:bg-emerald-700 hover:text-white text-emerald-900 rounded-lg text-[11px] font-bold h-7 px-2.5 gap-1 transition"
                                                            >
                                                                <Eye className="h-3 w-3" />
                                                                Xem
                                                            </Button>
                                                        </td>
                                                    );
                                                }

                                                if (col.key === "status") {
                                                    const isActive = row.regState === "1";
                                                    return (
                                                        <td key={col.key} className="border border-slate-200 px-3.5 py-2.5 whitespace-nowrap text-center">
                                                            <span
                                                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                                    isActive
                                                                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                                                        : "bg-rose-100 text-rose-800 border border-rose-200"
                                                                }`}
                                                            >
                                                                {isActive ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                                                                {statusLabel(row.regState)}
                                                            </span>
                                                        </td>
                                                    );
                                                }

                                                // Đảm bảo 2 cột "HIỆU LỰC TỪ" và "HIỆU LỰC ĐẾN" nằm trên 1 hàng và có độ rộng bằng nhau
                                                if (col.key === "validFrom" || col.key === "validTo") {
                                                    return (
                                                        <td
                                                            key={col.key}
                                                            className="border border-slate-200 px-3.5 py-2.5 text-slate-700 font-mono text-[11px] text-center whitespace-nowrap w-32 min-w-[130px] max-w-[130px]"
                                                        >
                                                            {fmtDate(row[col.key])}
                                                        </td>
                                                    );
                                                }

                                                if (col.key === "overseasOfficialRegNo" || col.key === "chinaRegNo") {
                                                    return (
                                                        <td key={col.key} className="border border-slate-200 px-3.5 py-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                                                            {clean(row[col.key]) || "—"}
                                                        </td>
                                                    );
                                                }

                                                if (col.key === "corpNameEn") {
                                                    return (
                                                        <td key={col.key} className="border border-slate-200 px-3.5 py-2.5 font-bold text-slate-900 max-w-xs truncate" title={clean(row.corpNameEn)}>
                                                            {clean(row.corpNameEn) || "—"}
                                                        </td>
                                                    );
                                                }

                                                return (
                                                    <td key={col.key} className="border border-slate-200 px-3.5 py-2.5 text-slate-700 whitespace-pre-line">
                                                        {getCellContent(row, col.key)}
                                                    </td>
                                                );
                                            })}
                                    </tr>
                                ))}

                                {!filteredRows.length && (
                                    <tr>
                                        <td
                                            colSpan={columns.filter((c) => c.visible).length}
                                            className="border border-slate-200 py-12 text-center text-slate-500 text-sm font-medium"
                                        >
                                            {loading ? "Đang kết nối và tải dữ liệu China Port..." : "Không có dòng dữ liệu nào khớp với điều kiện tìm kiếm."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1 || loading}
                        onClick={() => executeSearch(currentPage - 1)}
                        className="rounded-xl text-xs font-bold gap-1 h-8"
                    >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        Trang trước
                    </Button>

                    <span className="text-xs font-bold text-slate-600">
                        Trang {currentPage} · (Tổng {total.toLocaleString("vi-VN")} mục)
                    </span>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={currentPage * pageSize >= total || loading}
                        onClick={() => executeSearch(currentPage + 1)}
                        className="rounded-xl text-xs font-bold gap-1 h-8"
                    >
                        Trang sau
                        <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </section>

            {canConfigureNotifications && notificationOpen && !emailPreview && typeof document !== "undefined" && createPortal(
                <div
                    className="fixed inset-0 z-[200] flex h-screen w-screen items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
                    onMouseDown={(event) => event.target === event.currentTarget && setNotificationOpen(false)}
                >
                    <section role="dialog" aria-modal="true" aria-label="Cấu hình thông báo China Port" className="my-auto flex max-h-[90vh] w-full max-w-[760px] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150">
                        <header className="flex shrink-0 items-start justify-between border-b px-6 py-5">
                            <div>
                                <h2 className="flex items-center gap-2 text-xl font-black text-slate-900"><Settings className="h-5 w-5 text-emerald-700" />Cấu hình thông báo China Port</h2>
                                <p className="mt-1 text-sm text-slate-500">Nhận thông báo khi dữ liệu của quốc gia/vùng theo dõi có thay đổi.</p>
                            </div>
                            <button type="button" onClick={() => setNotificationOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Đóng"><X className="h-5 w-5" /></button>
                        </header>

                        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                            <section className="pb-5">
                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Quốc gia / Vùng theo dõi</h3>
                                <label className="mt-3 block text-sm font-bold text-slate-700">Quốc gia / Vùng *
                                    <select disabled value={notificationSettings.countryCode} onChange={(event) => setNotificationSettings((value) => ({ ...value, countryCode: event.target.value }))} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-emerald-500 focus:outline-none">
                                        <option value="704">[VNM] Viet Nam · 越南</option>
                                    </select>
                                </label>
                            </section>

                            <section className="border-t py-5">
                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Thông báo khi</h3>
                                <p className="mt-1 text-sm text-slate-500">Chọn những thay đổi bạn muốn nhận thông báo.</p>
                                <div className="mt-3 space-y-3">
                                    {([
                                        ["NEW_RECORD", "Có dữ liệu đăng ký mới", "Xuất hiện bản ghi mới của quốc gia/vùng đang theo dõi."],
                                        ["STATUS_CHANGED", "Trạng thái đăng ký thay đổi", "Bao quát Còn hiệu lực, Tạm dừng và Hết hiệu lực."],
                                        ["DATA_CHANGED", "Thông tin đăng ký thay đổi", "Doanh nghiệp, mã, ngày hiệu lực hoặc dữ liệu quan trọng được cập nhật."],
                                    ] as [NotificationEvent, string, string][]).map(([event, label, description]) => (
                                        <label key={event} className="flex cursor-pointer items-start gap-3 rounded-xl p-2 hover:bg-slate-50">
                                            <input type="checkbox" checked={notificationSettings.events.includes(event)} onChange={(e) => setNotificationSettings((value) => ({ ...value, events: e.target.checked ? [...value.events, event] : value.events.filter((item) => item !== event) }))} className="mt-1 h-4 w-4 accent-emerald-600" />
                                            <span><span className="block text-sm font-bold text-slate-800">{label}</span><span className="block text-xs text-slate-500">{description}</span></span>
                                        </label>
                                    ))}
                                </div>
                            </section>

                            <section className="border-t pt-5">
                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Kênh nhận thông báo</h3>
                                <p className="mt-1 text-sm text-slate-500">Bật Email để nhận thông báo; bỏ chọn để tắt.</p>
                                <label className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-800"><input type="checkbox" checked={notificationSettings.emailEnabled} onChange={(e) => setNotificationSettings((value) => ({ ...value, emailEnabled: e.target.checked }))} className="h-4 w-4 accent-emerald-600" /><Mail className="h-4 w-4 text-emerald-700" /> Email</label>
                                {notificationSettings.emailEnabled && <div className="mt-3 space-y-2">{notificationSettings.emails.map((email, index) => <div key={index} className="flex gap-2"><input aria-label={`Email ${index + 1}`} value={email} onChange={(e) => setNotificationSettings((value) => ({ ...value, emails: value.emails.map((item, i) => i === index ? e.target.value : item) }))} placeholder="admin@triviet.vn" className="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm focus:border-emerald-500 focus:outline-none" /><button type="button" onClick={() => setNotificationSettings((value) => ({ ...value, emails: value.emails.filter((_, i) => i !== index) }))} className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X className="h-4 w-4" /></button></div>)}<button type="button" onClick={() => setNotificationSettings((value) => ({ ...value, emails: [...value.emails, ""] }))} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700"><Plus className="h-3.5 w-3.5" />Thêm email</button></div>}

                                <label className="mt-5 flex items-center gap-2 text-sm font-bold text-slate-800"><input type="checkbox" disabled checked={notificationSettings.smsEnabled} onChange={(e) => setNotificationSettings((value) => ({ ...value, smsEnabled: e.target.checked }))} className="h-4 w-4 accent-emerald-600" /><MessageSquare className="h-4 w-4 text-emerald-700" /> SMS (chưa hỗ trợ gửi)</label>
                                {notificationSettings.smsEnabled && <div className="mt-3 space-y-2">{notificationSettings.phones.map((phone, index) => <div key={index} className="flex gap-2"><input aria-label={`Số điện thoại ${index + 1}`} value={phone} onChange={(e) => setNotificationSettings((value) => ({ ...value, phones: value.phones.map((item, i) => i === index ? e.target.value : item) }))} placeholder="+84 912 345 678" className="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm focus:border-emerald-500 focus:outline-none" /><button type="button" onClick={() => setNotificationSettings((value) => ({ ...value, phones: value.phones.filter((_, i) => i !== index) }))} className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X className="h-4 w-4" /></button></div>)}<button type="button" onClick={() => setNotificationSettings((value) => ({ ...value, phones: [...value.phones, ""] }))} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700"><Plus className="h-3.5 w-3.5" />Thêm số điện thoại</button></div>}
                                {notificationSettings.emailEnabled && (
                                    <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                                        <h4 className="font-bold text-slate-900">Gửi email thử</h4>
                                        {emailServiceReady === false && <p role="status" className="mt-2 text-sm text-amber-800">Địa chỉ nhận có thể được lưu, nhưng dịch vụ gửi email của hệ thống chưa được cấu hình SMTP.</p>}
                                        <p className="mt-1 text-sm text-slate-600">Gửi đến các email đã nhập ở trên bằng dữ liệu mẫu Việt Nam, không cần lưu cấu hình. Tiêu đề có [TEST]; dữ liệu China Port không bị thay đổi.</p>
                                        <label htmlFor="china-port-test-event" className="mt-3 block text-sm font-semibold text-slate-700">Tình huống kiểm thử</label>
                                        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                                            <select id="china-port-test-event" value={testEvent} disabled={sendingTestEmail} onChange={(e) => setTestEvent(e.target.value as NotificationEvent)} className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm">
                                                <option value="NEW_RECORD">Có dữ liệu đăng ký mới</option>
                                                <option value="STATUS_CHANGED">Trạng thái đăng ký thay đổi</option>
                                                <option value="DATA_CHANGED">Thông tin đăng ký thay đổi</option>
                                            </select>
                                            <Button type="button" disabled={sendingTestEmail} onClick={() => void sendTestEmail(true)} variant="outline" className="rounded-xl">Xem trước email</Button>
                                            <Button type="button" disabled={sendingTestEmail} onClick={() => void sendTestEmail()} className="rounded-xl bg-emerald-700 text-white hover:bg-emerald-800"><Mail className="h-4 w-4" />{sendingTestEmail ? "Đang xử lý…" : "Gửi email thử"}</Button>
                                        </div>
                                        {testEmailResult && <p role={testEmailResult.success ? "status" : "alert"} className={`mt-3 rounded-lg p-3 text-sm ${testEmailResult.success ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}`}>{testEmailResult.message}</p>}
                                    </div>
                                )}
                                {notificationError && <p role="alert" className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">⚠ {notificationError}</p>}
                            </section>
                        </div>

                        <footer className="flex shrink-0 justify-end gap-3 border-t bg-slate-50 px-6 py-4">
                            <Button type="button" variant="outline" onClick={() => setNotificationOpen(false)} className="rounded-xl">Hủy</Button>
                            <Button type="button" disabled={loadingSettings || savingSettings} onClick={saveNotificationSettings} className="rounded-xl bg-emerald-700 text-white hover:bg-emerald-800"><Check className="h-4 w-4" />{savingSettings ? "Đang lưu…" : loadingSettings ? "Đang tải…" : "Lưu cấu hình"}</Button>
                        </footer>
                    </section>
                </div>,
                document.body
            )}

            {emailPreview && typeof document !== "undefined" && createPortal(
                <div
                    className="fixed inset-0 z-[210] flex h-screen w-screen items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
                    onMouseDown={(event) => event.target === event.currentTarget && setEmailPreview(null)}
                >
                    <section role="dialog" aria-modal="true" aria-labelledby="email-preview-title" className="my-auto flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl animate-in fade-in-50 zoom-in-95 duration-150">
                        <header className="shrink-0 space-y-2 border-b p-4">
                            <div className="flex items-center justify-between gap-4"><h2 id="email-preview-title" className="text-lg font-bold">XEM TRƯỚC EMAIL</h2><Button type="button" variant="outline" onClick={() => setEmailPreview(null)}>Đóng</Button></div>
                            <p className="text-sm"><strong>Đến:</strong> {emailPreview.recipients.join(", ")}</p>
                            <p className="text-sm"><strong>Tiêu đề:</strong> {emailPreview.subject}</p>
                            <p className="text-xs text-slate-500">Dữ liệu kiểm thử. Đây là bản xem trước, chưa gửi email. Cách hiển thị có thể khác đôi chút giữa các ứng dụng email.</p>
                        </header>
                        <iframe title="Nội dung email thông báo China Port" sandbox="" srcDoc={emailPreview.html} className="min-h-0 w-full flex-1 border-0" style={{ height: "65vh", flexBasis: "65vh" }} />
                    </section>
                </div>,
                document.body
            )}

            {/* DETAIL MODAL (CHI TIẾT HỒ SƠ) */}
            {selectedDetailRow && typeof document !== "undefined" && createPortal(
                <div
                    className="fixed inset-0 z-[200] flex h-screen w-screen items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
                    onMouseDown={(event) => event.target === event.currentTarget && setSelectedDetailRow(null)}
                >
                    <div className="relative my-auto w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden my-8 border border-slate-200 animate-in fade-in-50 zoom-in-95 duration-150">
                        {/* Modal Top */}
                        <div className="bg-gradient-to-r from-emerald-900 to-teal-950 p-6 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md">
                                    <ShieldCheck className="h-6 w-6 text-emerald-300" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-md">
                                        HỒ SƠ KIỂM DỊCH GACC
                                    </span>
                                    <h3 className="text-lg font-black mt-0.5 tracking-tight text-white line-clamp-1">
                                        {clean(selectedDetailRow.corpNameEn) || clean(selectedDetailRow.chinaRegNo)}
                                    </h3>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedDetailRow(null)}
                                className="rounded-xl p-2 text-white/80 hover:bg-white/10 hover:text-white transition"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                                <div className="space-y-3">
                                    <div>
                                        <span className="text-slate-400 font-bold uppercase block text-[10px]">Quốc gia / Vùng:</span>
                                        <span className="font-bold text-slate-900 text-sm">
                                            {clean(selectedDetailRow.countryNameEn)} · {clean(selectedDetailRow.countryNameCn)}
                                        </span>
                                    </div>

                                    <div>
                                        <span className="text-slate-400 font-bold uppercase block text-[10px]">Tỉnh / Bang:</span>
                                        <span className="font-semibold text-slate-800">
                                            {clean(selectedDetailRow.provinceNameEn)} {clean(selectedDetailRow.provinceNameCn)}
                                        </span>
                                    </div>

                                    <div>
                                        <span className="text-slate-400 font-bold uppercase block text-[10px]">Mã nước ngoài (PUC / PHC):</span>
                                        <span className="font-mono font-black text-emerald-800 text-sm">
                                            {clean(selectedDetailRow.overseasOfficialRegNo) || "—"}
                                        </span>
                                    </div>

                                    <div>
                                        <span className="text-slate-400 font-bold uppercase block text-[10px]">Mã Trung Quốc (GACC):</span>
                                        <span className="font-mono font-black text-indigo-900 text-sm">
                                            {clean(selectedDetailRow.chinaRegNo) || "—"}
                                        </span>
                                    </div>

                                    <div>
                                        <span className="text-slate-400 font-bold uppercase block text-[10px]">Doanh nghiệp / Vùng trồng (EN):</span>
                                        <span className="font-black text-slate-900">
                                            {clean(selectedDetailRow.corpNameEn) || "—"}
                                        </span>
                                    </div>

                                    <div>
                                        <span className="text-slate-400 font-bold uppercase block text-[10px]">Tên địa phương:</span>
                                        <span className="font-semibold text-slate-800">
                                            {clean(selectedDetailRow.corpNameMo) || "—"}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-3 sm:pl-4 pt-3 sm:pt-0">
                                    <div>
                                        <span className="text-slate-400 font-bold uppercase block text-[10px]">Địa chỉ cơ sở:</span>
                                        <span className="font-medium text-slate-800">
                                            {clean(selectedDetailRow.corpAddrNameEn || selectedDetailRow.corpAddrNameMo) || "—"}
                                        </span>
                                    </div>

                                    <div>
                                        <span className="text-slate-400 font-bold uppercase block text-[10px]">Loại & Nhóm sản phẩm:</span>
                                        <span className="font-semibold text-slate-800">
                                            {clean(selectedDetailRow.prodTypeNameEn)} · {clean(selectedDetailRow.prodCategoryNameEn)}
                                        </span>
                                    </div>

                                    <div>
                                        <span className="text-slate-400 font-bold uppercase block text-[10px]">Tên sản phẩm:</span>
                                        <span className="font-black text-emerald-800 text-sm">
                                            {clean(selectedDetailRow.prodNameEn || selectedDetailRow.prodNameCn)}
                                            {selectedDetailRow.prodNameLa ? ` (${selectedDetailRow.prodNameLa})` : ""}
                                        </span>
                                    </div>

                                    <div>
                                        <span className="text-slate-400 font-bold uppercase block text-[10px]">Loại hình doanh nghiệp:</span>
                                        <span className="font-bold text-slate-800">
                                            {clean(selectedDetailRow.corpTypeNameEn || selectedDetailRow.corpTypeNameCn) || "—"}
                                        </span>
                                    </div>

                                    <div>
                                        <span className="text-slate-400 font-bold uppercase block text-[10px]">Thời hạn hiệu lực:</span>
                                        <span className="font-semibold text-slate-800">
                                            {fmtDate(selectedDetailRow.validFrom)} → {fmtDate(selectedDetailRow.validTo)}
                                        </span>
                                    </div>

                                    <div>
                                        <span className="text-slate-400 font-bold uppercase block text-[10px]">Trạng thái kiểm dịch:</span>
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black uppercase mt-0.5 ${
                                            selectedDetailRow.regState === "1"
                                                ? "bg-emerald-100 text-emerald-800"
                                                : "bg-rose-100 text-rose-800"
                                        }`}>
                                            {statusLabel(selectedDetailRow.regState)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-slate-50 border-t flex items-center justify-end">
                            <Button
                                type="button"
                                onClick={() => setSelectedDetailRow(null)}
                                className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold px-6"
                            >
                                Đóng
                            </Button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
