import Model from "#root/services/PrismaService";
import { CashflowQueryInterface } from "#root/interfaces/accountancy/CashflowInterface";
import { v4 as uuidv4 } from "uuid";
import getOwnerId from "#root/helpers/GetOwnerId";
import { ValidationError } from "#root/helpers/handleErrors";
import { Decimal } from "@prisma/client/runtime/library";

const getStoreId = async (
    userId: string,
    userLevel: string
): Promise<string> => {
    const owner: any = await getOwnerId(userId, userLevel);
    const store = await Model.stores.findFirst({
        where: { ownerId: owner.id },
    });
    if (!store) throw new ValidationError("Store not found", 404, "store");
    return store.id;
};

/**
 * Fungsi reusable untuk membuat entry cashflow
 * Bisa dipanggil dari berbagai service (Sales, Expense, Transfer, dll)
 *
 * @param tx - Prisma transaction client
 * @param data - Data cashflow entry
 * @returns Promise<void>
 *
 * @example
 * // Dari SalesService
 * await prisma.$transaction(async (tx) => {
 *   const sale = await tx.sales.create({ data: saleData });
 *
 *   await createCashflowEntry(tx, {
 *     kasId: sale.kasId,
 *     type: 'IN',
 *     amount: sale.totalPrice,
 *     description: `Penjualan #${sale.invoiceNumber}`,
 *     referenceId: sale.id,
 *     referenceType: 'SALE',
 *     transactionDate: sale.createdAt,
 *     userCreate: userId
 *   });
 * });
 */
export const createCashflowEntry = async (
    tx: any, // Prisma transaction client
    data: {
        storeId: string;
        kasId: string;
        toKasId?: string;
        type: "IN" | "OUT" | "TRANSFER";
        amount: number | Decimal;
        description?: string;
        referenceId?: string;
        referenceType?: string;
        transactionDate?: Date;
        userCreate?: string;
    }
): Promise<void> => {
    const amount = new Decimal(data.amount);

    // Buat cashflow entry
    await tx.cashflow.create({
        data: {
            id: uuidv4(),
            storeId: data.storeId,
            kasId: data.kasId,
            toKasId: data.toKasId,
            type: data.type,
            amount: amount,
            description: data.description,
            referenceId: data.referenceId,
            referenceType: data.referenceType,
            transactionDate: data.transactionDate || new Date(),
            userCreate: data.userCreate,
        },
    });

    // 1. Update saldo kas account UTAMA (Source)
    const kasAccount = await tx.account.findUnique({
        where: { id: data.kasId },
        select: { currentBalance: true },
    });

    if (!kasAccount) {
        throw new ValidationError(
            "Kas Account tidak ditemukan",
            404,
            "kasAccount"
        );
    }

    const currentBalance = kasAccount.currentBalance || new Decimal(0);

    // Logika update saldo Source
    // IN: Bertambah
    // OUT / TRANSFER: Berkurang
    const isIncoming = data.type === "IN";
    const newBalance = isIncoming
        ? currentBalance.add(amount)
        : currentBalance.sub(amount);

    // Cek saldo cukup untuk OUT / TRANSFER
    if (!isIncoming && newBalance.lessThan(0)) {
        throw new ValidationError("Saldo tidak mencukupi", 400, "amount");
    }

    await tx.account.update({
        where: { id: data.kasId },
        data: { currentBalance: newBalance },
    });

    // 2. Update saldo kas account TUJUAN (Destination) jika ada (Transfer)
    if (data.toKasId) {
        const toKasAccount = await tx.account.findUnique({
            where: { id: data.toKasId },
            select: { currentBalance: true },
        });

        if (!toKasAccount) {
            throw new ValidationError(
                "Kas Tujuan tidak ditemukan",
                404,
                "toKasId"
            );
        }

        const toCurrentBalance = toKasAccount.currentBalance || new Decimal(0);

        // Asumsi: Jika ada toKasId, maka ini adalah TRANSFER
        // Uang masuk ke akun tujuan
        await tx.account.update({
            where: { id: data.toKasId },
            data: { currentBalance: toCurrentBalance.add(amount) },
        });
    }
};

export const getCashflows = async (
    query: CashflowQueryInterface,
    userId: string,
    userLevel: string
) => {
    const storeId = await getStoreId(userId, userLevel);
    const take: number = parseInt(query.limit ?? "20");
    const page: number = parseInt(query.page ?? "1");
    const skip: number = (page - 1) * take;

    // Dapatkan semua kasAccount milik store ini
    const kasAccounts = await Model.account.findMany({
        where: { storeId, deletedAt: null },
        select: { id: true },
    });
    const kasIds = kasAccounts.map((k) => k.id);

    let filter: any = {
        storeId,
        deletedAt: null,
    };

    if (query.type) filter.type = query.type;
    if (query.kasId) filter.kasId = query.kasId;
    if (query.referenceType) filter.referenceType = query.referenceType;
    if (query.startDate && query.endDate) {
        filter.createdAt = {
            gte: new Date(query.startDate),
            lte: new Date(query.endDate),
        };
    }

    const [data, total] = await Promise.all([
        Model.cashflow.findMany({
            where: filter,
            skip,
            take,
            orderBy: { createdAt: "desc" },
            include: {
                account: { select: { id: true, name: true } },
                toAccount: { select: { id: true, name: true } },
            },
        }),
        Model.cashflow.count({ where: filter }),
    ]);

    return {
        message: "Berhasil mendapatkan data Cashflow",
        data: {
            cashflows: data,
            info: { page, limit: take, total },
        },
    };
};

export const createCashflow = async (
    cashflowData: any,
    userId: string,
    userLevel: string
) => {
    const storeId = await getStoreId(userId, userLevel);

    // Validasi kas account milik store ini
    const kasAccount = await Model.account.findUnique({
        where: { id: cashflowData.kasId },
    });
    if (!kasAccount || kasAccount.storeId !== storeId) {
        throw new ValidationError(
            "Kas Account tidak ditemukan",
            404,
            "kasAccount"
        );
    }

    // Validasi kas tujuan jika TRANSFER
    let toKasAccount = null;
    if (cashflowData.type === "TRANSFER") {
        if (!cashflowData.toKasId) {
            throw new ValidationError(
                "Kas Tujuan harus diisi untuk transfer",
                400,
                "toKasId"
            );
        }
        toKasAccount = await Model.account.findUnique({
            where: { id: cashflowData.toKasId },
        });
        if (!toKasAccount || toKasAccount.storeId !== storeId) {
            throw new ValidationError(
                "Kas Tujuan tidak ditemukan",
                404,
                "toKasId"
            );
        }
    }

    const amount = new Decimal(cashflowData.amount);

    // Update saldo kas account
    let sourceNewSaldo = kasAccount.currentBalance || new Decimal(0);
    let destNewSaldo = toKasAccount
        ? toKasAccount.currentBalance || new Decimal(0)
        : null;

    if (cashflowData.type === "IN") {
        sourceNewSaldo = sourceNewSaldo.add(amount);
    } else if (
        cashflowData.type === "OUT" ||
        cashflowData.type === "TRANSFER"
    ) {
        sourceNewSaldo = sourceNewSaldo.sub(amount);
        if (sourceNewSaldo.lessThan(0)) {
            throw new ValidationError("Saldo tidak mencukupi", 400, "amount");
        }
        if (cashflowData.type === "TRANSFER" && destNewSaldo !== null) {
            destNewSaldo = destNewSaldo.add(amount);
        }
    }

    const data = {
        id: uuidv4(),
        storeId: storeId,
        kasId: cashflowData.kasId,
        toKasId: cashflowData.toKasId,
        type: cashflowData.type,
        amount: amount,
        description: cashflowData.description,
        referenceId: cashflowData.referenceId,
        referenceType: cashflowData.referenceType || "MANUAL",
        userCreate: userId,
    };

    const transactions = [
        Model.cashflow.create({ data }),
        Model.account.update({
            where: { id: cashflowData.kasId },
            data: { currentBalance: sourceNewSaldo },
        }),
    ];

    if (cashflowData.type === "TRANSFER" && cashflowData.toKasId) {
        transactions.push(
            Model.account.update({
                where: { id: cashflowData.toKasId },
                data: { currentBalance: destNewSaldo },
            })
        );
    }

    await Model.$transaction(transactions);

    return { message: "Berhasil membuat Cashflow" };
};

export const updateCashflow = async (
    id: string,
    cashflowData: any,
    userId: string,
    userLevel: string
) => {
    const storeId = await getStoreId(userId, userLevel);

    const existing = await Model.cashflow.findUnique({
        where: { id },
        include: { account: true, toAccount: true },
    });

    if (!existing || existing.storeId !== storeId) {
        throw new ValidationError("Cashflow tidak ditemukan", 404, "cashflow");
    }

    // 1. Reversal Saldo Lama
    const reverseTransactions: any[] = [];

    // Kembalikan saldo sumber
    let reversedSourceBalance =
        existing.account?.currentBalance || new Decimal(0);
    if (existing.type === "IN") {
        reversedSourceBalance = reversedSourceBalance.sub(existing.amount);
    } else {
        // OUT atau TRANSFER
        reversedSourceBalance = reversedSourceBalance.add(existing.amount);
    }
    reverseTransactions.push(
        Model.account.update({
            where: { id: existing.kasId },
            data: { currentBalance: reversedSourceBalance },
        })
    );

    // Kembalikan saldo tujuan jika TRANSFER
    if (
        existing.type === "TRANSFER" &&
        existing.toKasId &&
        existing.toAccount
    ) {
        const reversedDestBalance = (
            existing.toAccount.currentBalance || new Decimal(0)
        ).sub(existing.amount);
        reverseTransactions.push(
            Model.account.update({
                where: { id: existing.toKasId },
                data: { currentBalance: reversedDestBalance },
            })
        );
    }

    // Jalankan reversal dulu untuk mendapatkan balance terbaru (atau asumsikan di memori)
    // Untuk keamanan transaksi, kita gabungkan semua di $transaction akhir.

    // 2. Hitung Saldo Baru
    const newKasId = cashflowData.kasId || existing.kasId;
    const newToKasId = cashflowData.toKasId || existing.toKasId;
    const newType = cashflowData.type || existing.type;
    const newAmount = new Decimal(cashflowData.amount ?? existing.amount);

    // Ambil account info terbaru (setelah reversal di memori)
    const sourceAccount = await Model.account.findUnique({
        where: { id: newKasId },
    });
    if (!sourceAccount || sourceAccount.storeId !== storeId) {
        throw new ValidationError("Kas Asal tidak ditemukan", 404, "kasId");
    }

    // Hitung balance source after reversal jika account-nya sama
    let sourceBalance = sourceAccount.currentBalance || new Decimal(0);
    if (newKasId === existing.kasId) {
        sourceBalance = reversedSourceBalance;
    }

    let destBalance = new Decimal(0);
    if (newType === "TRANSFER") {
        if (!newToKasId)
            throw new ValidationError("Kas Tujuan harus diisi", 400, "toKasId");
        const destAccount = await Model.account.findUnique({
            where: { id: newToKasId },
        });
        if (!destAccount || destAccount.storeId !== storeId) {
            throw new ValidationError(
                "Kas Tujuan tidak ditemukan",
                404,
                "toKasId"
            );
        }
        destBalance = destAccount.currentBalance || new Decimal(0);
        if (newToKasId === existing.toKasId && existing.type === "TRANSFER") {
            destBalance = (
                existing.toAccount?.currentBalance || new Decimal(0)
            ).sub(existing.amount);
        } else if (newToKasId === existing.kasId) {
            destBalance = reversedSourceBalance;
        }
    }

    // Terapkan data baru
    if (newType === "IN") {
        sourceBalance = sourceBalance.add(newAmount);
    } else {
        sourceBalance = sourceBalance.sub(newAmount);
        if (sourceBalance.lessThan(0)) {
            throw new ValidationError("Saldo tidak mencukupi", 400, "amount");
        }
        if (newType === "TRANSFER") {
            destBalance = destBalance.add(newAmount);
        }
    }

    // 3. Final Transaction
    const finalTransactions = [
        // Update account sumber (old atau new)
        Model.account.update({
            where: { id: newKasId },
            data: { currentBalance: sourceBalance },
        }),
        // Update cashflow record
        Model.cashflow.update({
            where: { id },
            data: {
                storeId: storeId, // Ensure storeId is maintained or set if missing
                kasId: newKasId,
                toKasId: newType === "TRANSFER" ? newToKasId : null,
                type: newType,
                amount: newAmount,
                description: cashflowData.description ?? existing.description,
            },
        }),
    ];

    // Jika kasId berubah, kembalikan saldo kasId lama
    if (newKasId !== existing.kasId) {
        finalTransactions.push(
            Model.account.update({
                where: { id: existing.kasId },
                data: { currentBalance: reversedSourceBalance },
            })
        );
    }

    if (newType === "TRANSFER") {
        finalTransactions.push(
            Model.account.update({
                where: { id: newToKasId },
                data: { currentBalance: destBalance },
            })
        );
        // Jika toKasId berubah, kembalikan saldo toKasId lama
        if (
            existing.type === "TRANSFER" &&
            existing.toKasId &&
            newToKasId !== existing.toKasId
        ) {
            const oldDestReversedBalance = (
                existing.toAccount?.currentBalance || new Decimal(0)
            ).sub(existing.amount);
            finalTransactions.push(
                Model.account.update({
                    where: { id: existing.toKasId },
                    data: { currentBalance: oldDestReversedBalance },
                })
            );
        }
    } else if (existing.type === "TRANSFER" && existing.toKasId) {
        // Jika dulu transfer sekarang bukan, kembalikan saldo toKasId lama
        const oldDestReversedBalance = (
            existing.toAccount?.currentBalance || new Decimal(0)
        ).sub(existing.amount);
        finalTransactions.push(
            Model.account.update({
                where: { id: existing.toKasId },
                data: { currentBalance: oldDestReversedBalance },
            })
        );
    }

    await Model.$transaction(finalTransactions);

    return { message: "Berhasil mengupdate Cashflow" };
};

/**
 * Revert cashflow berdasarkan referenceId dan referenceType
 * Digunakan saat transaksi (Sale/Purchase) dihapus atau diupdate
 */
export const revertCashflowByReference = async (
    tx: any,
    referenceId: string,
    referenceType: string,
    storeId: string
): Promise<void> => {
    // Cari semua cashflow terkait transaction ini yang belum dihapus
    const cashflows = await tx.cashflow.findMany({
        where: {
            storeId,
            referenceId,
            referenceType,
            deletedAt: null,
        },
    });

    for (const cf of cashflows) {
        // 1. Revert Saldo Sumber (kasId)
        // Logika Revert Kebalikan dari Create
        // ASAL: IN (+), OUT (-), TRANSFER (-)
        // REVERT: IN (-), OUT (+), TRANSFER (+)

        const kasAccount = await tx.account.findUnique({
            where: { id: cf.kasId },
            select: { currentBalance: true },
        });

        if (kasAccount) {
            const currentBalance = kasAccount.currentBalance || new Decimal(0);
            const amount = new Decimal(cf.amount);

            let newBalance;
            if (cf.type === "IN") {
                // Dulu nambah, sekarang kurangi
                newBalance = currentBalance.sub(amount);
            } else {
                // OUT / TRANSFER: Dulu kurang, sekarang tambah
                newBalance = currentBalance.add(amount);
            }

            await tx.account.update({
                where: { id: cf.kasId },
                data: { currentBalance: newBalance },
            });
        }

        // 2. Revert Saldo Tujuan (toKasId) jika ada (TRANSFER)
        if (cf.toKasId) {
            const toKasAccount = await tx.account.findUnique({
                where: { id: cf.toKasId },
                select: { currentBalance: true },
            });

            if (toKasAccount) {
                const toCurrentBalance =
                    toKasAccount.currentBalance || new Decimal(0);
                const amount = new Decimal(cf.amount);

                // Dulu tujuan selalu ditambah (+), sekarang kurangi (-)
                await tx.account.update({
                    where: { id: cf.toKasId },
                    data: { currentBalance: toCurrentBalance.sub(amount) },
                });
            }
        }

        // 3. Soft Delete Cashflow
        await tx.cashflow.update({
            where: { id: cf.id },
            data: { deletedAt: new Date() },
        });
    }
};

export const deleteCashflow = async (
    id: string,
    userId: string,
    userLevel: string
) => {
    const storeId = await getStoreId(userId, userLevel);

    const cashflow = await Model.cashflow.findUnique({
        where: { id },
        include: { account: true, toAccount: true },
    });

    if (!cashflow || cashflow.storeId !== storeId) {
        throw new ValidationError("Cashflow tidak ditemukan", 404, "cashflow");
    }

    // Reverse saldo
    const transactions: any[] = [];

    let sourceNewBalance = cashflow.account?.currentBalance || new Decimal(0);
    if (cashflow.type === "IN") {
        sourceNewBalance = sourceNewBalance.sub(cashflow.amount);
    } else {
        sourceNewBalance = sourceNewBalance.add(cashflow.amount);
    }

    transactions.push(
        Model.account.update({
            where: { id: cashflow.kasId },
            data: { currentBalance: sourceNewBalance },
        })
    );

    if (
        cashflow.type === "TRANSFER" &&
        cashflow.toKasId &&
        cashflow.toAccount
    ) {
        const destNewBalance = (
            cashflow.toAccount.currentBalance || new Decimal(0)
        ).sub(cashflow.amount);
        transactions.push(
            Model.account.update({
                where: { id: cashflow.toKasId },
                data: { currentBalance: destNewBalance },
            })
        );
    }

    transactions.push(
        Model.cashflow.update({
            where: { id },
            data: { deletedAt: new Date() },
        })
    );

    await Model.$transaction(transactions);

    return { message: "Berhasil menghapus Cashflow" };
};

export const getCashflowById = async (
    id: string,
    userId: string,
    userLevel: string
) => {
    const storeId = await getStoreId(userId, userLevel);

    const cashflow = await Model.cashflow.findUnique({
        where: { id },
        include: {
            account: { select: { id: true, name: true, storeId: true } },
            toAccount: { select: { id: true, name: true, storeId: true } },
        },
    });

    if (!cashflow || cashflow.storeId !== storeId || cashflow.deletedAt) {
        throw new ValidationError("Cashflow tidak ditemukan", 404, "cashflow");
    }

    return {
        message: "Berhasil mendapatkan data Cashflow",
        data: { cashflow },
    };
};
