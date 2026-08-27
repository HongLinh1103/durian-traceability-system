"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
    MapPin,
    LocateFixed,
    Pencil,
    RotateCcw,
    Check,
    Maximize2,
    Minimize2,
    Layers,
    Search,
    AlertTriangle,
    CheckCircle2,
    Undo2,
    X,
    Loader2,
    PlusCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { computePolygonArea, computePolygonCentroid, compareFarmAreas, LatLngPoint } from "@/lib/geo-utils";
import "leaflet/dist/leaflet.css";

export interface FarmBoundaryMapPickerProps {
    declaredArea: number;
    declaredUnit: "HECTARE" | "SQUARE_METER";
    initialBoundary?: [number, number][] | null; // [[lng, lat], ...]
    initialCenter?: { lat: number; lng: number } | null;
    province?: string;
    district?: string;
    ward?: string;
    detailedAddress?: string;
    onBoundaryChange: (data: {
        boundary: [number, number][]; // [[lng, lat], ...] GeoJSON standard
        mappedAreaHa: number;
        mappedAreaM2: number;
        centerLat?: number;
        centerLng?: number;
    }) => void;
}

export function FarmBoundaryMapPicker({
    declaredArea,
    declaredUnit,
    initialBoundary,
    initialCenter,
    province,
    district,
    ward,
    detailedAddress,
    onBoundaryChange,
}: FarmBoundaryMapPickerProps) {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapInstanceRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const polygonLayerRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markersGroupRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userLocationMarkerRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const satelliteLayerRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const streetLayerRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const leafletRef = useRef<any>(null);
    const onBoundaryChangeRef = useRef(onBoundaryChange);

    const [isMapReady, setIsMapReady] = useState(false);
    const [points, setPoints] = useState<LatLngPoint[]>(() => {
        if (initialBoundary && initialBoundary.length >= 3) {
            return initialBoundary.map(([lng, lat]) => ({ lat, lng }));
        }
        return [];
    });

    const [isDrawing, setIsDrawing] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const isDrawingRef = useRef(isDrawing);
    const isEditingRef = useRef(isEditing);

    useEffect(() => {
        isDrawingRef.current = isDrawing;
        isEditingRef.current = isEditing;
        if (mapContainerRef.current) {
            mapContainerRef.current.style.cursor = isDrawing ? "crosshair" : "grab";
        }
    }, [isDrawing, isEditing]);

    const [isFullScreen, setIsFullScreen] = useState(false);
    const [mapLayerType, setMapLayerType] = useState<"satellite" | "streets">("satellite");
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [searchMessage, setSearchMessage] = useState<string | null>(null);

    // The parent form creates a new callback on every render. Keep the latest
    // callback without making Leaflet rebuild all geometry after a form update.
    useEffect(() => {
        onBoundaryChangeRef.current = onBoundaryChange;
    }, [onBoundaryChange]);

    // Tính diện tích và so sánh
    const mappedAreaM2 = computePolygonArea(points);
    const areaComparison = compareFarmAreas(declaredArea, declaredUnit, mappedAreaM2);

    // Initialize Leaflet Map
    useEffect(() => {
        let isMounted = true;

        async function initMap() {
            if (!mapContainerRef.current) return;
            if (mapInstanceRef.current) return;

            const L = await import("leaflet");
            leafletRef.current = L;

            if (!isMounted) return;

            // Default center: Dong Nai / South Vietnam or initialCenter
            const defaultLat = initialCenter?.lat || (points.length > 0 ? points[0].lat : 10.92341);
            const defaultLng = initialCenter?.lng || (points.length > 0 ? points[0].lng : 106.81234);

            const map = L.map(mapContainerRef.current, {
                center: [defaultLat, defaultLng],
                zoom: points.length > 0 ? 17 : 14,
                zoomControl: false,
                attributionControl: false,
            });

            // Satellite Layer (Google Hybrid Satellite)
            const satelliteLayer = L.tileLayer("https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
                maxZoom: 21,
                subdomains: ["mt0", "mt1", "mt2", "mt3"],
            });

            // Street Layer (OpenStreetMap)
            const streetLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                maxZoom: 19,
            });

            satelliteLayerRef.current = satelliteLayer;
            streetLayerRef.current = streetLayer;

            if (mapLayerType === "satellite") {
                satelliteLayer.addTo(map);
            } else {
                streetLayer.addTo(map);
            }

            // Add subtle zoom control at bottom right
            L.control.zoom({ position: "bottomright" }).addTo(map);

            const markersGroup = L.layerGroup().addTo(map);
            markersGroupRef.current = markersGroup;

            mapInstanceRef.current = map;
            setIsMapReady(true);

            // Handle Map Clicks for drawing - Allow adding multiple points continuously
            map.on("click", (e: any) => {
                if (!isDrawingRef.current) return;
                const { lat, lng } = e.latlng;
                setPoints((prev) => [
                    ...prev,
                    { lat: Number(lat.toFixed(7)), lng: Number(lng.toFixed(7)) },
                ]);
            });
        }

        void initMap();

        return () => {
            isMounted = false;
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    // Switch Layer
    useEffect(() => {
        const map = mapInstanceRef.current;
        const sat = satelliteLayerRef.current;
        const str = streetLayerRef.current;
        if (!map || !sat || !str) return;

        if (mapLayerType === "satellite") {
            if (map.hasLayer(str)) map.removeLayer(str);
            if (!map.hasLayer(sat)) map.addLayer(sat);
        } else {
            if (map.hasLayer(sat)) map.removeLayer(sat);
            if (!map.hasLayer(str)) map.addLayer(str);
        }
    }, [mapLayerType]);

    // Redraw polygon and vertices whenever `points` changes
    useEffect(() => {
        const map = mapInstanceRef.current;
        const L = leafletRef.current;
        const markersGroup = markersGroupRef.current;
        if (!map || !L || !markersGroup) return;

        // Clear markers
        markersGroup.clearLayers();

        // Clear previous polygon
        if (polygonLayerRef.current) {
            map.removeLayer(polygonLayerRef.current);
            polygonLayerRef.current = null;
        }

        if (points.length === 0) return;

        const latLngs = points.map((p) => [p.lat, p.lng]);

        // Draw Polygon / Polyline
        if (points.length >= 3) {
            const polygon = L.polygon(latLngs, {
                color: "#10b981", // Emerald green
                weight: 3,
                opacity: 0.9,
                fillColor: "#059669",
                fillOpacity: 0.35,
                dashArray: isDrawing ? "6, 6" : undefined,
            }).addTo(map);
            polygonLayerRef.current = polygon;
        } else if (points.length >= 2) {
            const polyline = L.polyline(latLngs, {
                color: "#10b981",
                weight: 3,
                dashArray: "6, 6",
            }).addTo(map);
            polygonLayerRef.current = polyline;
        }

        // Draw Vertex Markers
        points.forEach((point, idx) => {
            const isFirst = idx === 0;

            const iconHtml = `
                <div style="
                    background: ${isFirst ? "#064e3b" : "#059669"};
                    color: white;
                    border: 2px solid white;
                    border-radius: 50%;
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 11px;
                    font-weight: 900;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.35);
                    cursor: ${isEditing || isDrawing ? "grab" : "pointer"};
                ">
                    ${idx + 1}
                </div>
            `;

            const customIcon = L.divIcon({
                html: iconHtml,
                className: "custom-vertex-icon",
                iconSize: [28, 28],
                iconAnchor: [14, 14],
            });

            const marker = L.marker([point.lat, point.lng], {
                icon: customIcon,
                draggable: isEditing || isDrawing,
            });

            marker.on("dragend", (e: any) => {
                const newLatLng = e.target.getLatLng();
                setPoints((prev) => {
                    const updated = [...prev];
                    updated[idx] = {
                        lat: Number(newLatLng.lat.toFixed(7)),
                        lng: Number(newLatLng.lng.toFixed(7)),
                    };
                    return updated;
                });
            });

            // Click first point while drawing to close polygon
            marker.on("click", (e: any) => {
                if (isFirst && points.length >= 3 && isDrawingRef.current) {
                    L.DomEvent.stopPropagation(e);
                    setIsDrawing(false);
                    setIsEditing(false);
                }
            });

            marker.bindTooltip(`Góc ${idx + 1}${isFirst && points.length >= 3 && isDrawing ? " (Chạm để đóng polygon)" : " (Kéo để chỉnh)"}`, {
                direction: "top",
                offset: [0, -14],
            });

            markersGroup.addLayer(marker);
        });

        // Notify parent callback
        if (points.length >= 3) {
            const boundaryGeoJson: [number, number][] = points.map((p) => [p.lng, p.lat]);
            // Khép kín polygon theo chuẩn GeoJSON
            if (
                boundaryGeoJson.length > 0 &&
                (boundaryGeoJson[0][0] !== boundaryGeoJson[boundaryGeoJson.length - 1][0] ||
                    boundaryGeoJson[0][1] !== boundaryGeoJson[boundaryGeoJson.length - 1][1])
            ) {
                boundaryGeoJson.push([boundaryGeoJson[0][0], boundaryGeoJson[0][1]]);
            }

            const centroid = computePolygonCentroid(points);
            const areaM2 = computePolygonArea(points);

            onBoundaryChangeRef.current({
                boundary: boundaryGeoJson,
                mappedAreaM2: areaM2,
                mappedAreaHa: Number((areaM2 / 10_000).toFixed(4)),
                centerLat: centroid?.lat,
                centerLng: centroid?.lng,
            });
        }
    }, [points, isDrawing, isEditing]);

    // Handle Search Location via Nominatim
    const handleSearchLocation = async (queryText?: string) => {
        const query = queryText || searchQuery;
        if (!query.trim()) return;

        setIsSearching(true);
        setSearchMessage(null);

        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
                query + ", Việt Nam"
            )}&limit=1`;
            const res = await fetch(url);
            const data = await res.json();

            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);

                if (mapInstanceRef.current) {
                    mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 1.5 });
                }
                setSearchMessage(`Đã tìm thấy: ${data[0].display_name.split(",").slice(0, 3).join(",")}`);
            } else {
                setSearchMessage("Không tìm thấy vị trí. Bạn có thể tự di chuyển bản đồ hoặc dùng GPS.");
            }
        } catch (err) {
            console.error("Geocoding error:", err);
            setSearchMessage("Lỗi kết nối khi tìm địa chỉ.");
        } finally {
            setIsSearching(false);
        }
    };

    // Auto zoom when address fields are provided
    useEffect(() => {
        if (!isMapReady || points.length > 0) return;
        const combinedAddress = [detailedAddress, ward, district, province].filter(Boolean).join(", ");
        if (combinedAddress.trim().length > 3) {
            void handleSearchLocation(combinedAddress);
        }
    }, [province, district, ward]);

    // GPS "Vị trí của tôi"
    const handleGetMyLocation = () => {
        if (!navigator.geolocation) {
            alert("Trình duyệt không hỗ trợ GPS.");
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = Number(pos.coords.latitude.toFixed(7));
                const lng = Number(pos.coords.longitude.toFixed(7));

                const map = mapInstanceRef.current;
                const L = leafletRef.current;

                if (map && L) {
                    map.flyTo([lat, lng], 18, { duration: 1.5 });

                    if (userLocationMarkerRef.current) {
                        map.removeLayer(userLocationMarkerRef.current);
                    }

                    const pulseIcon = L.divIcon({
                        html: `
                            <div style="position: relative; width: 24px; height: 24px;">
                                <div style="position: absolute; inset: 0; background: #3b82f6; opacity: 0.3; border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                                <div style="position: absolute; inset: 4px; background: #2563eb; border: 2.5px solid white; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>
                            </div>
                        `,
                        className: "user-gps-pulse-icon",
                        iconSize: [24, 24],
                        iconAnchor: [12, 12],
                    });

                    const userMarker = L.marker([lat, lng], { icon: pulseIcon }).addTo(map);
                    userMarker.bindPopup("<b>Vị trí GPS của bạn</b><br>Bạn đang đứng tại đây.").openPopup();
                    userLocationMarkerRef.current = userMarker;
                }

                setIsLocating(false);
            },
            (err) => {
                console.error("GPS error:", err);
                setIsLocating(false);
                alert("Không thể lấy vị trí GPS. Vui lòng cấp quyền truy cập vị trí trên trình duyệt.");
            },
            { enableHighAccuracy: true, timeout: 15000 }
        );
    };

    // Toggle Drawing
    const startDrawing = () => {
        setIsDrawing(true);
        setIsEditing(true);
    };

    const finishDrawing = () => {
        setIsDrawing(false);
        setIsEditing(false);
    };

    const undoLastPoint = () => {
        setPoints((prev) => prev.slice(0, -1));
    };

    const clearPoints = () => {
        setPoints([]);
        setIsDrawing(true);
        setIsEditing(true);
    };

    // Trigger map resize when full screen toggles
    useEffect(() => {
        setTimeout(() => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.invalidateSize();
            }
        }, 300);
    }, [isFullScreen]);

    return (
        <div className="space-y-4">
            {/* Header & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-xs">
                        <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">
                            Vị Trí & Ranh Giới Vườn Trực Quan
                        </h3>
                        <p className="text-xs text-slate-500">
                            Nhấn &quot;Vẽ ranh giới vườn&quot; rồi chạm/click lần lượt vào các góc vườn để đo đạc diện tích
                        </p>
                    </div>
                </div>

                {/* Layer Selector & Fullscreen Toggle */}
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setMapLayerType(mapLayerType === "satellite" ? "streets" : "satellite")}
                        className="rounded-xl border-slate-200 text-xs font-bold gap-1.5 h-8 bg-white"
                    >
                        <Layers className="h-3.5 w-3.5 text-emerald-700" />
                        <span>{mapLayerType === "satellite" ? "Vệ tinh" : "Bản đồ"}</span>
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsFullScreen(!isFullScreen)}
                        className="rounded-xl border-slate-200 text-xs font-bold gap-1.5 h-8 bg-white"
                    >
                        {isFullScreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                        <span className="hidden sm:inline">{isFullScreen ? "Thu nhỏ" : "Toàn màn hình"}</span>
                    </Button>
                </div>
            </div>

            {/* Search Box */}
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearchLocation())}
                        placeholder="Nhập địa chỉ, ấp, xã hoặc tên khu vực để zoom nhanh..."
                        className="pl-9 pr-4 rounded-xl text-xs sm:text-sm bg-white"
                    />
                </div>
                <Button
                    type="button"
                    onClick={() => handleSearchLocation()}
                    disabled={isSearching}
                    size="sm"
                    className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs h-9 px-4 shrink-0"
                >
                    {isSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5 mr-1" />}
                    Tìm vị trí
                </Button>
                <Button
                    type="button"
                    onClick={handleGetMyLocation}
                    disabled={isLocating}
                    size="sm"
                    className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-9 px-3 shrink-0 gap-1.5 shadow-xs"
                >
                    {isLocating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">Vị trí của tôi (GPS)</span>
                    <span className="sm:hidden">GPS</span>
                </Button>
            </div>

            {searchMessage && (
                <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                    {searchMessage}
                </p>
            )}

            {/* Map Canvas Box */}
            <div
                className={`relative rounded-2xl overflow-hidden border-2 border-emerald-500/40 shadow-inner bg-slate-900 transition-all ${
                    isFullScreen
                        ? "fixed inset-0 z-[9999] rounded-none border-0 h-screen w-screen"
                        : "h-[380px] sm:h-[460px] w-full"
                }`}
            >
                <div ref={mapContainerRef} className="w-full h-full" />

                {/* Controls remain available directly on the canvas in fullscreen mode. */}
                <div className="absolute right-3 top-14 z-[1000] flex flex-col items-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsFullScreen((value) => !value)}
                        className="h-10 w-10 rounded-lg border-slate-200 bg-white text-slate-700 shadow-md hover:bg-slate-50"
                        title={isFullScreen ? "Thoát toàn màn hình" : "Xem toàn màn hình"}
                        aria-label={isFullScreen ? "Thoát toàn màn hình" : "Xem toàn màn hình"}
                    >
                        {isFullScreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                    </Button>
                    <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md">
                        <button
                            type="button"
                            onClick={() => setMapLayerType("streets")}
                            className={`h-10 px-3 text-xs font-bold transition ${mapLayerType === "streets" ? "bg-emerald-700 text-white" : "text-slate-700 hover:bg-slate-50"}`}
                        >
                            Bản đồ
                        </button>
                        <button
                            type="button"
                            onClick={() => setMapLayerType("satellite")}
                            className={`h-10 border-l border-slate-200 px-3 text-xs font-bold transition ${mapLayerType === "satellite" ? "bg-emerald-700 text-white" : "text-slate-700 hover:bg-slate-50"}`}
                        >
                            Vệ tinh
                        </button>
                    </div>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGetMyLocation}
                    disabled={isLocating}
                    className="absolute left-3 top-14 z-[1000] h-11 w-11 rounded-full border-slate-200 bg-white text-blue-600 shadow-md hover:bg-slate-50"
                    title="Đến vị trí của tôi"
                    aria-label="Đến vị trí của tôi"
                >
                    {isLocating ? <Loader2 className="h-5 w-5 animate-spin" /> : <LocateFixed className="h-5 w-5" />}
                </Button>

                {/* Top Floating Guide & Points Count */}
                <div className="absolute top-3 left-3 right-3 sm:right-auto z-[1000] flex flex-wrap items-center gap-2 pointer-events-none">
                    <div className="rounded-xl bg-slate-950/85 backdrop-blur-md px-3.5 py-2 text-xs text-white border border-white/20 shadow-md pointer-events-auto flex items-center gap-2.5">
                        <span className={`flex h-2.5 w-2.5 rounded-full ${isDrawing ? "bg-emerald-400 animate-ping" : "bg-emerald-500"}`} />
                        <span className="font-bold">
                            {isDrawing
                                ? points.length === 0
                                    ? "👉 Chạm/click lên bản đồ để đặt Điểm 1"
                                    : points.length < 3
                                    ? `👉 Đã chọn ${points.length} góc. Chạm tiếp để thêm góc khác...`
                                    : `👉 Đã chọn ${points.length} góc. Chạm tiếp hoặc nhấn Hoàn tất.`
                                : points.length >= 3
                                ? `✅ Đã xác định ranh giới (${points.length} góc vườn)`
                                : "Nhấn 'Vẽ ranh giới vườn' để bắt đầu chọn các góc"}
                        </span>
                    </div>

                    {isFullScreen && (
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => setIsFullScreen(false)}
                            className="pointer-events-auto ml-auto rounded-xl bg-slate-900/90 hover:bg-slate-950 text-white font-bold text-xs h-8 border border-white/20 shadow-md gap-1"
                        >
                            <X className="h-3.5 w-3.5" />
                            Đóng toàn màn hình
                        </Button>
                    )}
                </div>

                {/* Bottom Floating Toolbar on Map */}
                <div className="absolute bottom-3 left-3 right-3 z-[1000] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                    {/* Real-time Area Badge */}
                    <div className="rounded-2xl bg-white/95 backdrop-blur-md px-4 py-2.5 shadow-lg border border-emerald-200 flex items-center gap-3 justify-between sm:justify-start">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                                Diện tích đo trên bản đồ
                            </span>
                            <div className="flex items-baseline gap-2">
                                <span className="font-mono text-base sm:text-lg font-black text-slate-900">
                                    {mappedAreaM2.toLocaleString("vi-VN")} m²
                                </span>
                                <span className="font-mono text-xs sm:text-sm font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                    {(mappedAreaM2 / 10_000).toLocaleString("vi-VN", { maximumFractionDigits: 4 })} ha
                                </span>
                            </div>
                        </div>

                        {points.length >= 3 && !isDrawing && (
                            <span className="rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black px-2.5 py-1 border border-emerald-300 shrink-0">
                                Đã khép kín ({points.length} góc)
                            </span>
                        )}
                    </div>

                    {/* Action Buttons on Map */}
                    <div className="flex flex-wrap items-center gap-2 justify-end">
                        {isDrawing ? (
                            <>
                                {points.length > 0 && (
                                    <Button
                                        type="button"
                                        onClick={undoLastPoint}
                                        variant="outline"
                                        className="flex-1 sm:flex-none rounded-xl bg-white/95 hover:bg-white text-slate-700 font-bold text-xs h-10 px-3 gap-1.5 shadow-md border-slate-300"
                                        title="Xóa điểm vừa chọn"
                                    >
                                        <Undo2 className="h-3.5 w-3.5 text-amber-600" />
                                        Xóa điểm cuối
                                    </Button>
                                )}
                                <Button
                                    type="button"
                                    onClick={clearPoints}
                                    variant="outline"
                                    className="flex-1 sm:flex-none rounded-xl bg-white/95 hover:bg-white text-slate-700 font-bold text-xs h-10 px-3 gap-1.5 shadow-md border-slate-300"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    Vẽ lại từ đầu
                                </Button>
                                <Button
                                    type="button"
                                    onClick={finishDrawing}
                                    disabled={points.length < 3}
                                    className="flex-1 sm:flex-none rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-10 px-4 gap-1.5 shadow-lg disabled:opacity-50"
                                >
                                    <Check className="h-4 w-4" />
                                    Hoàn tất ({points.length} điểm)
                                </Button>
                            </>
                        ) : points.length === 0 ? (
                            <Button
                                type="button"
                                onClick={startDrawing}
                                className="flex-1 sm:flex-none rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-10 px-4 gap-1.5 shadow-lg"
                            >
                                <Pencil className="h-4 w-4" />
                                Vẽ ranh giới vườn
                            </Button>
                        ) : (
                            <>
                                <Button
                                    type="button"
                                    onClick={clearPoints}
                                    variant="outline"
                                    className="flex-1 sm:flex-none rounded-xl bg-white/95 hover:bg-white text-slate-700 font-bold text-xs h-10 px-3.5 gap-1.5 shadow-md border-slate-300"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    Vẽ lại
                                </Button>
                                <Button
                                    type="button"
                                    onClick={startDrawing}
                                    variant="outline"
                                    className="flex-1 sm:flex-none rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs h-10 px-3.5 gap-1.5 shadow-sm border-emerald-300"
                                >
                                    <PlusCircle className="h-3.5 w-3.5 text-emerald-700" />
                                    Thêm góc vườn
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => setIsEditing(!isEditing)}
                                    className="flex-1 sm:flex-none rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs h-10 px-4 gap-1.5 shadow-lg"
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                    {isEditing ? "Lưu chỉnh sửa" : "Kéo chỉnh ranh giới"}
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Coordinate list for every unique polygon vertex. */}
            {points.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                    <div className="flex flex-col gap-1 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h4 className="text-sm font-black text-slate-900">Bảng tọa độ các điểm ranh giới</h4>
                            <p className="text-xs text-slate-500">
                                Tọa độ được cập nhật tự động khi thêm hoặc kéo chỉnh điểm.
                            </p>
                        </div>
                        <span className="text-xs font-bold text-emerald-700">
                            {points.length} điểm
                        </span>
                    </div>

                    <div className="max-h-72 overflow-auto">
                        <table className="w-full min-w-[520px] text-left text-sm">
                            <thead className="sticky top-0 z-10 bg-white text-[11px] uppercase tracking-wide text-slate-500 shadow-[0_1px_0_0_#e2e8f0]">
                                <tr>
                                    <th className="w-20 px-4 py-3 font-bold">Điểm</th>
                                    <th className="px-4 py-3 font-bold">Vĩ độ (Latitude)</th>
                                    <th className="px-4 py-3 font-bold">Kinh độ (Longitude)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {points.map((point, index) => (
                                    <tr key={`${index}-${point.lat}-${point.lng}`} className="hover:bg-emerald-50/40">
                                        <td className="px-4 py-2.5">
                                            <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-black text-white ${index === 0 ? "bg-emerald-900" : "bg-emerald-600"}`}>
                                                {index + 1}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 font-mono text-xs font-semibold tabular-nums text-slate-800">
                                            {point.lat.toFixed(7)}
                                        </td>
                                        <td className="px-4 py-2.5 font-mono text-xs font-semibold tabular-nums text-slate-800">
                                            {point.lng.toFixed(7)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {points.length >= 3 && (
                        <p className="border-t border-slate-100 bg-emerald-50/50 px-4 py-2 text-[11px] text-slate-600">
                            Khi lưu, hệ thống tự nối điểm {points.length} về điểm 1 để khép kín ranh giới.
                        </p>
                    )}
                </div>
            )}

            {/* Comparison Box (Diện tích khai báo vs Diện tích bản đồ) */}
            {points.length >= 3 && (
                <div
                    className={`rounded-2xl p-4 border transition ${
                        areaComparison.status === "WARNING"
                            ? "bg-amber-50/80 border-amber-300 text-amber-950"
                            : "bg-emerald-50/80 border-emerald-200 text-emerald-950"
                    }`}
                >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                            <div>
                                <span className="text-slate-500 font-bold uppercase block text-[10px]">
                                    Diện tích khai báo (Hồ sơ)
                                </span>
                                <b className="font-mono text-sm text-slate-900">
                                    {areaComparison.declaredAreaHa.toLocaleString("vi-VN", { maximumFractionDigits: 4 })} ha
                                </b>
                                <span className="text-[11px] text-slate-500 block">
                                    ({areaComparison.declaredAreaM2.toLocaleString("vi-VN")} m²)
                                </span>
                            </div>

                            <div>
                                <span className="text-slate-500 font-bold uppercase block text-[10px]">
                                    Diện tích bản đồ (Thực tế)
                                </span>
                                <b className="font-mono text-sm text-emerald-800">
                                    {areaComparison.mappedAreaHa.toLocaleString("vi-VN", { maximumFractionDigits: 4 })} ha
                                </b>
                                <span className="text-[11px] text-slate-500 block">
                                    ({areaComparison.mappedAreaM2.toLocaleString("vi-VN")} m²)
                                </span>
                            </div>

                            <div className="col-span-2 sm:col-span-1 border-t sm:border-t-0 sm:border-l border-slate-200/80 pt-2 sm:pt-0 sm:pl-3">
                                <span className="text-slate-500 font-bold uppercase block text-[10px]">
                                    Chênh lệch đối soát
                                </span>
                                <b className="font-mono text-sm text-slate-900">
                                    {areaComparison.diffHa.toLocaleString("vi-VN", { maximumFractionDigits: 4 })} ha
                                </b>
                                <span className="text-[11px] font-bold text-slate-600 block">
                                    ({areaComparison.diffPercent.toFixed(2)}%)
                                </span>
                            </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                            {areaComparison.status === "WARNING" ? (
                                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-100/90 px-3 py-1.5 rounded-xl border border-amber-300">
                                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
                                    <span>Chênh lệch &gt; 15%</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100/90 px-3 py-1.5 rounded-xl border border-emerald-300">
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
                                    <span>Chênh lệch hợp lệ (&le; 15%)</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <p className="text-[11px] text-slate-600 mt-2.5 pt-2 border-t border-slate-200/60 leading-relaxed">
                        💡 <b>Lưu ý:</b> Hệ thống ghi nhận cả 2 số liệu. Diện tích khai báo dùng cho hồ sơ pháp lý & đăng ký mã số vùng trồng; diện tích bản đồ hỗ trợ tính toán tự động liều lượng phân bón và theo dõi vệ tinh.
                    </p>
                </div>
            )}
        </div>
    );
}
