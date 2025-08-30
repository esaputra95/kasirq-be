import { Prisma } from "@prisma/client";

/**
 * Menghapus user dan semua data terkait
 */
export const deleteUserAndRelatedData = async (
    prisma: Prisma.TransactionClient,
    userId: string
) => {
    // 1. Cek dan ambil data user
    const user = await prisma.users.findUnique({
        where: { id: userId },
        select: { id: true },
    });

    if (!user) throw new Error("User not found");

    // 2. Cek dan hapus stores yang dimiliki user
    const stores = await prisma.stores.findMany({
        where: { ownerId: user.id },
        select: { id: true },
    });

    // 3. Hapus setiap store dan data terkaitnya
    for (const store of stores) {
        await deleteStoreAndRelatedData(prisma, store.id);
    }

    // 4. Hapus semua data master yang terkait dengan user
    await deleteMasterData(prisma, user.id);

    // 5. Terakhir hapus user
    await prisma.users.delete({
        where: { id: user.id },
    });
};

/**
 * Menghapus semua data master yang terkait dengan user
 */
export const deleteMasterData = async (
    prisma: Prisma.TransactionClient,
    userId: string
) => {
    // Hapus semua data master secara parallel
    await Promise.all([
        // Data master yang memiliki relasi ownerId ke user
        prisma.brands.deleteMany({ where: { ownerId: userId } }),
        prisma.categories.deleteMany({ where: { ownerId: userId } }),
        prisma.memberLevels.deleteMany({ where: { ownerId: userId } }),
        prisma.members.deleteMany({ where: { ownerId: userId } }),
        prisma.suppliers.deleteMany({ where: { ownerId: userId } }),
        prisma.units.deleteMany({ where: { ownerId: userId } }),
    ]);
};

/**
 * Menghapus semua data terkait store secara terstruktur
 */
export const deleteStoreAndRelatedData = async (
    prisma: Prisma.TransactionClient,
    storeId: string
) => {
    const store = await prisma.stores.findUnique({
        where: { id: storeId },
        select: { id: true },
    });

    if (!store) throw new Error("Store not found");

    // Hapus data dalam urutan yang aman (dari child ke parent)
    // 1. Hapus data transaksi detail terlebih dahulu
    await Promise.all([
        prisma.saleDetails.deleteMany({
            where: {
                sales: {
                    storeId: store.id,
                },
            },
        }),
        prisma.purchaseDetails.deleteMany({
            where: {
                purchases: {
                    storeId: store.id,
                },
            },
        }),
    ]);

    // 2. Hapus data transaksi utama
    await Promise.all([
        prisma.sales.deleteMany({
            where: { storeId: store.id },
        }),
        prisma.purchases.deleteMany({
            where: { storeId: store.id },
        }),
        prisma.itemIns.deleteMany({
            where: { storeId: store.id },
        }),
        prisma.itemOuts.deleteMany({
            where: { storeId: store.id },
        }),
        prisma.purchaseOrders.deleteMany({
            where: { storeId: store.id },
        }),
    ]);

    // 3. Hapus data pendukung
    await Promise.all([
        prisma.stocks.deleteMany({
            where: { storeId: store.id },
        }),
        // prisma.subscriptionStore.deleteMany({
        //     where: { storeId: store.id },
        // }),
    ]);

    // 4. Terakhir hapus store
    await prisma.stores.delete({
        where: { id: store.id },
    });
};
