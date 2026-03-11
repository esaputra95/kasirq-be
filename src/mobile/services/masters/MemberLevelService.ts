import Model from "#root/services/PrismaService";
import { MemberLevelQueryInterface } from "#root/interfaces/masters/MemberLevelInterface";
import { v4 as uuidv4 } from "uuid";
import getOwnerId from "#root/helpers/GetOwnerId";
import { ValidationError } from "#root/helpers/handleErrors";

/**
 * Get member levels with filtering and pagination
 */
export const getMemberLevels = async (
    query: MemberLevelQueryInterface,
    userId: string,
    userLevel: string,
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
        Model.memberLevels.findMany({
            where: whereClause,
            skip,
            take,
        }),
        Model.memberLevels.count({
            where: whereClause,
        }),
    ]);

    return {
        message: "successful in getting Member Level data",
        data: {
            memberLevel: data,
            info: {
                page,
                limit: take,
                total,
            },
        },
    };
};

/**
 * Create new member level
 */
export const createMemberLevel = async (
    memberLevelData: any,
    userId: string,
    userLevel: string,
) => {
    const owner: any = await getOwnerId(userId, userLevel);

    if (!owner.status) {
        throw new ValidationError("Owner not found", 404, "owner");
    }

    const data = {
        name: memberLevelData.name,
        level: parseInt(memberLevelData.level + ""),
        id: uuidv4(),
        ownerId: owner.id,
        userCreate: userId,
    };

    await Model.memberLevels.create({ data });

    return {
        message: "successful in created Member Level data",
    };
};

/**
 * Update member level
 */
export const updateMemberLevel = async (id: string, memberLevelData: any) => {
    await Model.memberLevels.update({
        where: { id },
        data: {
            name: memberLevelData.name,
            level: parseInt(memberLevelData.level + ""),
        },
    });

    return {
        message: "successful in updated Member Level data",
    };
};

/**
 * Delete member level
 */
export const deleteMemberLevel = async (id: string) => {
    await Model.memberLevels.delete({
        where: { id },
    });

    return {
        message: "successfully in deleted Member Level data",
    };
};

/**
 * Get member level by ID
 */
export const getMemberLevelById = async (id: string) => {
    const memberLevel = await Model.memberLevels.findUnique({
        where: { id },
    });

    if (!memberLevel) {
        throw new ValidationError("data not found", 404, "memberLevel");
    }

    return {
        message: "successfully in get Member Level data",
        data: {
            memberLevel: memberLevel,
        },
    };
};

/**
 * Get member levels for select dropdown
 */
export const getMemberLevelsForSelect = async (
    name: string | undefined,
    userId: string,
    userLevel: string,
) => {
    console.log("oke");

    const owner: any = await getOwnerId(userId, userLevel);

    console.log(owner);

    let filter: any = {};
    if (name) filter = { ...filter, name: { contains: name } };

    const data = await Model.memberLevels.findMany({
        where: {
            ...filter,
            ownerId: owner.id,
        },
        orderBy: {
            level: "asc",
        },
    });

    const dataOption = data.map((value) => ({
        value: value.id,
        label: value.name,
    }));

    return {
        message: "successfully in get Member Level data",
        data: {
            memberLevel: dataOption,
        },
    };
};
