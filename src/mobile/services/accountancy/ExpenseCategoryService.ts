import Model from "#root/services/PrismaService";
import { ExpenseCategoryQueryInterface } from "#root/interfaces/accountancy/ExpenseCategoryInterface";
import { v4 as uuidv4 } from "uuid";
import getOwnerId from "#root/helpers/GetOwnerId";
import { ValidationError } from "#root/helpers/handleErrors";

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

export const getExpenseCategories = async (
    query: ExpenseCategoryQueryInterface,
    userId: string,
    userLevel: string
) => {
    const storeId = await getStoreId(userId, userLevel);
    const take: number = parseInt(query.limit ?? "20");
    const page: number = parseInt(query.page ?? "1");
    const skip: number = (page - 1) * take;

    let filter: any = { storeId, deletedAt: null };
    if (query.name) filter.name = { contains: query.name };

    const [data, total] = await Promise.all([
        Model.expenseCategory.findMany({
            where: filter,
            skip,
            take,
            orderBy: { createdAt: "desc" },
        }),
        Model.expenseCategory.count({ where: filter }),
    ]);

    return {
        message: "Berhasil mendapatkan data Kategori Pengeluaran",
        data: {
            expenseCategories: data,
            info: { page, limit: take, total },
        },
    };
};

export const createExpenseCategory = async (
    categoryData: any,
    userId: string,
    userLevel: string
) => {
    const storeId = await getStoreId(userId, userLevel);

    const data = {
        id: uuidv4(),
        storeId,
        name: categoryData.name,
        description: categoryData.description,
    };

    await Model.expenseCategory.create({ data });

    return { message: "Berhasil membuat Kategori Pengeluaran" };
};

export const updateExpenseCategory = async (
    id: string,
    categoryData: any,
    userId: string,
    userLevel: string
) => {
    const storeId = await getStoreId(userId, userLevel);

    const existing = await Model.expenseCategory.findUnique({ where: { id } });
    if (!existing || existing.storeId !== storeId) {
        throw new ValidationError(
            "Kategori Pengeluaran tidak ditemukan",
            404,
            "expenseCategory"
        );
    }

    await Model.expenseCategory.update({
        where: { id },
        data: {
            name: categoryData.name,
            description: categoryData.description,
            updatedAt: new Date(),
        },
    });

    return { message: "Berhasil mengupdate Kategori Pengeluaran" };
};

export const deleteExpenseCategory = async (
    id: string,
    userId: string,
    userLevel: string
) => {
    const storeId = await getStoreId(userId, userLevel);

    const existing = await Model.expenseCategory.findUnique({ where: { id } });
    if (!existing || existing.storeId !== storeId) {
        throw new ValidationError(
            "Kategori Pengeluaran tidak ditemukan",
            404,
            "expenseCategory"
        );
    }

    // Soft delete
    await Model.expenseCategory.update({
        where: { id },
        data: { deletedAt: new Date() },
    });

    return { message: "Berhasil menghapus Kategori Pengeluaran" };
};

export const getExpenseCategoryById = async (
    id: string,
    userId: string,
    userLevel: string
) => {
    const storeId = await getStoreId(userId, userLevel);

    const expenseCategory = await Model.expenseCategory.findUnique({
        where: { id },
    });

    if (
        !expenseCategory ||
        expenseCategory.storeId !== storeId ||
        expenseCategory.deletedAt
    ) {
        throw new ValidationError(
            "Kategori Pengeluaran tidak ditemukan",
            404,
            "expenseCategory"
        );
    }

    return {
        message: "Berhasil mendapatkan data Kategori Pengeluaran",
        data: { expenseCategory },
    };
};

export const getExpenseCategoriesForSelect = async (
    name: string | undefined,
    userId: string,
    userLevel: string
) => {
    const storeId = await getStoreId(userId, userLevel);

    let filter: any = { storeId, deletedAt: null };
    if (name) filter.name = { contains: name };

    const data = await Model.expenseCategory.findMany({
        where: filter,
        take: 25,
    });
    const dataOption = data.map((value: { id: string; name: string }) => ({
        value: value.id,
        label: value.name,
    }));

    return {
        message: "Berhasil mendapatkan data Kategori Pengeluaran",
        data: { expenseCategories: dataOption },
    };
};
