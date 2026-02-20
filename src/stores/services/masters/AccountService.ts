import Model from "#root/services/PrismaService";
import { AccountQueryInterface } from "#root/interfaces/masters/AccountInterface";
import { v4 as uuidv4 } from "uuid";
import getOwnerId from "#root/helpers/GetOwnerId";
import { ValidationError } from "#root/helpers/handleErrors";

export const getAccounts = async (
    query: AccountQueryInterface,
    userId: string,
    userType: string
) => {
    const owner: any = await getOwnerId(userId, userType);
    const take: number = parseInt(query.limit ?? "20");
    const page: number = parseInt(query.page ?? "1");
    const skip: number = (page - 1) * take;
    let filter: any = [];
    if (query.name) filter.push({ name: { contains: query.name } });
    const whereClause: any =
        filter.length > 0
            ? { OR: filter, ownerId: owner.id }
            : { ownerId: owner.id };
    if (query.storeId) {
        whereClause.storeId = query.storeId;
    }

    const [data, total] = await Promise.all([
        Model.account.findMany({ where: whereClause, skip, take }),
        Model.account.count({ where: whereClause }),
    ]);
    return {
        message: "successful in getting Account data",
        data: { Account: data, info: { page, limit: take, total } },
    };
};

export const createAccount = async (
    accountData: any,
    userId: string,
    userType: string
) => {
    const ownerId: any = await getOwnerId(userId, userType);
    if (!ownerId.status)
        throw new ValidationError("Owner not found", 404, "owner");
    const data = { ...accountData, id: uuidv4(), ownerId: ownerId.id };
    await Model.account.create({ data });
    return { message: "successful in created Account data" };
};

export const updateAccount = async (
    id: string,
    accountData: any,
    userId: string,
    userType: string
) => {
    const ownerId: any = await getOwnerId(userId, userType);
    if (!ownerId.status)
        throw new ValidationError("Owner not found", 404, "owner");
    const data = { ...accountData, ownerId: ownerId.id };
    await Model.account.update({ where: { id }, data });
    return { message: "successful in updated Account data" };
};

export const deleteAccount = async (id: string) => {
    await Model.account.delete({ where: { id } });
    return { message: "successfully in deleted Account data" };
};

export const getAccountById = async (id: string) => {
    const account = await Model.account.findUnique({ where: { id } });
    if (!account) throw new ValidationError("data not found", 404, "account");
    return {
        message: "successfully in get Account data",
        data: { Account: account },
    };
};

export const getAccountsForSelect = async (
    name: string | undefined,
    userId: string,
    userType: string
) => {
    const owner: any = await getOwnerId(userId, userType);
    let filter: any = {};
    if (name) filter = { ...filter, name: { contains: name } };
    const data = await Model.account.findMany({
        where: { ...filter, ownerId: owner?.id },
        take: 10,
    });
    const dataOption = [
        { value: "", label: "Semua" },
        { value: "cash", label: "Cash" },
        ...data.map((value) => ({ value: value.id, label: value.name })),
    ];
    return {
        message: "successfully in get Accounts data",
        data: { Account: dataOption },
    };
};
