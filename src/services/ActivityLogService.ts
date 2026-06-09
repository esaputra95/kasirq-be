import moment from "moment";
import { Prisma } from "@prisma/client";
import Model from "#root/services/PrismaService";

export interface ActivityLogQuery {
    page?: string;
    limit?: string;
    storeId?: string;
    userId?: string;
    module?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
}

export const getActivityLogs = async (
    query: ActivityLogQuery,
    requester: { userId?: string; level?: string },
) => {
    const take = parseInt(query.limit ?? "20");
    const page = parseInt(query.page ?? "1");
    const skip = (page - 1) * take;

    const where: Prisma.activityLogsWhereInput = {};

    if (query.storeId) where.storeId = query.storeId;
    if (query.userId) where.userId = query.userId;
    if (query.module) where.module = query.module;
    if (query.action) where.action = query.action;

    if (query.startDate || query.endDate) {
        where.createdAt = {
            ...(query.startDate && {
                gte: moment(query.startDate, "YYYY-MM-DD")
                    .startOf("day")
                    .toDate(),
            }),
            ...(query.endDate && {
                lte: moment(query.endDate, "YYYY-MM-DD").endOf("day").toDate(),
            }),
        };
    }

    if (requester.level === "owner" && requester.userId) {
        where.OR = [{ ownerId: requester.userId }, { userId: requester.userId }];
    }

    const [activityLogs, total] = await Promise.all([
        Model.activityLogs.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                store: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            skip,
            take,
        }),
        Model.activityLogs.count({ where }),
    ]);

    return {
        message: "successful in getting activity log data",
        data: {
            activityLogs,
            info: {
                page,
                limit: take,
                total,
            },
        },
    };
};
