import Model from "#root/services/PrismaService";
import moment from "moment";

export const getAttendanceReport = async (filters: {
    start: string;
    finish: string;
    storeId?: string;
    userId?: string;
    ownerId: string;
}) => {
    let filter: any = {
        ownerId: filters.ownerId,
    };

    if (filters.storeId) filter.storeId = filters.storeId;
    if (filters.userId) filter.userId = filters.userId;

    const start = moment(filters.start, "YYYY-MM-DD").startOf("day").toDate();
    const end = moment(filters.finish, "YYYY-MM-DD").endOf("day").toDate();

    const data = await Model.attendances.findMany({
        where: {
            checkInAt: { gte: start, lte: end },
            ...filter,
        },
        include: {
            store: {
                select: { name: true },
            },
            users: {
                select: { name: true },
            },
        },
        orderBy: { checkInAt: "desc" },
    });

    const summary = {
        total: data.length,
        valid: data.filter((a) => a.checkInStatus === "VALID").length,
        outOfRange: data.filter((a) => a.checkInStatus === "OUT_OF_RANGE")
            .length,
        invalid: data.filter((a) => a.checkInStatus === "INVALID").length,
        noLocation: data.filter(
            (a) => a.checkInStatus === "NO_LOCATION_REQUIRED"
        ).length,
    };

    return {
        message: "Success get attendance report",
        data: {
            attendances: data,
            summary,
        },
    };
};
