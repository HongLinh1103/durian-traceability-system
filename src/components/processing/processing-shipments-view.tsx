'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import {
    Boxes,
    Building2,
    Calendar,
    Check,
    CheckCircle2,
    ChevronDown,
    Clock,
    Copy,
    Download,
    ExternalLink,
    Eye,
    Globe,
    Layers,
    Loader2,
    Plus,
    Printer,
    QrCode,
    Search,
    Share2,
    Sparkles,
    Trees,
    Truck,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ModalPortal } from "@/components/ui/modal-portal";
import { encodePreviewPayload, PreviewTraceData } from "@/lib/trace-preview";

export type ShipmentItemRow = {
    id: string;
    shipmentCode: string;
    productName: string;
    shipmentType?: "EXPORT" | "DOMESTIC";
    containerNumber?: string;
    sealNumber?: string;
    truckPlate?: string;
    carrierName?: string;
    weight: number;
    boxCount?: number;
    destinationCountry?: string;
    portOfLoading?: string;
    portOfDestination?: string;
    // Domestic fields (3-level channel)
    distributionChannel?: string;
    partnerSystem?: string;
    partnerBranch?: string;
    contactPerson?: string;
    customerName?: string;
    customerPhone?: string;
    deliveryAddress?: string;
    transportMethod?: string;
    driverName?: string;
    dispatchDate?: string | Date | null;
    status: "DRAFT" | "READY" | "DISPATCHED";
    hasQrCode?: boolean;
    qrPublicToken?: string;
    farmName?: string;
    regionCode?: string;
    rawLotCode?: string;
    facilityName?: string;
};

export type AvailableFinishedLot = {
    id: string;
    lotCode: string;
    productName: string;
    remainingWeight: number;
    packaging?: string;
    farmName?: string;
    regionCode?: string;
    rawLotCode?: string;
    status?: string;
};

// =========================================================================
// DANH MỤC PHÂN PHỐI 3 CẤP CHUẨN HÓA VÀ GỢI Ý ĐỐI TÁC / CHI NHÁNH
// =========================================================================
export interface DistributionBranchPreset {
    name: string;
    contactPerson?: string;
    phone?: string;
    address?: string;
}

export interface DistributionPartnerPreset {
    name: string;
    branches: DistributionBranchPreset[];
}

export const DISTRIBUTION_CHANNELS = [
    "Hệ thống siêu thị",
    "Chợ đầu mối",
    "Chuỗi cửa hàng trái cây / Bán lẻ",
    "Đại lý / Phân phối sỉ",
    "Khách hàng doanh nghiệp",
] as const;

export const DISTRIBUTION_PRESETS: Record<string, DistributionPartnerPreset[]> = {
    "Hệ thống siêu thị": [
        {
            name: "Co.opmart",
            branches: [
                { name: "Co.opmart Phú Lâm", contactPerson: "Phạm Quốc Tuấn", phone: "0908 123 456", address: "Số 06 Bà Hom, Phường 13, Quận 6, TP.HCM" },
                { name: "Co.opmart Nguyễn Ảnh Thủ", contactPerson: "Vũ Đình Trọng", phone: "0903 234 567", address: "Số 167/2 Nguyễn Ảnh Thủ, Xã Trung Chánh, Hóc Môn, TP.HCM" },
                { name: "Co.opmart Lý Thường Kiệt", contactPerson: "Hoàng Minh Trí", phone: "0909 345 678", address: "Số 497 Hòa Hảo, Phường 7, Quận 10, TP.HCM" },
                { name: "Co.opmart Cống Quỳnh", contactPerson: "Lê Thị Mai", phone: "0903 112 233", address: "Số 189C Cống Quỳnh, P. Nguyễn Cư Trinh, Quận 1, TP.HCM" },
            ],
        },
        {
            name: "WinMart",
            branches: [
                { name: "WinMart Landmark 81", contactPerson: "Nguyễn Văn Hùng", phone: "0912 345 678", address: "Tầng B1 Vincom Landmark 81, 208 Nguyễn Hữu Cảnh, Bình Thạnh, TP.HCM" },
                { name: "WinMart Thảo Điền", contactPerson: "Trần Thị Mai", phone: "0913 456 789", address: "Tầng B1 Vincom Mega Mall Thảo Điền, TP. Thủ Đức, TP.HCM" },
                { name: "WinMart Ba Tháng Hai", contactPerson: "Lê Hoàng Phúc", phone: "0918 888 222", address: "Số 3C Đường 3/2, Phường 11, Quận 10, TP.HCM" },
                { name: "WinMart Cộng Hòa", contactPerson: "Phan Văn Đức", phone: "0917 555 444", address: "Số 15-17 Cộng Hòa, Phường 4, Tân Bình, TP.HCM" },
            ],
        },
        {
            name: "Bách Hóa Xanh",
            branches: [
                { name: "Kho Tổng Bách Hóa Xanh Tân Tạo", contactPerson: "Nguyễn Tấn Đạt", phone: "0938 111 222", address: "KCN Tân Tạo, Đường số 2, P. Tân Tạo A, Bình Tân, TP.HCM" },
                { name: "Bách Hóa Xanh Thủ Đức", contactPerson: "Lê Văn Thịnh", phone: "0933 222 333", address: "Số 45 Võ Văn Ngân, P. Linh Chiểu, TP. Thủ Đức, TP.HCM" },
                { name: "Bách Hóa Xanh Gò Vấp", contactPerson: "Trương Minh Hải", phone: "0932 444 555", address: "Số 120 Phan Văn Trị, Phường 10, Gò Vấp, TP.HCM" },
            ],
        },
        {
            name: "Aeon Mall",
            branches: [
                { name: "Aeon Mall Tân Phú Celadon", contactPerson: "Trần Bảo Nam", phone: "0944 555 666", address: "Số 30 Bờ Bao Tân Thắng, P. Sơn Kỳ, Tân Phú, TP.HCM" },
                { name: "Aeon Mall Bình Tân", contactPerson: "Đỗ Gia Huy", phone: "0945 666 777", address: "Số 1 Đường số 17A, P. Bình Trị Đông B, Bình Tân, TP.HCM" },
            ],
        },
        {
            name: "Lotte Mart",
            branches: [
                { name: "Lotte Mart Nam Sài Gòn", contactPerson: "Bùi Thanh Phong", phone: "0922 777 888", address: "Số 469 Nguyễn Hữu Thọ, P. Tân Hưng, Quận 7, TP.HCM" },
                { name: "Lotte Mart Gò Vấp", contactPerson: "Lý Gia Bảo", phone: "0923 888 999", address: "Số 242 Nguyễn Văn Lượng, Phường 10, Gò Vấp, TP.HCM" },
            ],
        },
        {
            name: "GO! / Big C",
            branches: [
                { name: "GO! An Lạc", contactPerson: "Đinh Quang Khải", phone: "0966 888 999", address: "Số 1231 Quốc lộ 1A, Bình Tân, TP.HCM" },
                { name: "GO! Miền Đông", contactPerson: "Vũ Hải Đăng", phone: "0967 111 222", address: "Số 268 Tô Hiến Thành, Phường 15, Quận 10, TP.HCM" },
            ],
        },
    ],
    "Chợ đầu mối": [
        {
            name: "Chợ đầu mối Nông sản Thủ Đức",
            branches: [
                { name: "Vựa trái cây Thanh Bình - Ô B12", contactPerson: "Trần Thanh Bình", phone: "0918 234 567", address: "Khu B, Chợ đầu mối Nông sản Thủ Đức, Quốc lộ 1A, Tam Bình, TP. Thủ Đức" },
                { name: "Vựa sầu riêng Phát Đạt - Ô C05", contactPerson: "Nguyễn Văn Đạt", phone: "0919 345 678", address: "Khu C, Chợ đầu mối Nông sản Thủ Đức, Quốc lộ 1A, Tam Bình, TP. Thủ Đức" },
                { name: "Vựa sầu riêng Minh Tâm - Ô D08", contactPerson: "Trần Minh Tâm", phone: "0916 456 789", address: "Khu D, Chợ đầu mối Nông sản Thủ Đức, Tam Bình, TP. Thủ Đức" },
            ],
        },
        {
            name: "Chợ đầu mối Hóc Môn",
            branches: [
                { name: "Vựa trái cây Hóc Môn - Nhà lồng A", contactPerson: "Lê Văn Hùng", phone: "0903 567 890", address: "Chợ đầu mối Hóc Môn, Nguyễn Thị Sóc, Xuân Thới Đông, Hóc Môn, TP.HCM" },
                { name: "Vựa sầu riêng Hoàng Anh - Nhà lồng C", contactPerson: "Nguyễn Hoàng Anh", phone: "0908 678 901", address: "Chợ đầu mối Hóc Môn, Nguyễn Thị Sóc, Xuân Thới Đông, Hóc Môn, TP.HCM" },
            ],
        },
        {
            name: "Chợ đầu mối Bình Điền",
            branches: [
                { name: "Vựa trái cây Nam Bộ - Nhà lồng B", contactPerson: "Võ Văn Kiệt", phone: "0907 890 123", address: "Khu B, Chợ đầu mối Bình Điền, Nguyễn Văn Linh, P. 7, Quận 8, TP.HCM" },
                { name: "Vựa trái cây Tây Nam - Nhà lồng F", contactPerson: "Phan Văn Nam", phone: "0909 012 345", address: "Khu F, Chợ đầu mối Bình Điền, Nguyễn Văn Linh, P. 7, Quận 8, TP.HCM" },
            ],
        },
    ],
    "Chuỗi cửa hàng trái cây / Bán lẻ": [
        {
            name: "Klever Fruits",
            branches: [
                { name: "Klever Fruits Hai Bà Trưng", contactPerson: "Trịnh Diệu Linh", phone: "0988 123 789", address: "Số 18 Hai Bà Trưng, P. Bến Nghé, Quận 1, TP.HCM" },
                { name: "Klever Fruits Nguyễn Đình Chiểu", contactPerson: "Nguyễn Lan Phương", phone: "0987 234 567", address: "Số 122 Nguyễn Đình Chiểu, Phường 6, Quận 3, TP.HCM" },
            ],
        },
        {
            name: "Farmers Market",
            branches: [
                { name: "Farmers Market Hai Bà Trưng", contactPerson: "Hoàng Thu Thảo", phone: "0982 345 678", address: "Số 218 Hai Bà Trưng, Phường Tân Định, Quận 1, TP.HCM" },
                { name: "Farmers Market Phan Xích Long", contactPerson: "Đào Hồng Anh", phone: "0983 456 789", address: "Số 48 Phan Xích Long, Phường 3, Phú Nhuận, TP.HCM" },
            ],
        },
        {
            name: "Chuỗi Trái Cây Sạch Mia",
            branches: [
                { name: "Mia Fruit Lê Văn Sỹ", contactPerson: "Phan Yến Nhi", phone: "0985 678 901", address: "Số 154 Lê Văn Sỹ, Phường 14, Quận 3, TP.HCM" },
            ],
        },
    ],
    "Đại lý / Phân phối sỉ": [
        {
            name: "Đại lý Cấp 1 Tân Phú",
            branches: [
                { name: "Kho trung chuyển Tân Phú", contactPerson: "Lê Văn Thành", phone: "0915 678 910", address: "Số 32 Thoại Ngọc Hầu, P. Phú Thạnh, Tân Phú, TP.HCM" },
            ],
        },
        {
            name: "Nhà Phân Phối Nông Sản Miền Nam",
            branches: [
                { name: "Kho logistics Dĩ An", contactPerson: "Nguyễn Quốc Bảo", phone: "0917 890 123", address: "Khu phố Thống Nhất, P. Dĩ An, TP. Dĩ An, Bình Dương" },
            ],
        },
        {
            name: "Tổng kho sỉ sầu riêng Đông Nam Bộ",
            branches: [
                { name: "Kho tổng Biên Hòa", contactPerson: "Trịnh Bá Hưng", phone: "0914 333 777", address: "KCN Amata, Phường Long Bình, TP. Biên Hòa, Đồng Nai" },
            ],
        },
    ],
    "Khách hàng doanh nghiệp": [
        {
            name: "Công ty Thực phẩm & Bánh kẹo Á Châu (ABC Bakery)",
            branches: [
                { name: "Nhà máy Chế biến Tân Bình", contactPerson: "Lý Siêu Long", phone: "0908 999 888", address: "Lô II-4 Cụm CN Tân Bình, P. Tây Thạnh, Tân Phú, TP.HCM" },
            ],
        },
        {
            name: "Chuỗi Kem & Bánh Ngọt Givral",
            branches: [
                { name: "Xưởng bánh trung tâm Bình Thạnh", contactPerson: "Vũ Minh Trí", phone: "0909 111 333", address: "Số 236 Xô Viết Nghệ Tĩnh, Phường 21, Bình Thạnh, TP.HCM" },
            ],
        },
        {
            name: "Tập đoàn F&B Golden Gate",
            branches: [
                { name: "Kho thực phẩm tổng TP.HCM", contactPerson: "Lê Đức Thắng", phone: "0901 222 444", address: "KCN Tân Bình mở rộng, P. Bình Hưng Hòa, Bình Tân, TP.HCM" },
            ],
        },
    ],
};

// =========================================================================
// COMBOBOX THÔNG MINH: VỪA CHỌN TỪ GỢI Ý VỪA TỰ DO NHẬP MỚI
// =========================================================================
interface SearchableComboboxProps {
    value: string;
    onChange: (val: string) => void;
    onSelectOption: (val: string) => void;
    options: string[];
    placeholder: string;
    disabled?: boolean;
}

function SearchableCombobox({
    value,
    onChange,
    onSelectOption,
    options,
    placeholder,
    disabled = false,
}: SearchableComboboxProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filtered = useMemo(() => {
        const q = value.trim().toLowerCase();
        if (!q) return options;
        return options.filter((opt) => opt.toLowerCase().includes(q));
    }, [options, value]);

    const isExactMatch = options.some((opt) => opt.toLowerCase() === value.trim().toLowerCase());
    const showAddNew = value.trim().length > 0 && !isExactMatch;

    return (
        <div ref={containerRef} className="relative w-full">
            <div className="relative flex items-center">
                <input
                    type="text"
                    disabled={disabled}
                    value={value}
                    onChange={(e) => {
                        onChange(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white pr-16 pl-3 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none transition"
                />
                <div className="absolute right-2 flex items-center gap-1">
                    {value && (
                        <button
                            type="button"
                            onClick={() => {
                                onChange("");
                                onSelectOption("");
                            }}
                            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setIsOpen((prev) => !prev)}
                        className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180 text-emerald-600" : ""}`} />
                    </button>
                </div>
            </div>

            {isOpen && !disabled && (
                <div className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
                    {filtered.length > 0 ? (
                        filtered.map((opt) => (
                            <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                    onSelectOption(opt);
                                    setIsOpen(false);
                                }}
                                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${opt.toLowerCase() === value.trim().toLowerCase()
                                    ? "bg-emerald-50 text-emerald-800 font-bold"
                                    : "text-slate-700 hover:bg-slate-100"
                                    }`}
                            >
                                <span>{opt}</span>
                                {opt.toLowerCase() === value.trim().toLowerCase() && (
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                )}
                            </button>
                        ))
                    ) : !showAddNew ? (
                        <div className="px-3 py-2 text-center text-xs text-slate-400">
                            Không có kết quả gợi ý phù hợp
                        </div>
                    ) : null}

                    {showAddNew && (
                        <button
                            type="button"
                            onClick={() => {
                                onSelectOption(value.trim());
                                setIsOpen(false);
                            }}
                            className="flex w-full items-center gap-1.5 rounded-xl border-t border-slate-100 bg-emerald-50/70 px-3 py-2 text-left text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            <span>+ Thêm mới &quot;{value.trim()}&quot;</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

interface ProcessingShipmentsViewProps {
    initialShipments: ShipmentItemRow[];
    availableFinishedLots: AvailableFinishedLot[];
    facilityName?: string;
}

export function ProcessingShipmentsView({
    initialShipments,
    availableFinishedLots,
    facilityName = "Cơ sở Chế biến & Đóng gói Xuất khẩu",
}: ProcessingShipmentsViewProps) {
    const { toast } = useToast();
    const [shipments, setShipments] = useState<ShipmentItemRow[]>(initialShipments);
    const [availableLots, setAvailableLots] = useState<AvailableFinishedLot[]>(() =>
        availableFinishedLots.filter(
            (lot) => (!lot.status || lot.status === "READY_FOR_DISTRIBUTION") && lot.remainingWeight > 0
        )
    );
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");

    // Hydrate packaged lots from Step 3 (Chế biến & Đóng gói)
    useEffect(() => {
        try {
            const raw = localStorage.getItem("processing_packaged_lots");
            if (!raw) return;
            const packaged: any[] = JSON.parse(raw);
            if (!Array.isArray(packaged) || packaged.length === 0) return;

            setAvailableLots((prev) => {
                const existingIds = new Set(prev.map((l) => l.id));
                const existingCodes = new Set(prev.map((l) => l.lotCode));
                const newLots: AvailableFinishedLot[] = [];

                packaged.forEach((p) => {
                    if (
                        p.status === "READY_FOR_DISTRIBUTION" &&
                        Number(p.remainingWeight) > 0 &&
                        !existingIds.has(p.id) &&
                        !existingCodes.has(p.lotCode)
                    ) {
                        newLots.push({
                            id: p.id,
                            lotCode: p.lotCode,
                            productName: p.productName || "Sầu riêng tươi xuất khẩu",
                            remainingWeight: Number(p.remainingWeight || 0),
                            packaging: p.packaging || "Thùng 5-6 trái / 18kg",
                            farmName: p.farmName || "Vườn sầu riêng liên kết",
                            regionCode: p.regionCode || "MSVT-VN",
                            rawLotCode: p.rawLotCode || "TH-2026",
                            status: p.status || "READY_FOR_DISTRIBUTION",
                        });
                    }
                });

                return newLots.length > 0 ? [...newLots, ...prev] : prev;
            });
        } catch { }
    }, []);

    // Modal Create Shipment
    const [openCreateModal, setOpenCreateModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Modal View QR Code
    const [viewQrShipment, setViewQrShipment] = useState<ShipmentItemRow | null>(null);
    const [copied, setCopied] = useState(false);

    // Form fields
    const [shipmentType, setShipmentType] = useState<"EXPORT" | "DOMESTIC">("EXPORT");
    const [shipmentCode, setShipmentCode] = useState("");
    const [selectedFinishedLotId, setSelectedFinishedLotId] = useState("");
    const [productName, setProductName] = useState("");
    const [weightInput, setWeightInput] = useState<number | string>("");
    const [boxCountInput, setBoxCountInput] = useState<number | string>("");

    // Transport & Shipping fields - ALL EMPTY by default
    const [truckPlate, setTruckPlate] = useState("");
    const [containerNumber, setContainerNumber] = useState("");
    const [sealNumber, setSealNumber] = useState("");
    const [carrierName, setCarrierName] = useState("");
    const [exportDate, setExportDate] = useState(new Date().toISOString().slice(0, 10));
    const [destinationCountry, setDestinationCountry] = useState("");
    const [portOfDestination, setPortOfDestination] = useState("");
    const [portOfLoading, setPortOfLoading] = useState("");
    const [exportNote, setExportNote] = useState("");

    // Domestic 3-level distribution channel states
    const [distributionChannel, setDistributionChannel] = useState("");
    const [partnerSystem, setPartnerSystem] = useState("");
    const [partnerBranch, setPartnerBranch] = useState("");
    const [contactPerson, setContactPerson] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [deliveryAddress, setDeliveryAddress] = useState("");
    const [transportMethod, setTransportMethod] = useState("");
    const [driverName, setDriverName] = useState("");

    // Level 2 options: Systems under chosen channel
    const availablePartnerSystems = useMemo(() => {
        if (!distributionChannel) return [];
        const presets = DISTRIBUTION_PRESETS[distributionChannel] || [];
        return presets.map((p) => p.name);
    }, [distributionChannel]);

    // Level 3 options: Branches under chosen system (or all branches under chosen channel)
    const availableBranches = useMemo(() => {
        if (!distributionChannel) return [];
        const systems = DISTRIBUTION_PRESETS[distributionChannel] || [];
        if (partnerSystem) {
            const matchedSys = systems.find(
                (s) => s.name.toLowerCase() === partnerSystem.trim().toLowerCase()
            );
            if (matchedSys) return matchedSys.branches;
        }
        return systems.flatMap((s) => s.branches);
    }, [distributionChannel, partnerSystem]);

    const availableBranchNames = useMemo(() => {
        return availableBranches.map((b) => b.name);
    }, [availableBranches]);

    // Selected lot details for live preview - ONLY when user explicitly selects a lot
    const selectedLot = useMemo(() => {
        if (!selectedFinishedLotId) return null;
        return availableLots.find((l) => l.id === selectedFinishedLotId) || null;
    }, [availableLots, selectedFinishedLotId]);

    // Validation for live QR generation
    const isFormReadyForQr = useMemo(() => {
        const hasLot = Boolean(selectedFinishedLotId && selectedLot);
        const hasWeight = Number(weightInput) > 0;
        if (!hasLot || !hasWeight) return false;

        if (shipmentType === "EXPORT") {
            const hasDestination = Boolean(portOfDestination.trim() || destinationCountry.trim() || containerNumber.trim());
            return hasDestination;
        } else {
            const hasReceiver = Boolean(partnerBranch.trim() || customerName.trim() || partnerSystem.trim() || deliveryAddress.trim() || distributionChannel.trim());
            return hasReceiver;
        }
    }, [
        selectedFinishedLotId,
        selectedLot,
        weightInput,
        shipmentType,
        portOfDestination,
        destinationCountry,
        containerNumber,
        partnerBranch,
        customerName,
        partnerSystem,
        deliveryAddress,
        distributionChannel,
    ]);

    // Encode real-time form data into URL query param so ANY scanner gets 100% exact data
    const previewPayload = useMemo(() => {
        if (!selectedLot || !shipmentCode) return "";
        const payload: Partial<PreviewTraceData> = {
            shipmentCode,
            shipmentType,
            productName: productName.trim() || selectedLot.productName,
            lotCode: selectedLot.lotCode,
            weight: Number(weightInput) || 0,
            boxCount: Number(boxCountInput) || undefined,
            destinationCountry: shipmentType === "EXPORT" ? (destinationCountry || "Trung Quốc") : "Việt Nam",
            portOfDestination: shipmentType === "EXPORT" ? portOfDestination : undefined,
            portOfLoading: shipmentType === "EXPORT" ? portOfLoading : undefined,
            containerNumber: shipmentType === "EXPORT" ? containerNumber : undefined,
            sealNumber: shipmentType === "EXPORT" ? sealNumber : undefined,
            truckPlate: truckPlate || undefined,
            carrierName: shipmentType === "EXPORT" ? carrierName : transportMethod,
            distributionChannel: shipmentType === "DOMESTIC" ? distributionChannel : undefined,
            partnerSystem: shipmentType === "DOMESTIC" ? partnerSystem : undefined,
            partnerBranch: shipmentType === "DOMESTIC" ? partnerBranch : undefined,
            customerName: shipmentType === "DOMESTIC" ? (partnerBranch || customerName || partnerSystem) : undefined,
            contactPerson: shipmentType === "DOMESTIC" ? contactPerson : undefined,
            customerPhone: shipmentType === "DOMESTIC" ? customerPhone : undefined,
            deliveryAddress: shipmentType === "DOMESTIC" ? deliveryAddress : undefined,
            transportMethod: shipmentType === "DOMESTIC" ? transportMethod : undefined,
            driverName: shipmentType === "DOMESTIC" ? driverName : undefined,
            farmName: selectedLot.farmName,
            regionCode: selectedLot.regionCode,
            rawLotCode: selectedLot.rawLotCode,
            facilityName,
            updatedAt: Date.now(),
        };
        return encodePreviewPayload(payload);
    }, [
        selectedLot,
        shipmentCode,
        shipmentType,
        productName,
        weightInput,
        boxCountInput,
        destinationCountry,
        portOfDestination,
        portOfLoading,
        containerNumber,
        sealNumber,
        truckPlate,
        carrierName,
        distributionChannel,
        partnerSystem,
        partnerBranch,
        customerName,
        contactPerson,
        customerPhone,
        deliveryAddress,
        transportMethod,
        driverName,
        facilityName,
    ]);

    // Live Trace URL with embedded real-time preview data
    const liveTraceUrl = useMemo(() => {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const code = encodeURIComponent(shipmentCode || "EXP");
        if (previewPayload) {
            return `${origin}/trace/${code}?p=${encodeURIComponent(previewPayload)}`;
        }
        return `${origin}/trace/${code}`;
    }, [shipmentCode, previewPayload]);

    const liveQrImage = useMemo(() => {
        return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(liveTraceUrl)}`;
    }, [liveTraceUrl]);

    // Live background sync to Preview Store so QR can be scanned immediately
    useEffect(() => {
        if (!isFormReadyForQr || !shipmentCode) return;
        const timer = setTimeout(() => {
            fetch("/api/trace/preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    shipmentCode,
                    shipmentType,
                    productName: productName || selectedLot?.productName || "Sầu riêng tươi xuất khẩu",
                    lotCode: selectedLot?.lotCode,
                    weight: Number(weightInput) || 0,
                    boxCount: Number(boxCountInput) || undefined,
                    destinationCountry: shipmentType === "EXPORT" ? (destinationCountry || "Trung Quốc") : "Việt Nam",
                    portOfDestination: shipmentType === "EXPORT" ? (portOfDestination || "Côn Minh, Vân Nam") : (deliveryAddress || "Nội địa Việt Nam"),
                    portOfLoading: shipmentType === "EXPORT" ? portOfLoading : undefined,
                    containerNumber: shipmentType === "EXPORT" ? containerNumber : undefined,
                    sealNumber: shipmentType === "EXPORT" ? sealNumber : undefined,
                    truckPlate: truckPlate || undefined,
                    carrierName: shipmentType === "EXPORT" ? carrierName : transportMethod,
                    distributionChannel: shipmentType === "DOMESTIC" ? distributionChannel : undefined,
                    partnerSystem: shipmentType === "DOMESTIC" ? partnerSystem : undefined,
                    partnerBranch: shipmentType === "DOMESTIC" ? partnerBranch : undefined,
                    customerName: shipmentType === "DOMESTIC" ? (partnerBranch || customerName || partnerSystem) : undefined,
                    contactPerson: shipmentType === "DOMESTIC" ? contactPerson : undefined,
                    customerPhone: shipmentType === "DOMESTIC" ? customerPhone : undefined,
                    deliveryAddress: shipmentType === "DOMESTIC" ? deliveryAddress : undefined,
                    transportMethod: shipmentType === "DOMESTIC" ? transportMethod : undefined,
                    driverName: shipmentType === "DOMESTIC" ? driverName : undefined,
                    farmName: selectedLot?.farmName,
                    regionCode: selectedLot?.regionCode,
                    rawLotCode: selectedLot?.rawLotCode,
                    facilityName,
                }),
            }).catch(() => { });
        }, 300);
        return () => clearTimeout(timer);
    }, [
        isFormReadyForQr,
        shipmentCode,
        shipmentType,
        productName,
        selectedLot,
        weightInput,
        boxCountInput,
        destinationCountry,
        portOfDestination,
        portOfLoading,
        containerNumber,
        sealNumber,
        truckPlate,
        carrierName,
        distributionChannel,
        partnerSystem,
        partnerBranch,
        customerName,
        contactPerson,
        customerPhone,
        deliveryAddress,
        transportMethod,
        driverName,
        facilityName,
    ]);

    // KPIs
    const kpis = useMemo(() => {
        const readyCount = shipments.filter((s) => s.status === "READY" || s.hasQrCode).length;
        const dispatchedCount = shipments.filter((s) => s.status === "DISPATCHED").length;
        const totalWeightMonth = shipments.reduce((sum, s) => sum + (s.weight || 0), 0);
        return { readyCount, dispatchedCount, totalWeightMonth };
    }, [shipments]);

    const filteredShipments = useMemo(() => {
        return shipments.filter((s) => {
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchCode = s.shipmentCode.toLowerCase().includes(q);
                const matchProduct = s.productName.toLowerCase().includes(q);
                const matchContainer = s.containerNumber?.toLowerCase().includes(q);
                const matchSeal = s.sealNumber?.toLowerCase().includes(q);
                const matchTruck = s.truckPlate?.toLowerCase().includes(q);
                const matchCustomer = s.customerName?.toLowerCase().includes(q);
                const matchDest = s.portOfDestination?.toLowerCase().includes(q) || s.destinationCountry?.toLowerCase().includes(q);
                if (!matchCode && !matchProduct && !matchContainer && !matchSeal && !matchTruck && !matchCustomer && !matchDest) return false;
            }
            if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
            return true;
        });
    }, [shipments, searchQuery, statusFilter]);

    const handleOpenCreateModal = () => {
        const todayStr = new Date().toISOString().slice(0, 10).replaceAll("-", "");
        const rand = Math.floor(100 + Math.random() * 900);
        setShipmentType("EXPORT");
        setShipmentCode(`EXP-${todayStr}-${rand}`);
        // Do NOT pre-select or pre-fill any transportation or export data
        setSelectedFinishedLotId("");
        setProductName("");
        setWeightInput("");
        setBoxCountInput("");
        setTruckPlate("");
        setContainerNumber("");
        setSealNumber("");
        setCarrierName("");
        setExportDate(new Date().toISOString().slice(0, 10));
        setDestinationCountry("");
        setPortOfDestination("");
        setPortOfLoading("");
        setExportNote("");
        setDistributionChannel("");
        setPartnerSystem("");
        setPartnerBranch("");
        setContactPerson("");
        setCustomerName("");
        setCustomerPhone("");
        setDeliveryAddress("");
        setTransportMethod("");
        setDriverName("");
        setOpenCreateModal(true);
    };

    const handleCreateShipment = async () => {
        const w = Number(weightInput);
        if (!selectedFinishedLotId || !selectedLot) {
            toast({ title: "Chưa chọn lô thành phẩm", description: "Vui lòng chọn một lô thành phẩm từ kho để liên kết nguồn gốc.", variant: "destructive" });
            return;
        }
        if (!w || w <= 0) {
            toast({ title: "Khối lượng không hợp lệ", description: "Vui lòng nhập khối lượng lô xuất.", variant: "destructive" });
            return;
        }
        if (w > selectedLot.remainingWeight) {
            toast({
                title: "Vượt quá khối lượng khả dụng",
                description: `Khối lượng xuất (${w.toLocaleString("vi-VN")} kg) vượt quá tồn kho khả dụng (${selectedLot.remainingWeight.toLocaleString("vi-VN")} kg).`,
                variant: "destructive",
            });
            return;
        }

        if (shipmentType === "EXPORT") {
            if (!destinationCountry.trim() && !portOfDestination.trim()) {
                toast({ title: "Thiếu điểm đến", description: "Vui lòng nhập Quốc gia nhập khẩu hoặc Điểm đến xuất khẩu.", variant: "destructive" });
                return;
            }
        } else {
            if (!distributionChannel.trim()) {
                toast({ title: "Thiếu kênh phân phối", description: "Vui lòng chọn Kênh phân phối cho lô hàng.", variant: "destructive" });
                return;
            }
            if (!partnerSystem.trim() && !partnerBranch.trim() && !customerName.trim()) {
                toast({ title: "Thiếu thông tin đối tác nhận hàng", description: "Vui lòng chọn hoặc nhập Hệ thống / Đối tác và Đơn vị nhận hàng.", variant: "destructive" });
                return;
            }
        }

        setSubmitting(true);
        try {
            const payload: any = {
                shipmentCode,
                finishedProductLotId: selectedFinishedLotId,
                productName: productName.trim() || selectedLot.productName,
                shipmentType,
                weight: w,
                boxCount: Number(boxCountInput) || undefined,
                truckPlate: truckPlate.trim() || undefined,
                exportDate,
                status: "DISPATCHED",
                note: exportNote.trim() || undefined,
            };

            if (shipmentType === "EXPORT") {
                payload.destinationCountry = destinationCountry.trim() || "Trung Quốc";
                payload.portOfDestination = portOfDestination.trim() || undefined;
                payload.portOfLoading = portOfLoading.trim() || undefined;
                payload.containerNumber = containerNumber.trim() || undefined;
                payload.sealNumber = sealNumber.trim() || undefined;
                payload.carrierName = carrierName.trim() || undefined;
            } else {
                payload.destinationCountry = "Việt Nam";
                payload.distributionChannel = distributionChannel.trim() || undefined;
                payload.partnerSystem = partnerSystem.trim() || undefined;
                payload.partnerBranch = partnerBranch.trim() || undefined;
                payload.contactPerson = contactPerson.trim() || undefined;
                payload.customerName = (partnerBranch.trim() || customerName.trim() || partnerSystem.trim()) || undefined;
                payload.customerPhone = customerPhone.trim() || undefined;
                payload.deliveryAddress = deliveryAddress.trim() || undefined;
                payload.transportMethod = transportMethod.trim() || undefined;
                payload.driverName = driverName.trim() || undefined;
                payload.carrierName = carrierName.trim() || undefined;
            }

            const res = await fetch("/api/processing/shipments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            const created = data?.data?.shipment;
            const token = data?.data?.traceCode?.publicToken || `TRC-${shipmentCode}`;

            const newRow: ShipmentItemRow = {
                id: created?.id || `ship-${Date.now()}`,
                shipmentCode: created?.shipmentCode || shipmentCode,
                productName: productName || selectedLot.productName,
                shipmentType,
                containerNumber: shipmentType === "EXPORT" ? containerNumber : undefined,
                sealNumber: shipmentType === "EXPORT" ? sealNumber : undefined,
                truckPlate,
                carrierName: shipmentType === "EXPORT" ? carrierName : transportMethod,
                weight: w,
                boxCount: Number(boxCountInput) || undefined,
                destinationCountry: shipmentType === "EXPORT" ? (destinationCountry || "Trung Quốc") : "Việt Nam",
                portOfDestination: shipmentType === "EXPORT" ? portOfDestination : deliveryAddress,
                portOfLoading: shipmentType === "EXPORT" ? portOfLoading : undefined,
                distributionChannel,
                partnerSystem,
                partnerBranch,
                contactPerson,
                customerName: partnerBranch || customerName || partnerSystem,
                customerPhone,
                deliveryAddress,
                transportMethod,
                driverName,
                dispatchDate: exportDate,
                status: "DISPATCHED",
                hasQrCode: true,
                qrPublicToken: token,
                farmName: selectedLot.farmName || "Vườn sầu riêng liên kết",
                regionCode: selectedLot.regionCode || "MSVT-VN-DL",
                rawLotCode: selectedLot.rawLotCode || "NVL-001",
                facilityName,
            };

            setShipments((prev) => [newRow, ...prev]);
            toast({
                title: "Tạo lô & Phát hành QR thành công",
                description: `Lô xuất hàng ${shipmentCode} (${shipmentType === "EXPORT" ? "Xuất khẩu" : "Nội địa"}) đã được kích hoạt mã QR truy xuất.`,
                variant: "success",
            });
            setOpenCreateModal(false);
        } catch (err: any) {
            toast({ title: "Lỗi", description: err.message || "Có lỗi xảy ra khi tạo lô.", variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    const handleCopyLink = (url: string) => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        toast({ title: "Đã sao chép link", description: "Link truy xuất đã được lưu vào clipboard.", variant: "success" });
        setTimeout(() => setCopied(false), 2000);
    };

    const handlePrintQr = (s: ShipmentItemRow) => {
        setViewQrShipment(s);
        setTimeout(() => {
            window.print();
        }, 300);
    };

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span>Cơ sở chế biến</span>
                <span>/</span>
                <span className="text-emerald-700 font-bold">Xuất hàng</span>
            </nav>

            {/* Header + Actions */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Xuất hàng</h1>
                        <p className="mt-1 text-xs sm:text-sm text-slate-500">
                            Quản lý hồ sơ xuất khẩu, liên kết phương tiện vận chuyển, container/seal và phát hành tem QR truy xuất nguồn gốc toàn chuỗi.
                        </p>
                    </div>
                    <Button
                        onClick={handleOpenCreateModal}
                        className="h-11 rounded-2xl bg-emerald-600 px-5 text-xs font-black text-white hover:bg-emerald-700 shadow-soft"
                    >
                        <Plus className="mr-1.5 h-4 w-4" />
                        Tạo lô xuất hàng
                    </Button>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                        <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                            <QrCode className="h-4 w-4 shrink-0" />
                            <span>Đã phát hành QR</span>
                        </div>
                        <p className="mt-2 text-2xl font-black text-emerald-900">{kpis.readyCount}</p>
                    </div>

                    <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
                        <div className="flex items-center gap-2 text-sky-700 text-xs font-bold uppercase tracking-wider">
                            <Truck className="h-4 w-4 shrink-0" />
                            <span>Lô đã xuất cảng</span>
                        </div>
                        <p className="mt-2 text-2xl font-black text-sky-900">{kpis.dispatchedCount}</p>
                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-emerald-600 text-white p-4 shadow-soft">
                        <div className="flex items-center gap-2 text-emerald-100 text-xs font-bold uppercase tracking-wider">
                            <Boxes className="h-4 w-4 shrink-0" />
                            <span>Tổng khối lượng xuất</span>
                        </div>
                        <p className="mt-2 text-2xl font-black text-white">
                            {(kpis.totalWeightMonth / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tấn
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Tìm mã lô xuất / Container / Seal / Biển số xe..."
                            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-xs font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none"
                        />
                    </div>
                    <div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none"
                        >
                            <option value="ALL">Tất cả trạng thái</option>
                            <option value="DISPATCHED">Đã xuất hàng (Có QR)</option>
                            <option value="READY">Sẵn sàng xuất</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* BẢNG CHÍNH: Mã lô xuất | Sản phẩm | Khối lượng | Số thùng | Container | Seal | Ngày xuất | Trạng thái QR | Thao tác */}
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-600">
                            <tr>
                                <th className="px-5 py-4 whitespace-nowrap">Mã lô xuất</th>
                                <th className="px-5 py-4 whitespace-nowrap">Sản phẩm & Điểm đến</th>
                                <th className="px-5 py-4 whitespace-nowrap text-right">Khối lượng</th>
                                <th className="px-5 py-4 text-center whitespace-nowrap">Số thùng</th>
                                <th className="px-5 py-4 whitespace-nowrap">Container / Xe</th>
                                <th className="px-5 py-4 whitespace-nowrap">Seal / ĐVVC</th>
                                <th className="px-5 py-4 whitespace-nowrap">Ngày xuất</th>
                                <th className="px-5 py-4 text-center whitespace-nowrap">Trạng thái QR</th>
                                <th className="px-5 py-4 text-right whitespace-nowrap">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {filteredShipments.map((s) => {
                                const token = s.qrPublicToken || s.shipmentCode;
                                const traceUrl = `/trace/${encodeURIComponent(token)}`;
                                const isDomestic = s.shipmentType === "DOMESTIC" || s.shipmentCode.startsWith("DOM-");

                                return (
                                    <tr key={s.id} className="h-14 hover:bg-slate-50/70 transition">
                                        {/* Mã lô xuất */}
                                        <td className="px-5 py-3 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-mono font-bold text-slate-900 text-xs">{s.shipmentCode}</span>
                                                {isDomestic ? (
                                                    <span className="rounded-md bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 text-[9px] font-black text-emerald-800">
                                                        Nội địa
                                                    </span>
                                                ) : (
                                                    <span className="rounded-md bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 text-[9px] font-black text-indigo-800">
                                                        Xuất khẩu
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Sản phẩm & Điểm đến */}
                                        <td className="px-5 py-3 whitespace-nowrap">
                                            <p className="font-bold text-slate-800 text-xs sm:text-sm">{s.productName}</p>
                                            <p className="text-[11px] text-slate-500">
                                                {isDomestic
                                                    ? `${s.customerName ? `${s.customerName} · ` : ""}${s.deliveryAddress || "Giao nội địa"}`
                                                    : (s.portOfDestination || s.destinationCountry || "Thị trường xuất khẩu")}
                                            </p>
                                        </td>

                                        {/* Khối lượng */}
                                        <td className="px-5 py-3 whitespace-nowrap text-right font-black text-slate-900 text-xs sm:text-sm">
                                            {s.weight >= 1000 ? `${(s.weight / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tấn` : `${s.weight.toLocaleString("vi-VN")} kg`}
                                        </td>

                                        {/* Số thùng */}
                                        <td className="px-5 py-3 text-center whitespace-nowrap font-bold text-slate-700 text-xs">
                                            {s.boxCount ? `${s.boxCount.toLocaleString("vi-VN")}` : "—"}
                                        </td>

                                        {/* Container / Xe */}
                                        <td className="px-5 py-3 whitespace-nowrap font-mono text-xs text-slate-700">
                                            {s.containerNumber ? (
                                                <span className="font-bold text-indigo-900">{s.containerNumber}</span>
                                            ) : (
                                                <span>{s.truckPlate || "—"}</span>
                                            )}
                                        </td>

                                        {/* Seal / ĐVVC */}
                                        <td className="px-5 py-3 whitespace-nowrap text-xs text-slate-600">
                                            {s.sealNumber ? (
                                                <span className="font-mono text-xs">{s.sealNumber}</span>
                                            ) : (
                                                <span>{s.carrierName || "Nội bộ"}</span>
                                            )}
                                        </td>

                                        {/* Ngày xuất */}
                                        <td className="px-5 py-3 whitespace-nowrap text-xs text-slate-600">
                                            {s.dispatchDate ? new Date(s.dispatchDate).toLocaleDateString("vi-VN") : "—"}
                                        </td>

                                        {/* Trạng thái QR */}
                                        <td className="px-5 py-3 text-center whitespace-nowrap">
                                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                Đã phát hành
                                            </span>
                                        </td>

                                        {/* Thao tác: Xem QR | In QR | Xem truy xuất */}
                                        <td className="px-5 py-3 text-right whitespace-nowrap">
                                            <div className="inline-flex items-center gap-1">
                                                <Button
                                                    size="sm"
                                                    onClick={() => setViewQrShipment(s)}
                                                    className="h-8 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 shadow-soft"
                                                >
                                                    <QrCode className="mr-1 h-3.5 w-3.5" />
                                                    Xem QR
                                                </Button>

                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handlePrintQr(s)}
                                                    className="h-8 rounded-xl border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                                >
                                                    <Printer className="mr-1 h-3.5 w-3.5" />
                                                    In QR
                                                </Button>

                                                <a
                                                    href={traceUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex h-8 items-center justify-center rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                                >
                                                    <ExternalLink className="mr-1 h-3.5 w-3.5" />
                                                    Xem truy xuất
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}

                            {filteredShipments.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="py-12 text-center text-xs text-slate-400">
                                        Chưa có dữ liệu lô xuất hàng nào. Bấm <b>"Tạo lô xuất hàng"</b> để bắt đầu xuất lô và phát hành QR.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL 1: TẠO LÔ XUẤT HÀNG (PORTAL TO BODY - FULL VIEWPORT OVERLAY) */}
            {openCreateModal && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[9999] w-screen h-screen flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
                        <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-150">
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                                        {shipmentType === "EXPORT" ? "Hồ sơ xuất khẩu" : "Hồ sơ xuất bán nội địa"}
                                    </span>
                                    <h2 className="text-xl font-black text-slate-900">TẠO LÔ XUẤT HÀNG & PHÁT HÀNH QR</h2>
                                </div>
                                <button type="button" onClick={() => setOpenCreateModal(false)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="overflow-y-auto p-5 sm:p-6 space-y-5">
                                {/* LỰA CHỌN LOẠI HÌNH: XUẤT KHẨU HOẶC XUẤT BÁN TRONG NƯỚC */}
                                <div className="rounded-2xl border border-slate-200 bg-slate-100/70 p-1.5 flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShipmentType("EXPORT");
                                            if (shipmentCode.startsWith("DOM-")) {
                                                setShipmentCode(shipmentCode.replace("DOM-", "EXP-"));
                                            }
                                        }}
                                        className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black transition ${shipmentType === "EXPORT"
                                            ? "bg-white text-indigo-700 shadow-sm border border-slate-200"
                                            : "text-slate-600 hover:text-slate-900"
                                            }`}
                                    >
                                        <Globe className="h-4 w-4" />
                                        🚢 Xuất khẩu nước ngoài
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShipmentType("DOMESTIC");
                                            if (shipmentCode.startsWith("EXP-")) {
                                                setShipmentCode(shipmentCode.replace("EXP-", "DOM-"));
                                            }
                                        }}
                                        className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black transition ${shipmentType === "DOMESTIC"
                                            ? "bg-white text-emerald-700 shadow-sm border border-slate-200"
                                            : "text-slate-600 hover:text-slate-900"
                                            }`}
                                    >
                                        <Building2 className="h-4 w-4" />
                                        🏪 Xuất bán trong nước
                                    </button>
                                </div>

                                {/* PHẦN 1: THÔNG TIN HÀNG HÓA */}
                                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                                    <h3 className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                                        <Boxes className="h-4 w-4" />
                                        THÔNG TIN HÀNG HÓA
                                    </h3>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Mã lô xuất</label>
                                            <input
                                                type="text"
                                                value={shipmentCode}
                                                onChange={(e) => setShipmentCode(e.target.value)}
                                                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Lô thành phẩm đủ điều kiện xuất (Đã đóng gói) <span className="text-rose-500">*</span>
                                            </label>
                                            <select
                                                value={selectedFinishedLotId}
                                                onChange={(e) => {
                                                    const id = e.target.value;
                                                    setSelectedFinishedLotId(id);
                                                    const found = availableLots.find((l) => l.id === id);
                                                    if (found) {
                                                        setProductName(found.productName);
                                                        setWeightInput(found.remainingWeight);
                                                        setBoxCountInput(Math.max(1, Math.round(found.remainingWeight / 18)));
                                                    } else {
                                                        setProductName("");
                                                        setWeightInput("");
                                                        setBoxCountInput("");
                                                    }
                                                }}
                                                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none"
                                            >
                                                <option value="">-- Chọn lô thành phẩm đã đóng gói để xuất hàng --</option>
                                                {availableLots.map((lot) => (
                                                    <option key={lot.id} value={lot.id}>
                                                        {lot.lotCode} — {lot.productName} ({lot.remainingWeight.toLocaleString("vi-VN")} kg · Đã đóng gói) {lot.farmName ? `· ${lot.farmName}` : ""}
                                                    </option>
                                                ))}
                                                {availableLots.length === 0 && (
                                                    <option value="" disabled>Chưa có lô hàng nào ở trạng thái "Đã đóng gói"</option>
                                                )}
                                            </select>
                                            <p className="mt-1 text-[10px] text-slate-400 italic">
                                                * Quy định: Chỉ những lô hàng ở trạng thái "Đã đóng gói" mới có dữ liệu tại trang Xuất hàng.
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                {shipmentType === "EXPORT" ? "Tên sản phẩm xuất khẩu" : "Tên sản phẩm xuất bán"}
                                            </label>
                                            <input
                                                type="text"
                                                value={productName}
                                                onChange={(e) => setProductName(e.target.value)}
                                                placeholder={selectedLot ? selectedLot.productName : "Chọn lô thành phẩm để lấy tên sản phẩm..."}
                                                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-emerald-500 focus:outline-none"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">Khối lượng xuất (kg) <span className="text-rose-500">*</span></label>
                                                <input
                                                    type="number"
                                                    value={weightInput}
                                                    onChange={(e) => {
                                                        setWeightInput(e.target.value);
                                                        const w = Number(e.target.value);
                                                        if (w > 0) setBoxCountInput(Math.max(1, Math.round(w / 18)));
                                                    }}
                                                    placeholder={selectedLot ? String(selectedLot.remainingWeight) : "0"}
                                                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">Số thùng</label>
                                                <input
                                                    type="number"
                                                    value={boxCountInput}
                                                    onChange={(e) => setBoxCountInput(e.target.value)}
                                                    placeholder="0"
                                                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* PHẦN 2: THÔNG TIN VẬN CHUYỂN (TÙY THEO XUẤT KHẨU HAY NỘI ĐỊA) */}
                                {shipmentType === "EXPORT" ? (
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                                        <h3 className="text-xs font-black uppercase tracking-wider text-sky-800 flex items-center gap-1.5">
                                            <Truck className="h-4 w-4" />
                                            PHƯƠNG TIỆN VẬN CHUYỂN & CONTAINER (XUẤT KHẨU)
                                        </h3>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">Biển số xe đầu kéo / xe tải</label>
                                                <input
                                                    type="text"
                                                    value={truckPlate}
                                                    onChange={(e) => setTruckPlate(e.target.value)}
                                                    placeholder="Ví dụ: 51D-999.88"
                                                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs font-semibold text-slate-900 focus:border-sky-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">Số container</label>
                                                <input
                                                    type="text"
                                                    value={containerNumber}
                                                    onChange={(e) => setContainerNumber(e.target.value)}
                                                    placeholder="Ví dụ: TEMU-882910-2"
                                                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs font-bold text-slate-900 focus:border-sky-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">Số chì / Seal niêm phong</label>
                                                <input
                                                    type="text"
                                                    value={sealNumber}
                                                    onChange={(e) => setSealNumber(e.target.value)}
                                                    placeholder="Ví dụ: SL-VN-88219"
                                                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs font-bold text-slate-900 focus:border-sky-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">Đơn vị vận chuyển quốc tế</label>
                                                <input
                                                    type="text"
                                                    value={carrierName}
                                                    onChange={(e) => setCarrierName(e.target.value)}
                                                    placeholder="Ví dụ: Công ty Vận tải Á Châu"
                                                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-sky-500 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3.5">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                                                <Building2 className="h-4 w-4" />
                                                THÔNG TIN ĐỐI TÁC & PHÂN PHỐI NỘI ĐỊA
                                            </h3>
                                            <span className="text-[10px] text-slate-500 font-medium">
                                                * Chọn từ danh mục gợi ý hoặc gõ tự do
                                            </span>
                                        </div>

                                        {/* 3 CẤP PHÂN PHỐI NỘI ĐỊA */}
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                            {/* CẤP 1: KÊNH PHÂN PHỐI (DROPDOWN CHUẨN) */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                                    Kênh phân phối <span className="text-rose-500">*</span>
                                                </label>
                                                <select
                                                    value={distributionChannel}
                                                    onChange={(e) => {
                                                        const ch = e.target.value;
                                                        setDistributionChannel(ch);
                                                        setPartnerSystem("");
                                                        setPartnerBranch("");
                                                    }}
                                                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                                                >
                                                    <option value="">-- Chọn kênh phân phối --</option>
                                                    {DISTRIBUTION_CHANNELS.map((ch) => (
                                                        <option key={ch} value={ch}>
                                                            {ch}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* CẤP 2: HỆ THỐNG / ĐỐI TÁC (COMBOBOX CHỌN & NHẬP) - XUẤT HIỆN KHI ĐÃ CHỌN KÊNH PHÂN PHỐI */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                                    Hệ thống / Đối tác <span className="text-rose-500">*</span>
                                                </label>
                                                {distributionChannel ? (
                                                    <SearchableCombobox
                                                        value={partnerSystem}
                                                        onChange={(val) => {
                                                            setPartnerSystem(val);
                                                        }}
                                                        onSelectOption={(val) => {
                                                            setPartnerSystem(val);
                                                            setPartnerBranch("");
                                                        }}
                                                        options={availablePartnerSystems}
                                                        placeholder="Nhập tên hoặc chọn từ danh sách..."
                                                    />
                                                ) : (
                                                    <div className="flex h-10 w-full items-center rounded-xl border border-dashed border-slate-200 bg-slate-100/60 px-3 text-xs text-slate-400 italic">
                                                        Chọn kênh phân phối trước
                                                    </div>
                                                )}
                                            </div>

                                            {/* CẤP 3: ĐƠN VỊ / CHI NHÁNH NHẬN HÀNG (COMBOBOX CHỌN & NHẬP) */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                                    Đơn vị / Chi nhánh nhận hàng <span className="text-rose-500">*</span>
                                                </label>
                                                {distributionChannel && partnerSystem ? (
                                                    <SearchableCombobox
                                                        value={partnerBranch}
                                                        onChange={(val) => {
                                                            setPartnerBranch(val);
                                                            setCustomerName(val);
                                                        }}
                                                        onSelectOption={(val) => {
                                                            setPartnerBranch(val);
                                                            setCustomerName(val);
                                                            // Tự động điền Người liên hệ, SĐT, Địa chỉ nếu tìm thấy trong preset
                                                            const matchBranch = availableBranches.find((b) => b.name.toLowerCase() === val.toLowerCase());
                                                            if (matchBranch) {
                                                                if (matchBranch.contactPerson) setContactPerson(matchBranch.contactPerson);
                                                                if (matchBranch.phone) setCustomerPhone(matchBranch.phone);
                                                                if (matchBranch.address) setDeliveryAddress(matchBranch.address);
                                                            }
                                                        }}
                                                        options={availableBranchNames}
                                                        placeholder="Nhập hoặc chọn chi nhánh..."
                                                    />
                                                ) : (
                                                    <div className="flex h-10 w-full items-center rounded-xl border border-dashed border-slate-200 bg-slate-100/60 px-3 text-xs text-slate-400 italic">
                                                        Chọn hệ thống / đối tác trước
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* THÔNG TIN CHI TIẾT NGƯỜI NHẬN & ĐỊA ĐIỂM (TỰ ĐỘNG ĐIỀN HOẶC NHẬP TAY) */}
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-2 border-t border-slate-200/80">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                                    Người liên hệ
                                                </label>
                                                <input
                                                    type="text"
                                                    value={contactPerson}
                                                    onChange={(e) => setContactPerson(e.target.value)}
                                                    placeholder="Ví dụ: Nguyễn Văn Hùng"
                                                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                                    Số điện thoại liên hệ
                                                </label>
                                                <input
                                                    type="text"
                                                    value={customerPhone}
                                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                                    placeholder="Ví dụ: 0912 345 678"
                                                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                                    Địa chỉ giao hàng nội địa
                                                </label>
                                                <input
                                                    type="text"
                                                    value={deliveryAddress}
                                                    onChange={(e) => setDeliveryAddress(e.target.value)}
                                                    placeholder="Ví dụ: Kho trung chuyển Dĩ An, Bình Dương"
                                                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* PHẦN 3: THÔNG TIN XUẤT HÀNG HOẶC VẬN CHUYỂN NỘI ĐỊA */}
                                {shipmentType === "EXPORT" ? (
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                                        <h3 className="text-xs font-black uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
                                            <Globe className="h-4 w-4" />
                                            THÔNG TIN XUẤT HÀNG & CỬA KHẨU (XUẤT KHẨU)
                                        </h3>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">Ngày giờ xuất</label>
                                                <input
                                                    type="date"
                                                    value={exportDate}
                                                    onChange={(e) => setExportDate(e.target.value)}
                                                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">Điểm đến / Cảng đến</label>
                                                <input
                                                    type="text"
                                                    value={portOfDestination}
                                                    onChange={(e) => setPortOfDestination(e.target.value)}
                                                    placeholder="Ví dụ: Côn Minh, Vân Nam"
                                                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">Cửa khẩu / Cảng xuất</label>
                                                <input
                                                    type="text"
                                                    value={portOfLoading}
                                                    onChange={(e) => setPortOfLoading(e.target.value)}
                                                    placeholder="Ví dụ: Cửa khẩu Quốc tế Hữu Nghị"
                                                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">Quốc gia nhập khẩu</label>
                                                <input
                                                    type="text"
                                                    value={destinationCountry}
                                                    onChange={(e) => setDestinationCountry(e.target.value)}
                                                    placeholder="Ví dụ: Trung Quốc"
                                                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú xuất khẩu</label>
                                            <input
                                                type="text"
                                                value={exportNote}
                                                onChange={(e) => setExportNote(e.target.value)}
                                                placeholder="Nhập ghi chú hoặc yêu cầu kiểm dịch đặc biệt..."
                                                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs focus:border-emerald-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                                        <h3 className="text-xs font-black uppercase tracking-wider text-sky-800 flex items-center gap-1.5">
                                            <Truck className="h-4 w-4" />
                                            PHƯƠNG THỨC VẬN CHUYỂN & GIAO HÀNG (NỘI ĐỊA)
                                        </h3>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">Ngày giờ giao hàng</label>
                                                <input
                                                    type="date"
                                                    value={exportDate}
                                                    onChange={(e) => setExportDate(e.target.value)}
                                                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-sky-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">Hình thức vận chuyển</label>
                                                <select
                                                    value={transportMethod}
                                                    onChange={(e) => setTransportMethod(e.target.value)}
                                                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-sky-500 focus:outline-none"
                                                >
                                                    <option value="">-- Chọn hình thức --</option>
                                                    <option value="Xe tải lạnh nội địa">Xe tải lạnh nội địa</option>
                                                    <option value="Xe giao hàng xưởng">Xe giao hàng của xưởng</option>
                                                    <option value="Đơn vị chuyển phát">Đơn vị chuyển phát (Viettel Post, GHTK...)</option>
                                                    <option value="Khách tự nhận tại kho">Khách hàng tự nhận tại kho</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">Biển số xe vận chuyển</label>
                                                <input
                                                    type="text"
                                                    value={truckPlate}
                                                    onChange={(e) => setTruckPlate(e.target.value)}
                                                    placeholder="Ví dụ: 60C-882.19"
                                                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs font-semibold text-slate-900 focus:border-sky-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">Tài xế / Người giao</label>
                                                <input
                                                    type="text"
                                                    value={driverName}
                                                    onChange={(e) => setDriverName(e.target.value)}
                                                    placeholder="Ví dụ: Nguyễn Văn Nam"
                                                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 focus:border-sky-500 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú giao hàng nội địa</label>
                                            <input
                                                type="text"
                                                value={exportNote}
                                                onChange={(e) => setExportNote(e.target.value)}
                                                placeholder="Thời gian giao hẹn trước, lưu ý kiểm đếm khi nhận..."
                                                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs focus:border-emerald-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* PHẦN 4: KHU VỰC QR TRUY XUẤT (LIVE PREVIEW & QUÉT TRỰC TIẾP NGAY TRÊN FORM) */}
                                <div className={`rounded-2xl border-2 p-4 space-y-3 transition ${selectedLot && isFormReadyForQr ? "border-emerald-400 bg-emerald-50/40" : "border-slate-300 bg-slate-50/60"}`}>
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                                            <QrCode className="h-4 w-4 text-emerald-600" />
                                            KHU VỰC QR TRUY XUẤT NGUỒN GỐC (QUÉT & XEM TRỰC TIẾP)
                                        </h3>
                                        {selectedLot && isFormReadyForQr ? (
                                            <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                                                <CheckCircle2 className="h-3 w-3" /> Đủ thông tin · Sẵn sàng quét & phát hành
                                            </span>
                                        ) : !selectedLot ? (
                                            <span className="rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                                                Chưa chọn lô thành phẩm
                                            </span>
                                        ) : (
                                            <span className="rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                                                {shipmentType === "EXPORT" ? "Chưa đủ thông tin điểm đến / xuất khẩu" : "Chưa đủ thông tin khách hàng / địa chỉ nhận"}
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 items-center">
                                        {/* Cột trái: QR Code Live Preview & Trực tiếp quét */}
                                        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3 text-center min-h-[190px]">
                                            {selectedLot && isFormReadyForQr ? (
                                                <>
                                                    <img
                                                        src={liveQrImage}
                                                        alt={`QR Preview ${shipmentCode}`}
                                                        className="h-36 w-36 rounded-lg object-contain shadow-sm border border-slate-100"
                                                    />
                                                    <span className="mt-2 font-mono text-[11px] font-black text-slate-900">{shipmentCode}</span>

                                                    <a
                                                        href={liveTraceUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="mt-2 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 shadow-soft transition"
                                                    >
                                                        <ExternalLink className="h-3 w-3" />
                                                        Xem trước trang truy xuất
                                                    </a>
                                                </>
                                            ) : (
                                                <div className="py-4 space-y-2 text-slate-400">
                                                    <QrCode className="h-16 w-16 mx-auto opacity-30" />
                                                    <span className="block font-mono text-[11px] font-bold text-slate-400">
                                                        {shipmentCode || "EXP-..."}
                                                    </span>
                                                    <span className="block text-[10px] text-slate-400 max-w-[180px]">
                                                        Điền đầy đủ lô thành phẩm và thông tin vận chuyển để kích hoạt mã quét trực tiếp
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Cột phải: Chuỗi truy xuất liên kết */}
                                        <div className="md:col-span-2 space-y-2 text-xs">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="rounded-xl bg-white p-2.5 border border-slate-200">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                                        <Trees className="h-3 w-3 text-emerald-600" /> Farm / Vùng trồng
                                                    </p>
                                                    {selectedLot ? (
                                                        <>
                                                            <p className="font-bold text-slate-900 mt-0.5">{selectedLot.farmName || "Vườn liên kết"}</p>
                                                            <p className="text-[10px] text-emerald-700 font-semibold">{selectedLot.regionCode || "MSVT-VN-DL-0089"}</p>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <p className="font-semibold text-slate-400 mt-0.5">— (Chưa chọn lô thành phẩm)</p>
                                                            <p className="text-[10px] text-slate-400">—</p>
                                                        </>
                                                    )}
                                                </div>

                                                <div className="rounded-xl bg-white p-2.5 border border-slate-200">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                                        <Building2 className="h-3 w-3 text-emerald-600" /> Cơ sở chế biến & đóng gói
                                                    </p>
                                                    <p className="font-bold text-slate-900 mt-0.5">{facilityName}</p>
                                                    <p className="text-[10px] text-slate-500">Mã CS: CS-TV-001</p>
                                                </div>
                                            </div>

                                            <div className="rounded-xl bg-white p-2.5 border border-slate-200 space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Tóm tắt chuỗi truy xuất nguồn gốc</p>
                                                {selectedLot ? (
                                                    <>
                                                        <p className="font-medium text-slate-800">
                                                            Lô nguồn: <span className="font-mono font-bold text-slate-900">{selectedLot.lotCode}</span> ({selectedLot.productName}) · Hình thức: <span className="font-bold text-emerald-700">{shipmentType === "EXPORT" ? "Xuất khẩu nước ngoài" : "Xuất bán trong nước"}</span>
                                                        </p>
                                                        <p className="text-[11px] text-emerald-700 font-bold">
                                                            {isFormReadyForQr
                                                                ? `✅ Chuỗi truy xuất hợp lệ: ${selectedLot.farmName || "Farm"} ➔ Tiếp nhận & Phân loại ➔ Đóng gói ➔ ${shipmentType === "EXPORT" ? `Xuất khẩu (${destinationCountry || portOfDestination})` : `Xuất bán nội địa (${partnerBranch || customerName || partnerSystem || deliveryAddress})`}.`
                                                                : "⚠️ Vui lòng điền đủ khối lượng xuất và thông tin điểm đến/khách hàng."}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <p className="text-[11px] text-amber-700 font-bold">
                                                        ⚠️ Chưa liên kết nguồn gốc. Vui lòng chọn lô thành phẩm từ kho ở Phần 1 để hệ thống kết nối chuỗi dữ liệu vườn / Farm.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer: [Tạo lô & Phát hành QR] */}
                            <div className="flex gap-2 border-t border-slate-100 p-5 sm:p-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setOpenCreateModal(false)}
                                    className="flex-1 rounded-2xl h-11 text-xs font-bold border-slate-200"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleCreateShipment}
                                    disabled={submitting}
                                    className="flex-1 rounded-2xl h-11 text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 shadow-soft"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Đang xử lý & Phát hành...
                                        </>
                                    ) : (
                                        <>
                                            <QrCode className="mr-2 h-4 w-4" />
                                            TẠO LÔ XUẤT HÀNG & PHÁT HÀNH QR
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* MODAL 2: XEM & IN MÃ QR TRUY XUẤT (PORTAL TO BODY - FULL VIEWPORT OVERLAY) */}
            {viewQrShipment && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[9999] w-screen h-screen flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
                        <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-150">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                                        <QrCode className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900 text-base">TEM TRUY XUẤT NGUỒN GỐC</h3>
                                        <p className="text-xs text-slate-500 font-mono font-bold">{viewQrShipment.shipmentCode}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setViewQrShipment(null)}
                                    className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="overflow-y-auto p-5 sm:p-6 space-y-5">
                                {/* QR Section */}
                                {(() => {
                                    const token = viewQrShipment.qrPublicToken || viewQrShipment.shipmentCode;
                                    const traceUrl = typeof window !== "undefined"
                                        ? `${window.location.origin}/trace/${encodeURIComponent(token)}`
                                        : `/trace/${token}`;
                                    const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(traceUrl)}`;

                                    return (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 items-center">
                                                {/* QR Box */}
                                                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-400 bg-emerald-50/50 p-5 text-center">
                                                    <img
                                                        src={qrImg}
                                                        alt={`QR Code ${viewQrShipment.shipmentCode}`}
                                                        className="h-44 w-44 rounded-xl object-contain shadow-soft"
                                                    />
                                                    <p className="mt-3 font-mono font-black text-sm text-slate-900">{viewQrShipment.shipmentCode}</p>
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 mt-1">
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                        Đang hoạt động · Sẵn sàng quét
                                                    </span>
                                                </div>

                                                {/* Detailed Info */}
                                                <div className="space-y-2.5 text-xs">
                                                    <div className="rounded-xl bg-slate-50 p-3 space-y-1">
                                                        <span className="text-[10px] font-bold uppercase text-slate-400">Sản phẩm xuất hàng</span>
                                                        <p className="font-bold text-slate-900 text-sm">{viewQrShipment.productName}</p>
                                                        <p className="font-black text-emerald-700">
                                                            {viewQrShipment.weight >= 1000
                                                                ? `${(viewQrShipment.weight / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tấn (${viewQrShipment.weight.toLocaleString("vi-VN")} kg)`
                                                                : `${viewQrShipment.weight.toLocaleString("vi-VN")} kg`}
                                                            {viewQrShipment.boxCount ? ` · ${viewQrShipment.boxCount.toLocaleString("vi-VN")} thùng` : ""}
                                                        </p>
                                                    </div>

                                                    <div className="rounded-xl bg-slate-50 p-3 space-y-1">
                                                        <span className="text-[10px] font-bold uppercase text-slate-400">Farm / Vùng trồng nguồn</span>
                                                        <p className="font-bold text-slate-900">{viewQrShipment.farmName || "Vườn sầu riêng liên kết"}</p>
                                                        <p className="text-[11px] text-slate-500 font-mono">MSVT: {viewQrShipment.regionCode || "VN-DL-0089"}</p>
                                                    </div>

                                                    <div className="rounded-xl bg-slate-50 p-3 space-y-1">
                                                        <span className="text-[10px] font-bold uppercase text-slate-400">
                                                            {viewQrShipment.shipmentType === "DOMESTIC" || viewQrShipment.shipmentCode.startsWith("DOM-") ? "Giao nhận nội địa" : "Vận chuyển & Cửa khẩu"}
                                                        </span>
                                                        {viewQrShipment.shipmentType === "DOMESTIC" || viewQrShipment.shipmentCode.startsWith("DOM-") ? (
                                                            <>
                                                                <p className="font-bold text-slate-900">{viewQrShipment.partnerBranch || viewQrShipment.customerName || "Khách hàng nội địa"}</p>
                                                                {viewQrShipment.partnerSystem && (
                                                                    <p className="text-[11px] font-semibold text-emerald-700">
                                                                        Hệ thống: {viewQrShipment.partnerSystem} {viewQrShipment.distributionChannel ? `· ${viewQrShipment.distributionChannel}` : ""}
                                                                    </p>
                                                                )}
                                                                <p className="text-slate-800">
                                                                    Địa chỉ: <span className="font-semibold text-slate-900">{viewQrShipment.deliveryAddress || "Nội địa"}</span>
                                                                </p>
                                                                {viewQrShipment.contactPerson && (
                                                                    <p className="text-slate-700">
                                                                        Người liên hệ: <span className="font-semibold">{viewQrShipment.contactPerson}</span> {viewQrShipment.customerPhone ? `(${viewQrShipment.customerPhone})` : ""}
                                                                    </p>
                                                                )}
                                                                <p className="text-[11px] text-slate-500">
                                                                    Xe: <span className="font-mono font-bold text-slate-900">{viewQrShipment.truckPlate || "—"}</span> {viewQrShipment.driverName ? `· Tài xế: ${viewQrShipment.driverName}` : ""} {viewQrShipment.carrierName ? `· ${viewQrShipment.carrierName}` : ""}
                                                                </p>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <p className="text-slate-800">
                                                                    Container: <span className="font-mono font-bold text-slate-900">{viewQrShipment.containerNumber || "—"}</span> · Seal: <span className="font-mono font-bold text-slate-900">{viewQrShipment.sealNumber || "—"}</span>
                                                                </p>
                                                                <p className="text-slate-800">
                                                                    Xe: <span className="font-mono font-bold text-slate-900">{viewQrShipment.truckPlate || "—"}</span>
                                                                </p>
                                                                <p className="text-[11px] text-slate-500">
                                                                    {viewQrShipment.portOfLoading || "Cửa khẩu Hữu Nghị"} ➔ {viewQrShipment.portOfDestination || viewQrShipment.destinationCountry || "Trung Quốc"}
                                                                </p>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-2.5">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value={traceUrl}
                                                        className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 font-mono text-xs text-slate-700 focus:outline-none"
                                                    />
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleCopyLink(traceUrl)}
                                                        variant="outline"
                                                        className="h-10 rounded-xl px-3 border-slate-200 text-xs font-bold"
                                                    >
                                                        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                                                        <span className="ml-1.5">{copied ? "Đã chép" : "Sao chép"}</span>
                                                    </Button>
                                                </div>

                                                <div className="grid grid-cols-3 gap-2">
                                                    <a
                                                        href={traceUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 shadow-soft"
                                                    >
                                                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                                                        Xem trang truy xuất
                                                    </a>
                                                    <a
                                                        href={qrImg}
                                                        download={`QR-${viewQrShipment.shipmentCode}.png`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50"
                                                    >
                                                        <Download className="mr-1.5 h-3.5 w-3.5" />
                                                        Tải tem QR
                                                    </a>
                                                    <Button
                                                        onClick={() => window.print()}
                                                        variant="outline"
                                                        className="h-10 rounded-xl border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50"
                                                    >
                                                        <Printer className="mr-1.5 h-3.5 w-3.5" />
                                                        In mã QR
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Footer */}
                            <div className="border-t border-slate-100 p-4 sm:p-5 text-right">
                                <Button
                                    onClick={() => setViewQrShipment(null)}
                                    className="h-10 rounded-xl px-5 text-xs font-bold bg-slate-900 text-white hover:bg-slate-800"
                                >
                                    Đóng
                                </Button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}

