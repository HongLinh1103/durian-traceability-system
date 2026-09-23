'use client';

import { useState, useEffect, useCallback } from "react";
import {
    ProcessingWorkflowState,
    PurchaseRecord,
    GradingRecord,
    FinishedProductLot,
    ShipmentRecord,
    ReceivableRecord,
    PayableRecord,
    CashFlowRecord,
    loadProcessingState,
    saveProcessingState,
    generatePurchaseCode,
    generateGradingCode,
    generateFinishedLotCode,
    generateShipmentCode,
    calculateProcessingKpis,
    getInitialProcessingState,
    DEFAULT_FACILITY_INFO,
} from "@/lib/processing-workflow";

export function useProcessingWorkflow() {
    const [state, setState] = useState<ProcessingWorkflowState>(loadProcessingState);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setState(loadProcessingState());
        setIsLoaded(true);

        const handleUpdate = () => {
            setState(loadProcessingState());
        };

        window.addEventListener("processing-state-updated", handleUpdate);
        window.addEventListener("storage", handleUpdate);
        return () => {
            window.removeEventListener("processing-state-updated", handleUpdate);
            window.removeEventListener("storage", handleUpdate);
        };
    }, []);

    const persist = useCallback((newState: ProcessingWorkflowState) => {
        setState(newState);
        saveProcessingState(newState);
    }, []);

    // 1. ADD PURCHASE
    const addPurchase = useCallback(
        (data: {
            cropSeason: string;
            purchaseDate: string;
            sellerName: string;
            sellerPhone: string;
            sellerAddress: string;
            durianVariety: "Ri6" | "Monthong" | "Khác";
            weightKg: number;
            pricePerKg: number;
            farmName: string;
            pucCode: string;
            notes?: string;
        }) => {
            const purchaseCode = generatePurchaseCode(state.purchases, data.purchaseDate);
            const totalAmount = data.weightKg * data.pricePerKg;
            const newPurchaseId = `tm-${Date.now()}`;

            const newPurchase: PurchaseRecord = {
                id: newPurchaseId,
                cropSeason: data.cropSeason || "2025-2026",
                purchaseCode,
                purchaseDate: data.purchaseDate,
                sellerName: data.sellerName,
                sellerPhone: data.sellerPhone,
                sellerAddress: data.sellerAddress,
                durianVariety: data.durianVariety,
                weightKg: data.weightKg,
                pricePerKg: data.pricePerKg,
                totalAmount,
                farmName: data.farmName,
                pucCode: data.pucCode,
                notes: data.notes,
                createdAt: new Date().toISOString(),
                gradingStatus: "PENDING", // Automatically creates pending grading item
            };

            // Automatically create Accounts Payable in Finance
            const newPayable: PayableRecord = {
                id: `pay-${Date.now()}`,
                purchaseId: newPurchaseId,
                purchaseCode,
                sellerName: data.sellerName,
                sellerPhone: data.sellerPhone,
                totalAmount,
                paidAmount: 0,
                remainingAmount: totalAmount,
                status: "UNPAID",
                date: data.purchaseDate,
            };

            const nextState: ProcessingWorkflowState = {
                ...state,
                purchases: [newPurchase, ...state.purchases],
                payables: [newPayable, ...state.payables],
            };

            persist(nextState);
            return newPurchase;
        },
        [state, persist]
    );

    // 2. UPDATE PURCHASE
    const updatePurchase = useCallback(
        (id: string, updates: Partial<PurchaseRecord>) => {
            const nextPurchases = state.purchases.map((p) => {
                if (p.id !== id) return p;
                const updated = { ...p, ...updates };
                if (updates.weightKg !== undefined || updates.pricePerKg !== undefined) {
                    updated.totalAmount = (updated.weightKg || 0) * (updated.pricePerKg || 0);
                }
                return updated;
            });

            // Sync with Payable if totalAmount changed
            const target = nextPurchases.find((p) => p.id === id);
            const nextPayables = state.payables.map((pay) => {
                if (pay.purchaseId !== id || !target) return pay;
                const remaining = Math.max(0, target.totalAmount - pay.paidAmount);
                return {
                    ...pay,
                    totalAmount: target.totalAmount,
                    remainingAmount: remaining,
                    status: (remaining === 0 ? "PAID" : pay.paidAmount > 0 ? "PARTIAL" : "UNPAID") as "PAID" | "PARTIAL" | "UNPAID",
                };
            });

            persist({
                ...state,
                purchases: nextPurchases,
                payables: nextPayables,
            });
        },
        [state, persist]
    );

    // 3. DELETE PURCHASE
    const deletePurchase = useCallback(
        (id: string) => {
            const nextPurchases = state.purchases.filter((p) => p.id !== id);
            const nextPayables = state.payables.filter((pay) => pay.purchaseId !== id);
            persist({
                ...state,
                purchases: nextPurchases,
                payables: nextPayables,
            });
        },
        [state, persist]
    );

    // 4. PERFORM GRADING (Phân loại)
    const performGrading = useCallback(
        (data: {
            purchaseId: string;
            freshWeight: number;
            processedWeight: number;
            notes?: string;
            gradingDate?: string;
        }) => {
            const purchase = state.purchases.find((p) => p.id === data.purchaseId);
            if (!purchase) throw new Error("Không tìm thấy lô thu mua");

            const total = data.freshWeight + data.processedWeight;
            if (Math.abs(total - purchase.weightKg) > 0.001) {
                throw new Error(`Tổng khối lượng phân loại (${total.toLocaleString("vi-VN")} kg) không khớp với khối lượng lô (${purchase.weightKg.toLocaleString("vi-VN")} kg)`);
            }

            const gradingDate = data.gradingDate || new Intl.DateTimeFormat("en-CA").format(new Date());
            const gradingCode = generateGradingCode(state.gradings, gradingDate);
            const freshPercent = Math.round((data.freshWeight / purchase.weightKg) * 10000) / 100;
            const processedPercent = Math.round((data.processedWeight / purchase.weightKg) * 10000) / 100;

            const newGrading: GradingRecord = {
                id: `pl-${Date.now()}`,
                gradingCode,
                purchaseId: purchase.id,
                purchaseCode: purchase.purchaseCode,
                gradingDate,
                durianVariety: purchase.durianVariety,
                totalWeight: purchase.weightKg,
                freshWeight: data.freshWeight,
                freshPercent,
                processedWeight: data.processedWeight,
                processedPercent,
                notes: data.notes,
                sellerName: purchase.sellerName,
                farmName: purchase.farmName,
                pucCode: purchase.pucCode,
                freshStatus: data.freshWeight > 0 ? "WAITING_PACKAGING" : "COMPLETED",
                processedStatus: data.processedWeight > 0 ? "WAITING_PROCESSING" : "COMPLETED",
            };

            const nextPurchases = state.purchases.map((p) => (p.id === purchase.id ? { ...p, gradingStatus: "COMPLETED" as const } : p));

            persist({
                ...state,
                purchases: nextPurchases,
                gradings: [newGrading, ...state.gradings],
            });

            return newGrading;
        },
        [state, persist]
    );

    // 5. PACK FRESH LOT (Đóng gói trái tươi)
    const packFreshLot = useCallback(
        (data: {
            gradingId: string;
            inputWeightKg: number;
            packagingSpec: string;
            packageCount: number;
            fruitCount: number;
            netWeightKg: number;
            completionDate: string;
            notes?: string;
        }) => {
            const grading = state.gradings.find((g) => g.id === data.gradingId);
            if (!grading) throw new Error("Không tìm thấy lô phân loại");

            const productCode = generateFinishedLotCode(state.finishedLots, data.completionDate);
            const lossWeightKg = Math.max(0, data.inputWeightKg - data.netWeightKg);
            const recoveryRatePercent = Math.round((data.netWeightKg / data.inputWeightKg) * 10000) / 100;

            const newFinishedLot: FinishedProductLot = {
                id: `tp-${Date.now()}`,
                productCode,
                type: "FRESH",
                productName: `Sầu riêng ${grading.durianVariety} tươi đóng thùng xuất khẩu`,
                processingMethod: "Đóng thùng tươi",
                inputWeightKg: data.inputWeightKg,
                packagingSpec: data.packagingSpec,
                packageCount: data.packageCount,
                fruitCount: data.fruitCount,
                netWeightKg: data.netWeightKg,
                lossWeightKg,
                recoveryRatePercent,
                completionDate: data.completionDate,
                status: "READY",
                notes: data.notes,
                // Backward links
                gradingId: grading.id,
                gradingCode: grading.gradingCode,
                purchaseId: grading.purchaseId,
                purchaseCode: grading.purchaseCode,
                sellerName: grading.sellerName,
                farmName: grading.farmName,
                pucCode: grading.pucCode,
                phcCode: DEFAULT_FACILITY_INFO.phcCode,
                facilityName: DEFAULT_FACILITY_INFO.name,
                durianVariety: grading.durianVariety,
            };

            const nextGradings = state.gradings.map((g) => (g.id === grading.id ? { ...g, freshStatus: "COMPLETED" as const } : g));

            persist({
                ...state,
                gradings: nextGradings,
                finishedLots: [newFinishedLot, ...state.finishedLots],
            });

            return newFinishedLot;
        },
        [state, persist]
    );

    // 6. PROCESS DEEP LOT (Chế biến khác)
    const processDeepLot = useCallback(
        (data: {
            gradingId: string;
            inputWeightKg: number;
            processingMethod: string;
            productName: string;
            packagingSpec: string;
            packageCount: number;
            netWeightKg: number;
            completionDate: string;
            notes?: string;
        }) => {
            const grading = state.gradings.find((g) => g.id === data.gradingId);
            if (!grading) throw new Error("Không tìm thấy lô phân loại");

            const productCode = generateFinishedLotCode(state.finishedLots, data.completionDate);
            const lossWeightKg = Math.max(0, data.inputWeightKg - data.netWeightKg);
            const recoveryRatePercent = Math.round((data.netWeightKg / data.inputWeightKg) * 10000) / 100;

            const newFinishedLot: FinishedProductLot = {
                id: `tp-${Date.now()}`,
                productCode,
                type: "PROCESSED",
                productName: data.productName,
                processingMethod: data.processingMethod,
                inputWeightKg: data.inputWeightKg,
                packagingSpec: data.packagingSpec,
                packageCount: data.packageCount,
                netWeightKg: data.netWeightKg,
                lossWeightKg,
                recoveryRatePercent,
                completionDate: data.completionDate,
                status: "READY",
                notes: data.notes,
                // Backward links
                gradingId: grading.id,
                gradingCode: grading.gradingCode,
                purchaseId: grading.purchaseId,
                purchaseCode: grading.purchaseCode,
                sellerName: grading.sellerName,
                farmName: grading.farmName,
                pucCode: grading.pucCode,
                phcCode: DEFAULT_FACILITY_INFO.phcCode,
                facilityName: DEFAULT_FACILITY_INFO.name,
                durianVariety: grading.durianVariety,
            };

            const nextGradings = state.gradings.map((g) => (g.id === grading.id ? { ...g, processedStatus: "COMPLETED" as const } : g));

            persist({
                ...state,
                gradings: nextGradings,
                finishedLots: [newFinishedLot, ...state.finishedLots],
            });

            return newFinishedLot;
        },
        [state, persist]
    );

    // 7. CREATE SHIPMENT (Lập hồ sơ xuất hàng)
    const createShipment = useCallback(
        (data: {
            shipmentDate: string;
            contractType: "EXPORT" | "DOMESTIC";
            departurePort: string;
            buyerName: string;
            destinationMarket: string;
            destinationPort: string;
            finishedProductLotId: string;
            unitPrice: number;
            currency: "VND" | "USD";
            truckPlate: string;
            containerNumber: string;
            sealNumber: string;
            carrierName: string;
            containerTemp?: string;
        }) => {
            const lot = state.finishedLots.find((l) => l.id === data.finishedProductLotId);
            if (!lot) throw new Error("Không tìm thấy lô thành phẩm được chọn");

            const shipmentCode = generateShipmentCode(state.shipments);
            const totalAmount = lot.netWeightKg * data.unitPrice;
            const newShipmentId = `xh-${Date.now()}`;

            const newShipment: ShipmentRecord = {
                id: newShipmentId,
                shipmentCode,
                shipmentDate: data.shipmentDate,
                contractType: data.contractType,
                sellerFacilityName: DEFAULT_FACILITY_INFO.name,
                sellerPhcCode: DEFAULT_FACILITY_INFO.phcCode,
                departurePort: data.departurePort,
                buyerName: data.buyerName,
                destinationMarket: data.destinationMarket,
                destinationPort: data.destinationPort,
                finishedProductLotId: lot.id,
                productCode: lot.productCode,
                productName: lot.productName,
                packagingSpec: lot.packagingSpec,
                netWeightKg: lot.netWeightKg,
                packageCount: lot.packageCount,
                unitPrice: data.unitPrice,
                currency: data.currency,
                totalAmount,
                truckPlate: data.truckPlate,
                containerNumber: data.containerNumber,
                sealNumber: data.sealNumber,
                carrierName: data.carrierName,
                containerTemp: data.containerTemp,
                // Backward links inherited strictly
                farmName: lot.farmName,
                pucCode: lot.pucCode,
                facilityName: lot.facilityName,
                phcCode: lot.phcCode,
                purchaseCode: lot.purchaseCode,
                durianVariety: lot.durianVariety,
                qrIssued: false,
            };

            // Mark finished lot as SHIPPED
            const nextFinishedLots = state.finishedLots.map((l) => (l.id === lot.id ? { ...l, status: "SHIPPED" as const } : l));

            // Create Accounts Receivable in Finance
            const newReceivable: ReceivableRecord = {
                id: `rec-${Date.now()}`,
                shipmentId: newShipmentId,
                shipmentCode,
                buyerName: data.buyerName,
                market: data.destinationMarket,
                totalAmount,
                paidAmount: 0,
                remainingAmount: totalAmount,
                status: "UNPAID",
                date: data.shipmentDate,
            };

            persist({
                ...state,
                finishedLots: nextFinishedLots,
                shipments: [newShipment, ...state.shipments],
                receivables: [newReceivable, ...state.receivables],
            });

            return newShipment;
        },
        [state, persist]
    );

    // 9. RECORD RECEIVABLE PAYMENT (Ghi nhận thu tiền bán hàng)
    const recordReceivablePayment = useCallback(
        (data: {
            receivableId: string;
            amount: number;
            date: string;
            method: "BANK" | "CASH";
            note?: string;
        }) => {
            const receivable = state.receivables.find((r) => r.id === data.receivableId);
            if (!receivable) throw new Error("Không tìm thấy khoản phải thu");

            if (data.amount <= 0) throw new Error("Số tiền thu phải lớn hơn 0");
            if (data.amount > receivable.remainingAmount) {
                throw new Error(`Số tiền thu (${data.amount.toLocaleString("vi-VN")} đ) vượt quá số tiền còn lại (${receivable.remainingAmount.toLocaleString("vi-VN")} đ)`);
            }

            const newPaid = receivable.paidAmount + data.amount;
            const newRemaining = Math.max(0, receivable.totalAmount - newPaid);
            const newStatus = newRemaining === 0 ? "PAID" : "PARTIAL";

            const nextReceivables = state.receivables.map((r) =>
                r.id === data.receivableId ? { ...r, paidAmount: newPaid, remainingAmount: newRemaining, status: (newRemaining === 0 ? "PAID" : "PARTIAL") as "PAID" | "PARTIAL" } : r
            );

            // Calculate new cash balance
            const currentBalance = state.cashFlowLogs.length > 0 ? state.cashFlowLogs[state.cashFlowLogs.length - 1].balanceAfter : 1500000000;
            const newBalance = currentBalance + data.amount;

            const newCashLog: CashFlowRecord = {
                id: `cf-${Date.now()}`,
                date: data.date,
                type: "INFLOW",
                category: "SALES",
                description: data.note || `Thu tiền bán hàng hợp đồng ${receivable.shipmentCode} (${receivable.buyerName})`,
                amount: data.amount,
                balanceAfter: newBalance,
                paymentMethod: data.method,
                referenceCode: receivable.shipmentCode,
            };

            persist({
                ...state,
                receivables: nextReceivables,
                cashFlowLogs: [...state.cashFlowLogs, newCashLog],
            });
        },
        [state, persist]
    );

    // 10. RECORD PAYABLE PAYMENT (Thanh toán tiền thu mua)
    const recordPayablePayment = useCallback(
        (data: {
            payableId: string;
            amount: number;
            date: string;
            method: "BANK" | "CASH";
            note?: string;
        }) => {
            const payable = state.payables.find((p) => p.id === data.payableId);
            if (!payable) throw new Error("Không tìm thấy khoản phải trả");

            if (data.amount <= 0) throw new Error("Số tiền thanh toán phải lớn hơn 0");
            if (data.amount > payable.remainingAmount) {
                throw new Error(`Số tiền thanh toán (${data.amount.toLocaleString("vi-VN")} đ) vượt quá số tiền còn lại (${payable.remainingAmount.toLocaleString("vi-VN")} đ)`);
            }

            const newPaid = payable.paidAmount + data.amount;
            const newRemaining = Math.max(0, payable.totalAmount - newPaid);
            const newStatus = newRemaining === 0 ? "PAID" : "PARTIAL";

            const nextPayables = state.payables.map((p) =>
                p.id === data.payableId ? { ...p, paidAmount: newPaid, remainingAmount: newRemaining, status: (newRemaining === 0 ? "PAID" : "PARTIAL") as "PAID" | "PARTIAL" } : p
            );

            // Calculate new cash balance
            const currentBalance = state.cashFlowLogs.length > 0 ? state.cashFlowLogs[state.cashFlowLogs.length - 1].balanceAfter : 1500000000;
            const newBalance = currentBalance - data.amount;

            const newCashLog: CashFlowRecord = {
                id: `cf-${Date.now()}`,
                date: data.date,
                type: "OUTFLOW",
                category: "PURCHASE",
                description: data.note || `Thanh toán tiền thu mua lô ${payable.purchaseCode} cho ${payable.sellerName}`,
                amount: data.amount,
                balanceAfter: newBalance,
                paymentMethod: data.method,
                referenceCode: payable.purchaseCode,
            };

            persist({
                ...state,
                payables: nextPayables,
                cashFlowLogs: [...state.cashFlowLogs, newCashLog],
            });
        },
        [state, persist]
    );

    // 11. RECORD OTHER CASH FLOW
    const addOtherCashFlow = useCallback(
        (data: {
            date: string;
            type: "INFLOW" | "OUTFLOW";
            description: string;
            amount: number;
            method: "BANK" | "CASH";
        }) => {
            const currentBalance = state.cashFlowLogs.length > 0 ? state.cashFlowLogs[state.cashFlowLogs.length - 1].balanceAfter : 1500000000;
            const newBalance = data.type === "INFLOW" ? currentBalance + data.amount : currentBalance - data.amount;

            const newCashLog: CashFlowRecord = {
                id: `cf-${Date.now()}`,
                date: data.date,
                type: data.type,
                category: "OTHER",
                description: data.description,
                amount: data.amount,
                balanceAfter: newBalance,
                paymentMethod: data.method,
            };

            persist({
                ...state,
                cashFlowLogs: [...state.cashFlowLogs, newCashLog],
            });
        },
        [state, persist]
    );

    // 12. RESET TO DEFAULTS
    const resetToDefaults = useCallback(() => {
        const initial = getInitialProcessingState();
        persist(initial);
    }, [persist]);

    return {
        state,
        isLoaded,
        addPurchase,
        updatePurchase,
        deletePurchase,
        performGrading,
        packFreshLot,
        processDeepLot,
        createShipment,
        recordReceivablePayment,
        recordPayablePayment,
        addOtherCashFlow,
        resetToDefaults,
        calculateKpis: (filters?: { cropSeason?: string; fromDate?: string; toDate?: string }) =>
            calculateProcessingKpis(state, filters),
    };
}
