import Model from "#root/services/PrismaService";
import { BrandQueryInterface } from "#root/interfaces/masters/BrandInterface";
import { v4 as uuidv4 } from "uuid";
import getOwnerId from "#root/helpers/GetOwnerId";
import { ValidationError } from "#root/helpers/handleErrors";

/**
 * Get brands with filtering and pagination
 */
export const getBrands = async (query: BrandQueryInterface, userId: string, userType: string) => {
    const owner: any = await getOwnerId(userId, userType);

    const take: number = parseInt(query.limit ?? '20');
    const page: number = parseInt(query.page ?? '1');
    const skip: number = (page - 1) * take;

    let filter: any = [];
    if (query.name) filter.push({ name: { contains: query.name } });

    const whereClause: any = filter.length > 0
        ? { OR: filter, ownerId: owner.id }
        : { ownerId: owner.id };

    const [data, total] = await Promise.all([
        Model.brands.findMany({
            where: whereClause,
            skip,
            take,
        }),
        Model.brands.count({
            where: whereClause,
        })
    ]);

    return {
        message: "successful in getting Brand data",
        data: {
            Brand: data,
            info: {
                page,
                limit: take,
                total,
            },
        },
    };
};

/**
 * Create new brand
 */
export const createBrand = async (brandData: any, userId: string, userType: string) => {
    const ownerId: any = await getOwnerId(userId, userType);
    
    if (!ownerId.status) {
        throw new ValidationError("Owner not found", 404, "owner");
    }

    const data = { ...brandData, id: uuidv4(), ownerId: ownerId.id };
    delete data.storeId;

    await Model.brands.create({ data });

    return {
        message: "successful in created Brand data",
    };
};

/**
 * Update brand
 */
export const updateBrand = async (id: string, brandData: any) => {
    await Model.brands.update({
        where: { id },
        data: {
            id: brandData.id,
            name: brandData.name,
            description: brandData.description,
        },
    });

    return {
        message: "successful in updated Brand data",
    };
};

/**
 * Delete brand
 */
export const deleteBrand = async (id: string) => {
    await Model.brands.delete({
        where: { id },
    });

    return {
        message: "successfully in deleted Brand data",
    };
};

/**
 * Get brand by ID
 */
export const getBrandById = async (id: string) => {
    const brand = await Model.brands.findUnique({
        where: { id },
    });

    if (!brand) {
        throw new ValidationError("data not found", 404, "brand");
    }

    return {
        message: "successfully in get Brand data",
        data: {
            Brand: brand,
        },
    };
};

/**
 * Get brands for select dropdown
 */
export const getBrandsForSelect = async (name: string | undefined, userId: string, userType: string) => {
    const owner: any = await getOwnerId(userId, userType);
    
    let filter: any = {};
    if (name) filter = { ...filter, name: { contains: name } };

    const data = await Model.brands.findMany({
        where: {
            ...filter,
            ownerId: owner.id,
        },
    });

    const dataOption = data.map(value => ({
        value: value.id,
        label: value.name,
    }));

    return {
        message: "successfully in get Brand data",
        data: {
            brand: dataOption,
        },
    };
};
