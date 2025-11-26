import Model from "#root/services/PrismaService";
import { CategoryQueryInterface } from "#root/interfaces/masters/CategoryInterface";
import { v4 as uuidv4 } from "uuid";
import getOwnerId from "#root/helpers/GetOwnerId";
import { ValidationError } from "#root/helpers/handleErrors";

export const getCategories = async (query: CategoryQueryInterface, userId: string, userLevel: string) => {
    const owner: any = await getOwnerId(userId, userLevel);
    const take: number = parseInt(query.limit ?? '20');
    const page: number = parseInt(query.page ?? '1');
    const skip: number = (page - 1) * take;

    let filter: any = [];
    if (query.name) filter.push({ name: { contains: query.name } });

    const whereClause: any = filter.length > 0 ? { OR: filter, ownerId: owner.id } : { ownerId: owner.id };

    const [data, total] = await Promise.all([
        Model.categories.findMany({ where: whereClause, skip, take }),
        Model.categories.count({ where: whereClause })
    ]);

    return { message: "successful in getting Category data", data: { category: data, info: { page, limit: take, total } } };
};

export const createCategory = async (categoryData: any, userId: string, userLevel: string) => {
    const owner: any = await getOwnerId(userId, userLevel);
    if (!owner.status) throw new ValidationError("Owner not found", 404, "owner");
    
    const data = { ...categoryData, id: uuidv4(), ownerId: owner.id };
    delete data.storeId;
    await Model.categories.create({ data });
    
    return { message: "successful in created Category data" };
};

export const updateCategory = async (id: string, categoryData: any) => {
    await Model.categories.update({
        where: { id },
        data: { id: categoryData.id, name: categoryData.name, ownerId: categoryData.ownerId, description: categoryData.description }
    });
    return { message: "successful in updated Category data" };
};

export const deleteCategory = async (id: string) => {
    await Model.categories.delete({ where: { id } });
    return { message: "successfully in deleted Category data" };
};

export const getCategoryById = async (id: string) => {
    const category = await Model.categories.findUnique({ where: { id } });
    if (!category) throw new ValidationError("data not found", 404, "category");
    return { message: "successfully in get Category data", data: { category } };
};

export const getCategoriesForSelect = async (name: string | undefined, userId: string, userLevel: string) => {
    const owner: any = await getOwnerId(userId, userLevel);
    let filter: any = {};
    if (name) filter = { ...filter, name: { contains: name } };

    const data = await Model.categories.findMany({ where: { ownerId: owner.id }, take: 25 });
    const dataOption = data.map(value => ({ value: value.id, label: value.name }));
    
    return { message: "successfully in get Category data", data: { category: dataOption } };
};
