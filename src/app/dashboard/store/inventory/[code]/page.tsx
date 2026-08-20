import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InventoryDocumentView } from "@/components/store/inventory-document-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { code: string } }) {
    const code = decodeURIComponent(params.code);
    return {
        title: `Chứng từ kho ${code} | TriViet Store`,
        description: `Chi tiết chứng từ kho và phiếu nhập xuất kho ${code}`,
    };
}

export default async function InventoryDocumentPage({ params }: { params: { code: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "STORE_OWNER") {
        redirect("/login");
    }

    const code = decodeURIComponent(params.code);
    const document = await prisma.inventoryDocument.findFirst({
        where: {
            OR: [{ id: code }, { code }],
            store: { ownerId: session.user.id, deletedAt: null },
        },
        include: {
            store: {
                select: {
                    name: true,
                    address: true,
                    phone: true,
                    representativeName: true,
                    taxOrBusinessCode: true,
                },
            },
            order: {
                select: {
                    orderCode: true,
                    status: true,
                    recipientName: true,
                    recipientPhone: true,
                },
            },
            movements: {
                include: {
                    product: {
                        select: {
                            name: true,
                            unit: true,
                            type: true,
                            brand: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: "asc",
                },
            },
        },
    });

    if (!document) {
        notFound();
    }

    // Format data cleanly for the client document view
    const documentData = {
        id: document.id,
        code: document.code,
        type: document.type,
        businessType: document.businessType,
        supplierName: document.supplierName,
        actorName: document.actorName,
        reason: document.reason,
        note: document.note,
        createdAt: document.createdAt.toISOString(),
        store: {
            name: document.store.name,
            address: document.store.address,
            phone: document.store.phone,
            representativeName: document.store.representativeName,
            taxOrBusinessCode: document.store.taxOrBusinessCode,
        },
        order: document.order
            ? {
                  orderCode: document.order.orderCode,
                  status: document.order.status,
                  recipientName: document.order.recipientName,
                  phone: document.order.recipientPhone,
              }
            : null,
        movements: document.movements.map((movement) => ({
            id: movement.id,
            quantity: movement.quantity,
            stockBefore: movement.stockBefore,
            stockAfter: movement.stockAfter,
            unitCost: movement.unitCost ? Number(movement.unitCost) : null,
            totalCost: movement.totalCost ? Number(movement.totalCost) : null,
            note: movement.note,
            product: {
                name: movement.product.name,
                unit: movement.product.unit,
                type: movement.product.type,
                brand: movement.product.brand,
            },
        })),
    };

    return (
        <main className="mx-auto max-w-5xl px-4 py-8">
            <InventoryDocumentView document={documentData} />
        </main>
    );
}
