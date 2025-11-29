import Model from "#root/services/PrismaService";
import { SupplierQueryInterface } from "#root/interfaces/masters/SupplierInterface";
import { v4 as uuidv4 } from "uuid";
import getOwnerId from "#root/helpers/GetOwnerId";
import { ValidationError } from "#root/helpers/handleErrors";

export const getSuppliers = async (
    query: SupplierQueryInterface,
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
        Model.suppliers.findMany({ where: whereClause, skip, take }),
        Model.suppliers.count({ where: whereClause }),
    ]);
    return {
        message: "successful in getting Supplier data",
        data: { supplier: data, info: { page, limit: take, total } },
    };
};

export const createSupplier = async (
    supplierData: any,
    userId: string,
    userLevel: string
) => {
    const ownerId: any = await getOwnerId(userId, userLevel);
    if (!ownerId.status)
        throw new ValidationError("Owner not found", 404, "owner");
    const data = { ...supplierData, id: uuidv4(), ownerId: ownerId.id };
    delete data.storeId;
    await Model.suppliers.create({ data });
    return { message: "successful in created Supplier data" };
};

export const updateSupplier = async (id: string, supplierData: any) => {
    await Model.suppliers.update({
        where: { id },
        data: {
            id: supplierData.id,
            address: supplierData.address,
            name: supplierData.name,
        },
    });
    return { message: "successful in updated Supplier data" };
};

export const deleteSupplier = async (id: string) => {
    await Model.suppliers.delete({ where: { id } });
    return { message: "successfully in deleted Supplier data" };
};

export const getSupplierById = async (id: string) => {
    const supplier = await Model.suppliers.findUnique({ where: { id } });
    if (!supplier) throw new ValidationError("data not found", 404, "supplier");
    return {
        message: "successfully in get Supplier data",
        data: { Supplier: supplier },
    };
};

export const getSuppliersForSelect = async (
    name: string | undefined,
    userId: string,
    userLevel: string
) => {
    const owner: any = await getOwnerId(userId, userLevel);
    let filter: any = {};
    if (name) filter = { ...filter, name: { contains: name } };
    const data = await Model.suppliers.findMany({
        where: { ...filter, ownerId: owner.id },
        take: 25,
    });
    const dataOption = data.map((value) => ({
        key: value.id,
        value: value.name,
    }));
    return {
        message: "successfully in get Supplier data",
        data: { supplier: dataOption },
    };
};
