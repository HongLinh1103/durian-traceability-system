"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
    Check
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Types
export type ChinaPortCountry = {
    countryIso: string;
    countryCode: string;
    countryNameEn: string;
    countryNameCn: string;
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
const fmtDate = (value: any) => clean(value).slice(0, 10) || "—";
const statusLabel = (value: any) => (value === "1" ? "Còn hiệu lực" : value === "2" ? "Tạm dừng" : clean(value) || "—");

export function ChinaPortView() {
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
    const [pageSize, setPageSize] = useState<number>(200);

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
                        (c: ChinaPortCountry) => clean(c.countryIso).toUpperCase() === "VNM" || c.countryCode === "704"
                    );
                    if (vnm) {
                        setCountryCode(vnm.countryCode);
                        setCountryToggleLabel(`[${vnm.countryIso}] ${vnm.countryNameEn} · ${vnm.countryNameCn}`);
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
        const q = countrySearchFilter.trim().toLowerCase();
        return countries.filter(
            (c) =>
                c.countryIso.toLowerCase().includes(q) ||
                c.countryNameEn.toLowerCase().includes(q) ||
                c.countryNameCn.toLowerCase().includes(q) ||
                c.countryCode.includes(q)
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
        setPageSize(200);
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

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        executeSearch(1);
                    }}
                    className="space-y-4"
                >
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {/* Quốc gia / Vùng */}
                        <div className="relative space-y-1">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                                Quốc gia / Vùng
                            </label>
                            <button
                                type="button"
                                onClick={() => setCountryPanelOpen(!countryPanelOpen)}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs font-bold text-slate-800 hover:border-emerald-500 focus:outline-none flex items-center justify-between truncate h-10"
                            >
                                <span className="truncate">{countryToggleLabel}</span>
                                <Globe className="h-4 w-4 shrink-0 text-slate-400" />
                            </button>

                            {countryPanelOpen && (
                                <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl space-y-2">
                                    <input
                                        type="search"
                                        value={countrySearchFilter}
                                        onChange={(e) => setCountrySearchFilter(e.target.value)}
                                        placeholder="Tìm mã, tên Anh hoặc Trung..."
                                        className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-emerald-500"
                                        autoFocus
                                    />
                                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
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
                                        {filteredCountries.map((c) => (
                                            <button
                                                key={c.countryCode}
                                                type="button"
                                                onClick={() => {
                                                    setCountryCode(c.countryCode);
                                                    setCountryToggleLabel(`[${c.countryIso}] ${c.countryNameEn} · ${c.countryNameCn}`);
                                                    setCountryPanelOpen(false);
                                                }}
                                                className={`w-full px-3 py-2 text-left text-xs transition hover:bg-emerald-50 flex items-center justify-between ${
                                                    countryCode === c.countryCode ? "bg-emerald-50 font-black text-emerald-900" : "text-slate-800 font-medium"
                                                }`}
                                            >
                                                <span>[{c.countryIso}] {c.countryNameEn} · {c.countryNameCn}</span>
                                                {countryCode === c.countryCode && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Mã đăng ký nước ngoài */}
                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                                Mã đăng ký nước ngoài (MSVT/MSCSĐG)
                            </label>
                            <input
                                value={overseasOfficialRegNo}
                                onChange={(e) => setOverseasOfficialRegNo(e.target.value)}
                                placeholder="Ví dụ: TS 647, VN - DTOR - 0574"
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
                                onChange={(e) => setPageSize(Number(e.target.value))}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none h-10"
                            >
                                <option value={50}>50 dòng</option>
                                <option value={100}>100 dòng</option>
                                <option value={200}>200 dòng (Khuyên dùng)</option>
                                <option value={500}>500 dòng</option>
                                <option value={1000}>1000 dòng</option>
                                <option value={2000}>2000 dòng</option>
                                <option value={3000}>3000 dòng</option>
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
                <div className="rounded-2xl border border-slate-200 overflow-hidden overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100/80 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b">
                            <tr>
                                {columns
                                    .filter((c) => c.visible)
                                    .map((col) => {
                                        const isDateField = col.key === "validFrom" || col.key === "validTo";
                                        return (
                                            <th
                                                key={col.key}
                                                className={`px-4 py-3 whitespace-nowrap ${
                                                    isDateField ? "w-32 min-w-[130px] max-w-[130px] text-center" : ""
                                                }`}
                                            >
                                                {col.label}
                                            </th>
                                        );
                                    })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredRows.map((row, index) => (
                                <tr
                                    key={row.chinaRegNo || row.overseasOfficialRegNo || index}
                                    className="hover:bg-emerald-50/40 transition group"
                                >
                                    {columns
                                        .filter((c) => c.visible)
                                        .map((col) => {
                                            if (col.key === "view") {
                                                return (
                                                    <td key={col.key} className="px-4 py-3 whitespace-nowrap">
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
                                                    <td key={col.key} className="px-4 py-3 whitespace-nowrap">
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
                                                        className="px-4 py-3 text-slate-700 font-mono text-[11px] text-center whitespace-nowrap w-32 min-w-[130px] max-w-[130px]"
                                                    >
                                                        {fmtDate(row[col.key])}
                                                    </td>
                                                );
                                            }

                                            if (col.key === "overseasOfficialRegNo" || col.key === "chinaRegNo") {
                                                return (
                                                    <td key={col.key} className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                                                        {clean(row[col.key]) || "—"}
                                                    </td>
                                                );
                                            }

                                            if (col.key === "corpNameEn") {
                                                return (
                                                    <td key={col.key} className="px-4 py-3 font-bold text-slate-900 max-w-xs truncate" title={clean(row.corpNameEn)}>
                                                        {clean(row.corpNameEn) || "—"}
                                                    </td>
                                                );
                                            }

                                            return (
                                                <td key={col.key} className="px-4 py-3 text-slate-700 whitespace-pre-line">
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
                                        className="py-12 text-center text-slate-400 text-sm font-medium"
                                    >
                                        {loading ? "Đang kết nối và tải dữ liệu China Port..." : "Không có dòng dữ liệu nào khớp với điều kiện tìm kiếm."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
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

            {/* DETAIL MODAL (CHI TIẾT HỒ SƠ) */}
            {selectedDetailRow && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
                    <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden my-8 border border-slate-200">
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
                                        <span className="text-slate-400 font-bold uppercase block text-[10px]">Mã nước ngoài (MSVT/MSCSĐG):</span>
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
                </div>
            )}
        </div>
    );
}
