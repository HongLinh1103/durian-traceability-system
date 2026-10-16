"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Pencil, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
    FarmerInventoryActionModal,
    SupplyOption,
    TransactionEditData,
} from "@/components/farmer/farmer-inventory-action-modal";

interface FarmerInventoryRowActionsProps {
    transaction: TransactionEditData;
    supplies: SupplyOption[];
}

export function FarmerInventoryRowActions({
    transaction,
    supplies,
}: FarmerInventoryRowActionsProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const res = await fetch(
                `/api/farmer/supplies/transactions/${transaction.id}`,
                {
                    method: "DELETE",
                }
            );
            const data = await res.json().catch(() => null);

            if (!res.ok || !data?.success) {
                throw new Error(
                    data?.message || "Không thể xóa đợt nhập vật tư này."
                );
            }

            toast({
                title: "Thành công",
                description: "Đã xóa đợt nhập vật tư thành công.",
                variant: "success",
            });
            setShowDeleteModal(false);
            router.refresh();
        } catch (err: any) {
            toast({
                title: "Thao tác thất bại",
                description: err?.message || "Đã có lỗi xảy ra khi xóa đợt nhập vật tư.",
                variant: "destructive",
            });
        } finally {
            setDeleting(false);
        }
    };

    const formattedDate = new Date(transaction.actionDate).toLocaleDateString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
    });

    const formattedMoney = new Intl.NumberFormat("vi-VN").format(
        Number(transaction.totalAmount || 0)
    );

    return (
        <div className="flex items-center justify-center gap-1.5">
            {/* Nút Sửa */}
            <FarmerInventoryActionModal
                mode="IN"
                supplies={supplies}
                farms={[]}
                editTransaction={transaction}
                trigger={
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-xl px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-brand-700 border-slate-200 transition gap-1"
                    >
                        <Pencil className="h-3.5 w-3.5 text-slate-500" />
                        <span>Sửa</span>
                    </Button>
                }
            />

            {/* Nút Xóa */}
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
                className="h-8 rounded-xl px-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 border-red-200 transition gap-1"
            >
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                <span>Xóa</span>
            </Button>

            {/* Hộp thoại xác nhận xóa */}
            {showDeleteModal &&
                typeof document !== "undefined" &&
                createPortal(
                    <div
                        className="fixed inset-0 z-[160] flex h-full min-h-screen w-screen items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
                        onClick={() => !deleting && setShowDeleteModal(false)}
                    >
                        <div
                            className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                                    <AlertTriangle className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900 sm:text-lg">
                                        Xác nhận xóa đợt nhập vật tư
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Thao tác này sẽ xóa bản ghi khỏi hệ thống.
                                    </p>
                                </div>
                            </div>

                            <div className="my-5 space-y-3">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs space-y-1.5 text-slate-700">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Tên vật tư:</span>
                                        <span className="font-bold text-slate-900">
                                            {transaction.supply.name}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Số lượng nhập:</span>
                                        <span className="font-bold text-slate-900">
                                            {transaction.quantity} {transaction.supply.unit}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Ngày nhập:</span>
                                        <span className="font-medium text-slate-800">
                                            {formattedDate}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Thành tiền:</span>
                                        <span className="font-bold text-brand-700">
                                            {formattedMoney} đ
                                        </span>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                                    ⚠️ <strong>Lưu ý:</strong> Xóa đợt nhập này sẽ trừ số lượng tương ứng trong kho và tính toán lại tồn kho FIFO. Thao tác không thể hoàn tác.
                                </div>
                            </div>

                            <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowDeleteModal(false)}
                                    disabled={deleting}
                                    className="rounded-2xl"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="rounded-2xl bg-red-600 px-4 font-bold text-white hover:bg-red-700 shadow-soft"
                                >
                                    {deleting ? (
                                        <>
                                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                            Đang xóa...
                                        </>
                                    ) : (
                                        "Xác nhận xóa"
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
}
