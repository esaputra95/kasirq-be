import Model from "#root/services/PrismaService";

/**
 * Reset store data including sales, purchases, and related details.
 * Also resets stock levels to 0 for all products owned by the store owner.
 */
export const resetStoreData = async (storeId: string, ownerId: string) => {
    try {
        // Fetch product IDs separately to avoid collation issues in nested filters
        const ownerProducts = await Model.products.findMany({
            where: { ownerId: ownerId },
            select: { id: true },
        });
        const productIds = ownerProducts.map((p) => p.id);

        await Model.$transaction(async (tx) => {
            // --- 1. BERSIHKAN TRANSAKSI PENJUALAN (SALES) ---

            // Hapus COGS (Anak dari SaleDetail)
            await tx.cogs.deleteMany({
                where: {
                    saleDetail: {
                        sales: {
                            storeId: storeId,
                        },
                    },
                },
            });

            // Hapus SaleDetail (Anak dari Sale)
            await tx.saleDetails.deleteMany({
                where: {
                    sales: {
                        storeId: storeId,
                    },
                },
            });

            // Hapus Sale (Parent)
            await tx.sales.deleteMany({
                where: {
                    storeId: storeId,
                },
            });

            // --- 2. BERSIHKAN TRANSAKSI PEMBELIAN (PURCHASE) ---

            // Hapus HppHistory
            await tx.hppHistory.deleteMany({
                where: {
                    storeId: storeId,
                },
            });

            // Hapus PurchaseDetail (Anak dari Purchase)
            await tx.purchaseDetails.deleteMany({
                where: {
                    purchases: {
                        storeId: storeId,
                    },
                },
            });

            // Hapus Purchase (Parent)
            await tx.purchases.deleteMany({
                where: {
                    storeId: storeId,
                },
            });

            // --- 3. BERSIHKAN ITEM IN & STOCK OPNAME ---

            // Hapus ItemInDetails
            await tx.itemInDetails.deleteMany({
                where: {
                    itemIns: {
                        storeId: storeId,
                    },
                },
            });

            // Hapus ItemIns
            await tx.itemIns.deleteMany({
                where: {
                    storeId: storeId,
                },
            });

            // Hapus StockOpnameDetails
            await tx.stockOpnameDetails.deleteMany({
                where: {
                    stockOpname: {
                        storeId: storeId,
                    },
                },
            });

            // Hapus StockOpname
            await tx.stockOpname.deleteMany({
                where: {
                    storeId: storeId,
                },
            });

            // --- 4. RESET STOK MENJADI 0 ---
            if (productIds.length > 0) {
                await tx.stocks.updateMany({
                    where: {
                        productId: { in: productIds },
                    },
                    data: {
                        quantity: 0,
                    },
                });
            }

            // --- 5. BERSIHKAN TRANSAKSI KAS ---
            await tx.cashflow.deleteMany({
                where: {
                    storeId: storeId,
                },
            });

            await tx.expense.deleteMany({
                where: {
                    storeId: storeId,
                },
            });

            // --- 6. RESET SALDO KAS ---
            await tx.account.updateMany({
                where: {
                    storeId: storeId,
                },
                data: {
                    balance: 0,
                    currentBalance: 0,
                },
            });
        });

        return {
            message:
                "Store data, stocks, and cash balances have been reset successfully",
        };
    } catch (error) {
        console.error("Failed to reset store data:", error);
        throw error;
    }
};

/**
 * Reset stock and related transactions for a specific product in a specific store.
 */
export const resetStock = async (
    productId: string,
    storeId: string,
    ownerId: string
) => {
    try {
        // 1. Verify product and store ownership
        const product = await Model.products.findFirst({
            where: {
                id: productId,
                ownerId: ownerId,
            },
        });

        if (!product) {
            throw new Error("Product not found or access denied");
        }

        const store = await Model.stores.findFirst({
            where: {
                id: storeId,
                ownerId: ownerId,
            },
        });

        if (!store) {
            throw new Error("Store not found or access denied");
        }

        await Model.$transaction(async (tx) => {
            // --- 1. BERSIHKAN TRANSAKSI PENJUALAN (SALES) UNTUK PRODUK INI DI TOKO INI ---

            // Hapus COGS (Anak dari SaleDetail)
            await tx.cogs.deleteMany({
                where: {
                    saleDetail: {
                        productId: productId,
                        sales: {
                            storeId: storeId,
                        },
                    },
                },
            });

            // Hapus SaleDetail
            await tx.saleDetails.deleteMany({
                where: {
                    productId: productId,
                    sales: {
                        storeId: storeId,
                    },
                },
            });

            // --- 2. BERSIHKAN TRANSAKSI PEMBELIAN (PURCHASE) UNTUK PRODUK INI DI TOKO INI ---

            // Hapus HppHistory
            await tx.hppHistory.deleteMany({
                where: {
                    productId: productId,
                    storeId: storeId,
                },
            });

            // Hapus PurchaseDetail
            await tx.purchaseDetails.deleteMany({
                where: {
                    productId: productId,
                    purchases: {
                        storeId: storeId,
                    },
                },
            });

            // --- 3. BERSIHKAN ITEM IN & STOCK OPNAME UNTUK PRODUK INI DI TOKO INI ---

            // Hapus ItemInDetails
            await tx.itemInDetails.deleteMany({
                where: {
                    productId: productId,
                    itemIns: {
                        storeId: storeId,
                    },
                },
            });

            // Hapus StockOpnameDetails
            await tx.stockOpnameDetails.deleteMany({
                where: {
                    productId: productId,
                    stockOpname: {
                        storeId: storeId,
                    },
                },
            });

            // --- 4. RESET STOK MENJADI 0 ---
            await tx.stocks.updateMany({
                where: {
                    productId: productId,
                    storeId: storeId,
                },
                data: {
                    quantity: 0,
                },
            });
        });

        return {
            message: `Stock and transactions for product ${product.name} in store ${store.name} have been reset successfully`,
        };
    } catch (error) {
        console.error("Failed to perform product stock reset:", error);
        throw error;
    }
};
