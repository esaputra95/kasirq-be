import Model from "#root/services/PrismaService";
import { MemberQueryInterface } from "#root/interfaces/masters/MemberInterface";
import { v4 as uuidv4 } from "uuid";
import getOwnerId from "#root/helpers/GetOwnerId";
import { ValidationError } from "#root/helpers/handleErrors";

export const getMembers = async (
    query: MemberQueryInterface,
    userId: string,
    userLevel: string
) => {
    const owner: any = await getOwnerId(userId, userLevel);
    const take = Number(query.limit) > 0 ? Number(query.limit) : 20;
    const page: number = parseInt(query.page ?? "1");
    const skip: number = (page - 1) * take;
    let filter: any = [];
    if (query.name) filter.push({ name: { contains: query.name } });
    const whereClause: any =
        filter.length > 0
            ? { OR: filter, ownerId: owner.id }
            : { ownerId: owner.id };
    const [data, total] = await Promise.all([
        Model.members.findMany({ where: whereClause, skip, take }),
        Model.members.count({ where: whereClause }),
    ]);
    return {
        message: "successful in getting Member data",
        data: { member: data, info: { page, limit: take, total } },
    };
};

export const createMember = async (
    memberData: any,
    userId: string,
    userLevel: string
) => {
    const owner: any = await getOwnerId(userId, userLevel);
    if (!owner.status)
        throw new ValidationError("Owner not found", 404, "owner");
    const data = { ...memberData, id: uuidv4(), ownerId: owner.id };
    delete data.storeId;
    await Model.members.create({ data });
    return { message: "successful in created Member data" };
};

export const updateMember = async (id: string, memberData: any) => {
    await Model.members.update({
        where: { id },
        data: {
            id: memberData.id,
            name: memberData.name,
            address: memberData.address,
            level: parseInt(memberData.level + ""),
            phone: memberData.phone,
        },
    });
    return { message: "successful in updated Member data" };
};

export const deleteMember = async (id: string) => {
    await Model.members.delete({ where: { id } });
    return { message: "successfully in deleted Member data" };
};

export const getMemberById = async (id: string) => {
    const member = await Model.members.findUnique({ where: { id } });
    if (!member) throw new ValidationError("data not found", 404, "member");
    return { message: "successfully in get Member data", data: { member } };
};

export const getMembersForSelect = async (
    name: string | undefined,
    userId: string,
    userLevel: string
) => {
    const owner: any = await getOwnerId(userId, userLevel);
    let filter: any = {};
    if (name) filter = { ...filter, name: { contains: name } };
    const data = await Model.members.findMany({
        where: { ...filter, ownerId: owner.id },
        take: 10,
    });
    const dataOption = [
        { value: "", label: "" },
        ...data.map((value) => ({ key: value.id, value: value.name })),
    ];
    return {
        message: "successfully in get Member data",
        data: { member: dataOption },
    };
};
