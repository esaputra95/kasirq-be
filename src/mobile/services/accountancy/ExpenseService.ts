import Model from "#root/services/PrismaService";
import { ExpenseQueryInterface } from "#root/interfaces/accountancy/ExpenseInterface";
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

export const getExpenses = async (
    query: ExpenseQueryInterface,
    userId: string,
    userLevel: string
) => {
    const storeId = await getStoreId(userId, userLevel);
    const take: number = parseInt(query.limit ?? "20");
    const page: number = parseInt(query.page ?? "1");
    const skip: number = (page - 1) * take;

    let filter: any = { storeId, deletedAt: null };

    if (query.id) filter.id = query.id;
    if (query.expenseCategoryId)
        filter.expenseCategoryId = query.expenseCategoryId;
    if (query.startDate && query.endDate) {
        filter.expenseDate = {
            gte: new Date(query.startDate),
            lte: new Date(query.endDate),
        };
    }

    const [data, total] = await Promise.all([
        Model.expense.findMany({
            where: filter,
            skip,
            take,
            orderBy: { expenseDate: "desc" },
            include: {
                account: { select: { id: true, name: true } },
                category: { select: { id: true, name: true } },
            },
        }),
        Model.expense.count({ where: filter }),
    ]);

    return {
        message: "Berhasil mendapatkan data Pengeluaran",
        data: {
            expenses: data,
            info: { page, limit: take, total },
        },
    };
};

export const createExpense = async (
    expenseData: any,
    userId: string,
    userLevel: string
) => {
    const storeId = await getStoreId(userId, userLevel);

    console.log({ expenseData });

    // Validasi kas account
    const account = await Model.account.findUnique({
        where: { id: expenseData.accountId },
    });
    if (!account || account.storeId !== storeId) {
        throw new ValidationError(
            "Kas Account tidak ditemukan",
            404,
            "account"
        );
    }

    // Validasi expense category
    const expenseCategory = await Model.expenseCategory.findUnique({
        where: { id: expenseData.expenseCategoryId },
    });
    if (!expenseCategory || expenseCategory.storeId !== storeId) {
        throw new ValidationError(
            "Kategori Pengeluaran tidak ditemukan",
            404,
            "expenseCategory"
        );
    }

    const amount = new Decimal(expenseData.amount);

    // Cek saldo cukup
    if (account.currentBalance?.lessThan(amount)) {
        throw new ValidationError("Saldo tidak mencukupi", 400, "amount");
    }

    const expenseId = uuidv4();
    const cashflowId = uuidv4();

    const expenseRecord = {
        id: expenseId,
        storeId,
        accountId: expenseData.accountId,
        expenseCategoryId: expenseData.expenseCategoryId,
        amount: amount,
        description: expenseData.description,
        expenseDate: new Date(expenseData.expenseDate),
        userCreate: userId,
    };

    // Create cashflow record for expense (OUT)
    const cashflowRecord = {
        id: cashflowId,
        storeId,
        kasId: expenseData.accountId,
        type: "OUT",
        amount: amount,
        description: `Pengeluaran: ${
            expenseData.description || expenseCategory.name
        }`,
        referenceId: expenseId,
        referenceType: "EXPENSE",
        userCreate: userId,
    };

    // Update saldo
    const newSaldo = account.currentBalance?.sub(amount);

    await Model.$transaction([
        Model.expense.create({ data: expenseRecord }),
        Model.cashflow.create({ data: cashflowRecord }),
        Model.account.update({
            where: { id: expenseData.accountId },
            data: { currentBalance: newSaldo },
        }),
    ]);

    return { message: "Berhasil membuat Pengeluaran" };
};

export const updateExpense = async (
    id: string,
    expenseData: any,
    userId: string,
    userLevel: string
) => {
    const storeId = await getStoreId(userId, userLevel);

    const existing = await Model.expense.findUnique({
        where: { id },
        include: { account: true },
    });
    if (!existing || existing.storeId !== storeId) {
        throw new ValidationError(
            "Pengeluaran tidak ditemukan",
            404,
            "expense"
        );
    }

    // Reverse old amount to kas
    const oldaccount = existing.account;
    let currentSaldo = oldaccount.currentBalance?.add(existing.amount);

    // Validasi kas account baru jika berubah
    let newaccount = oldaccount;
    if (expenseData.accountId && expenseData.accountId !== existing.accountId) {
        const kas = await Model.account.findUnique({
            where: { id: expenseData.accountId },
        });
        if (!kas || kas.storeId !== storeId) {
            throw new ValidationError(
                "Kas Account tidak ditemukan",
                404,
                "account"
            );
        }
        newaccount = kas;
        currentSaldo = kas?.currentBalance ?? undefined;
    }

    const newAmount = new Decimal(expenseData.amount ?? existing.amount);

    // Cek saldo cukup
    if (currentSaldo?.lessThan(newAmount)) {
        throw new ValidationError("Saldo tidak mencukupi", 400, "amount");
    }

    const newSaldo = currentSaldo?.sub(newAmount);

    // Update expense
    await Model.$transaction([
        // Kembalikan saldo kas lama
        Model.account.update({
            where: { id: existing.accountId },
            data: {
                currentBalance: oldaccount?.currentBalance?.add(
                    existing.amount
                ),
            },
        }),
        // Kurangi saldo kas baru
        Model.account.update({
            where: { id: expenseData.accountId ?? existing.accountId },
            data: { currentBalance: newSaldo },
        }),
        // Update expense
        Model.expense.update({
            where: { id },
            data: {
                accountId: expenseData.accountId ?? existing.accountId,
                expenseCategoryId:
                    expenseData.expenseCategoryId ?? existing.expenseCategoryId,
                amount: newAmount,
                description: expenseData.description ?? existing.description,
                expenseDate: expenseData.expenseDate
                    ? new Date(expenseData.expenseDate)
                    : existing.expenseDate,
                updatedAt: new Date(),
            },
        }),
        // Update related cashflow
        Model.cashflow.updateMany({
            where: { referenceId: id, referenceType: "EXPENSE", storeId },
            data: {
                kasId: expenseData.accountId ?? existing.accountId,
                amount: newAmount,
            },
        }),
    ]);

    return { message: "Berhasil mengupdate Pengeluaran" };
};

export const deleteExpense = async (
    id: string,
    userId: string,
    userLevel: string
) => {
    const storeId = await getStoreId(userId, userLevel);

    const existing = await Model.expense.findUnique({
        where: { id },
        include: { account: true },
    });
    if (!existing || existing.storeId !== storeId) {
        throw new ValidationError(
            "Pengeluaran tidak ditemukan",
            404,
            "expense"
        );
    }

    // Kembalikan saldo
    const newSaldo = existing.account.currentBalance?.add(existing.amount);

    await Model.$transaction([
        Model.expense.update({
            where: { id },
            data: { deletedAt: new Date() },
        }),
        Model.cashflow.updateMany({
            where: { referenceId: id, referenceType: "EXPENSE" },
            data: { deletedAt: new Date() },
        }),
        Model.account.update({
            where: { id: existing.accountId },
            data: { currentBalance: newSaldo },
        }),
    ]);

    return { message: "Berhasil menghapus Pengeluaran" };
};

export const getExpenseById = async (
    id: string,
    userId: string,
    userLevel: string
) => {
    const storeId = await getStoreId(userId, userLevel);

    const expense = await Model.expense.findUnique({
        where: { id },
        include: {
            account: { select: { id: true, name: true } },
            category: { select: { id: true, name: true } },
        },
    });

    if (!expense || expense.storeId !== storeId || expense.deletedAt) {
        throw new ValidationError(
            "Pengeluaran tidak ditemukan",
            404,
            "expense"
        );
    }

    return {
        message: "Berhasil mendapatkan data Pengeluaran",
        data: { expense },
    };
};
