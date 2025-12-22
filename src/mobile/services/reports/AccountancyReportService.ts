import Model from "#root/services/PrismaService";
import moment from "moment";
import { Decimal } from "@prisma/client/runtime/library";

export const getAccountancyReport = async (filters: {
    start: string;
    finish: string;
    storeId: string;
    accountId?: string;
}) => {
    const startDate = moment(filters.start, "YYYY-MM-DD")
        .startOf("day")
        .toDate();
    const endDate = moment(filters.finish, "YYYY-MM-DD").endOf("day").toDate();

    // 1. Get Summary of Cashflows
    // We filter by account.storeId since cashflow doesn't have storeId directly
    const cashflows = await Model.cashflow.findMany({
        where: {
            storeId: filters.storeId,
            kasId: filters?.accountId || undefined,
            createdAt: { gte: startDate, lte: endDate },
            deletedAt: null,
        },
    });

    let totalIn = new Decimal(0);
    let totalOut = new Decimal(0);
    let totalTransfer = new Decimal(0);
    let totalExpense = new Decimal(0);

    cashflows.forEach((cf) => {
        const amount = new Decimal(cf.amount);
        if (cf.type === "IN") {
            totalIn = totalIn.add(amount);
        } else if (cf.type === "OUT") {
            if (cf.referenceType === "EXPENSE") {
                totalExpense = totalExpense.add(amount);
            } else {
                totalOut = totalOut.add(amount); // Manual Out or others
            }
        } else if (cf.type === "TRANSFER") {
            totalTransfer = totalTransfer.add(amount);
        }
    });

    // 2. Get Account Balances
    const accounts = await Model.account.findMany({
        where: {
            storeId: filters.storeId,
            deletedAt: null,
        },
        select: {
            id: true,
            name: true,
            currentBalance: true,
        },
    });

    return {
        message: "Success get accountancy report",
        data: {
            summary: {
                totalCashIn: totalIn,
                totalCashOut: totalOut,
                totalTransfer: totalTransfer,
                totalExpense: totalExpense,
                netCashflow: totalIn.sub(totalOut).sub(totalExpense),
            },
            accounts: accounts,
            // You can add more detail if needed, like recent transactions
            recentTransactions: cashflows.slice(0, 10),
        },
    };
};

export const getAccountBalances = async (storeId: string) => {
    const accounts = await Model.account.findMany({
        where: {
            storeId: storeId,
            deletedAt: null,
        },
    });

    return {
        message: "Success get account balances",
        data: accounts,
    };
};

export const getTransferReport = async (filters: {
    start: string;
    finish: string;
    storeId: string;
    accountId?: string;
}) => {
    const startDate = moment(filters.start, "YYYY-MM-DD")
        .startOf("day")
        .toDate();
    const endDate = moment(filters.finish, "YYYY-MM-DD").endOf("day").toDate();

    const data = await Model.cashflow.findMany({
        where: {
            storeId: filters.storeId,
            kasId: filters.accountId || undefined,
            type: "TRANSFER",
            createdAt: { gte: startDate, lte: endDate },
            deletedAt: null,
        },
        include: {
            account: { select: { id: true, name: true } },
            toAccount: { select: { id: true, name: true } },
        },
        orderBy: { transactionDate: "desc" },
    });

    return {
        message: "Success get transfer report",
        data,
    };
};

export const getCashInReport = async (filters: {
    start: string;
    finish: string;
    storeId: string;
    accountId?: string;
}) => {
    const startDate = moment(filters.start, "YYYY-MM-DD")
        .startOf("day")
        .toDate();
    const endDate = moment(filters.finish, "YYYY-MM-DD").endOf("day").toDate();

    const data = await Model.cashflow.findMany({
        where: {
            storeId: filters.storeId,
            kasId: filters.accountId || undefined,
            type: "IN",
            referenceType: "MANUAL",
            createdAt: { gte: startDate, lte: endDate },
            deletedAt: null,
        },
        include: {
            account: { select: { id: true, name: true } },
        },
        orderBy: { transactionDate: "desc" },
    });

    return {
        message: "Success get cash in report",
        data,
    };
};

export const getCashOutReport = async (filters: {
    start: string;
    finish: string;
    storeId: string;
    accountId?: string;
}) => {
    const startDate = moment(filters.start, "YYYY-MM-DD")
        .startOf("day")
        .toDate();
    const endDate = moment(filters.finish, "YYYY-MM-DD").endOf("day").toDate();

    const data = await Model.cashflow.findMany({
        where: {
            storeId: filters.storeId,
            kasId: filters.accountId || undefined,
            type: "OUT",
            referenceType: "MANUAL",
            createdAt: { gte: startDate, lte: endDate },
            deletedAt: null,
        },
        include: {
            account: { select: { id: true, name: true } },
        },
        orderBy: { transactionDate: "desc" },
    });

    return {
        message: "Success get cash out report",
        data,
    };
};

export const getExpenseReport = async (filters: {
    start: string;
    finish: string;
    storeId: string;
    accountId?: string;
}) => {
    const startDate = moment(filters.start, "YYYY-MM-DD")
        .startOf("day")
        .toDate();
    const endDate = moment(filters.finish, "YYYY-MM-DD").endOf("day").toDate();

    const data = await Model.expense.findMany({
        where: {
            storeId: filters.storeId,
            accountId: filters.accountId || undefined,
            expenseDate: { gte: startDate, lte: endDate },
            deletedAt: null,
        },
        include: {
            account: { select: { id: true, name: true } },
            category: { select: { id: true, name: true } },
        },
        orderBy: { expenseDate: "desc" },
    });

    return {
        message: "Success get expense report",
        data,
    };
};
