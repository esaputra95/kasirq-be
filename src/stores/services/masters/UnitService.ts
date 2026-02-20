import Model from "#root/services/PrismaService";
import { UnitQueryInterface } from "#root/interfaces/masters/UnitInterface";
import { v4 as uuidv4 } from "uuid";
import getOwnerId from "#root/helpers/GetOwnerId";
import moment from "moment";
import { ValidationError } from "#root/helpers/handleErrors";

/**
 * Get units with filtering and pagination
 */
export const getUnits = async (
    query: UnitQueryInterface,
    userId: string,
    userLevel: string
) => {
    const owner: any = await getOwnerId(userId, userLevel);

    const take: number = parseInt(query.limit ?? "50");
    const page: number = parseInt(query.page ?? "1");
    const skip: number = (page - 1) * take;

    let filter: any = [];
    if (query.name) filter.push({ name: { contains: query.name } });

    const whereClause: any =
        filter.length > 0
            ? { OR: filter, ownerId: owner.id }
            : { ownerId: owner.id };

    const [data, total] = await Promise.all([
        Model.units.findMany({
            where: whereClause,
            skip,
            take,
            orderBy: { name: "asc" },
        }),
        Model.units.count({
            where: whereClause,
        }),
    ]);

    return {
        message: "successful in getting Unit data",
        data: {
            unit: data,
            info: {
                page,
                limit: take,
                total,
            },
        },
    };
};

/**
 * Create new unit
 */
export const createUnit = async (
    unitData: any,
    userId: string,
    userLevel: string
) => {
    const ownerId: any = await getOwnerId(userId, userLevel);

    if (!ownerId.status) {
        throw new ValidationError("Owner not found", 404, "owner");
    }

    const data = { ...unitData, id: uuidv4(), ownerId: ownerId.id };
    delete data.storeId;

    await Model.units.create({ data });

    return {
        message: "successful in created Unit data",
    };
};

/**
 * Update unit
 */
export const updateUnit = async (id: string, unitData: any) => {
    await Model.units.update({
        where: { id },
        data: {
            id: unitData.id,
            name: unitData.name,
            ownerId: unitData.ownerId,
            description: unitData.description,
            updatedAt: moment().format(),
        },
    });

    return {
        message: "successful in updated Unit data",
    };
};

/**
 * Delete unit
 */
export const deleteUnit = async (id: string) => {
    await Model.units.delete({
        where: { id },
    });

    return {
        message: "successfully in deleted Unit data",
    };
};

/**
 * Get unit by ID
 */
export const getUnitById = async (id: string) => {
    const unit = await Model.units.findUnique({
        where: { id },
    });

    if (!unit) {
        throw new ValidationError("data not found", 404, "unit");
    }

    return {
        message: "successfully in get Unit data",
        data: {
            unit,
        },
    };
};

/**
 * Get units for select dropdown
 */
export const getUnitsForSelect = async (
    name: string | undefined,
    userId: string,
    userLevel: string
) => {
    const owner: any = await getOwnerId(userId, userLevel);

    let filter: any = {};
    if (name) filter = { ...filter, name: { contains: name } };

    const data = await Model.units.findMany({
        where: {
            ...filter,
            ownerId: owner.id,
        },
        take: 100,
        orderBy: {
            name: "asc",
        },
    });

    const dataOption = data.map((value) => ({
        value: value.id,
        label: value.name,
    }));

    return {
        message: "successfully in get Units data",
        data: {
            unit: dataOption,
        },
    };
};
