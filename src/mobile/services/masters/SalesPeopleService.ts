import Model from "#root/services/PrismaService";
import { SalesPeopleQueryInterface } from "#root/interfaces/masters/SalesPeopleInterface";
import { v4 as uuidv4 } from "uuid";
import getOwnerId from "#root/helpers/GetOwnerId";
import { ValidationError } from "#root/helpers/handleErrors";

export const getSalesPeople = async (
    query: SalesPeopleQueryInterface,
    userId: string,
    userLevel: string
) => {
    const owner: any = await getOwnerId(userId, userLevel);
    const take: number = parseInt(query.limit ?? "20");
    const page: number = parseInt(query.page ?? "1");
    const skip: number = (page - 1) * take;
    let filter: any = [];
    if (query.name) filter.push({ name: { contains: query.name } });
    const whereClause: any =
        filter.length > 0
            ? { OR: filter, ownerId: owner.id }
            : { ownerId: owner.id };
    const [data, total] = await Promise.all([
        Model.salesPeoples.findMany({ where: whereClause, skip, take }),
        Model.salesPeoples.count({ where: whereClause }),
    ]);
    return {
        message: "successful in getting Sales People data",
        data: { salesPeople: data, info: { page, limit: take, total } },
    };
};

export const createSalesPeople = async (
    salesPeopleData: any,
    userId: string,
    userLevel: string
) => {
    const ownerId: any = await getOwnerId(userId, userLevel);
    if (!ownerId.status)
        throw new ValidationError("Owner not found", 404, "owner");
    const data = { ...salesPeopleData, id: uuidv4(), ownerId: ownerId.id };
    delete data.storeId;
    await Model.salesPeoples.create({ data });
    return { message: "successful in created Sales People data" };
};

export const updateSalesPeople = async (id: string, salesPeopleData: any) => {
    await Model.salesPeoples.update({
        where: { id },
        data: {
            id: salesPeopleData.id,
            name: salesPeopleData.name,
            phone: salesPeopleData.phone,
            email: salesPeopleData.email,
        },
    });
    return { message: "successful in updated Sales People data" };
};

export const deleteSalesPeople = async (id: string) => {
    await Model.salesPeoples.delete({ where: { id } });
    return { message: "successfully in deleted Sales People data" };
};

export const getSalesPeopleById = async (id: string) => {
    const salesPeople = await Model.salesPeoples.findUnique({ where: { id } });
    if (!salesPeople)
        throw new ValidationError("data not found", 404, "salesPeople");
    return {
        message: "successfully in get Sales People data",
        data: { salesPeople: salesPeople },
    };
};

export const getSalesPeopleForSelect = async (
    name: string | undefined,
    userId: string,
    userLevel: string
) => {
    const owner: any = await getOwnerId(userId, userLevel);
    let filter: any = {};
    if (name) filter = { ...filter, name: { contains: name } };
    const data = await Model.salesPeoples.findMany({
        where: { ...filter, ownerId: owner.id },
        take: 25,
    });
    const dataOption = data.map((value: any) => ({
        key: value.id,
        value: value.name,
    }));
    return {
        message: "successfully in get Sales People data",
        data: { salesPeople: dataOption },
    };
};
