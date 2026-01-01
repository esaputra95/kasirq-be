import Model from "#root/services/PrismaService";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";
import { calculateDistance } from "#root/helpers/calculateDistance";
import getOwnerId from "#root/helpers/GetOwnerId";
import { ValidationError } from "#root/helpers/handleErrors";

export const getTodayStatus = async (userId: string) => {
    const today = moment().startOf("day").toDate();
    const tomorrow = moment().endOf("day").toDate();

    const attendance = await Model.attendances.findFirst({
        where: {
            userId,
            checkInAt: {
                gte: today,
                lte: tomorrow,
            },
        },
        include: {
            store: true,
        },
        orderBy: {
            checkInAt: "desc",
        },
    });

    return {
        message: "Success get today attendance status",
        data: attendance,
    };
};

export const checkIn = async (userId: string, body: any) => {
    const { lat, lng, deviceId, note, photoInUrl } = body;

    const user = await Model.users.findUnique({
        where: { id: userId },
    });

    if (!user || (!user.storeId && user.level !== "owner")) {
        throw new ValidationError(
            "User not associated with any store",
            400,
            "attendance"
        );
    }

    const storeId = user.storeId || body?.storeId;
    const store = await Model.stores.findUnique({
        where: { id: storeId },
    });

    if (!store) {
        throw new ValidationError("Store not found", 400, "attendance");
    }

    // Check if already checked in today
    const today = moment().startOf("day").toDate();
    const tomorrow = moment().endOf("day").toDate();
    const existing = await Model.attendances.findFirst({
        where: {
            userId,
            checkInAt: {
                gte: today,
                lte: tomorrow,
            },
        },
    });

    if (existing) {
        throw new ValidationError(
            "You have already checked in today",
            400,
            "attendance"
        );
    }

    let distance = null;
    let status: any = "VALID";

    console.log({ store });

    if (store.requireLocation) {
        if (lat && lng && store.latitude && store.longitude) {
            distance = calculateDistance(
                Number(lat),
                Number(lng),
                Number(store.latitude),
                Number(store.longitude)
            );

            if (store.locationRadius && distance > store.locationRadius) {
                if (!body.isForce) {
                    throw new ValidationError(
                        "Anda berada di luar jangkauan store. Apakah Anda yakin ingin lanjut?",
                        400,
                        "OUT_OF_RANGE"
                    );
                }
                status = "OUT_OF_RANGE";
            }
        } else {
            if (!body.isForce) {
                throw new ValidationError(
                    "Lokasi tidak ditemukan atau tidak tersedia. Apakah Anda yakin ingin lanjut?",
                    400,
                    "OUT_OF_RANGE"
                );
            }
            status = "INVALID";
        }
    } else {
        status = "NO_LOCATION_REQUIRED";
    }

    const ownerIdRes = await getOwnerId(user.id, user.level || "");
    const ownerId = (ownerIdRes as any).id;

    const attendance = await Model.attendances.create({
        data: {
            id: uuidv4(),
            userId,
            storeId,
            ownerId,
            checkInAt: new Date(),
            checkInLat: lat ? Number(lat) : null,
            checkInLng: lng ? Number(lng) : null,
            checkInDistance: distance,
            checkInStatus: status,
            isLocationRequired: store.requireLocation || false,
            deviceId,
            note,
            photoInUrl,
        },
    });

    return {
        message: "Check-in successful",
        data: attendance,
    };
};

export const checkOut = async (userId: string, body: any) => {
    const { lat, lng, photoOutUrl, note } = body;

    const today = moment().startOf("day").toDate();
    const tomorrow = moment().endOf("day").toDate();

    const attendance = await Model.attendances.findFirst({
        where: {
            userId,
            checkInAt: {
                gte: today,
                lte: tomorrow,
            },
            checkOutAt: null,
        },
        include: {
            store: true,
        },
    });

    if (!attendance) {
        throw new ValidationError(
            "No active check-in found for today or already checked out",
            400,
            "attendance"
        );
    }

    let distance = null;
    let status: any = "VALID";

    console.log(attendance);

    if (attendance.isLocationRequired) {
        if (
            lat &&
            lng &&
            attendance.store.latitude &&
            attendance.store.longitude
        ) {
            distance = calculateDistance(
                Number(lat),
                Number(lng),
                Number(attendance.store.latitude),
                Number(attendance.store.longitude)
            );

            if (
                attendance.store.locationRadius &&
                distance > attendance.store.locationRadius
            ) {
                if (!body.isForce) {
                    throw new ValidationError(
                        "Anda berada di luar jangkauan store. Apakah Anda yakin ingin lanjut?",
                        400,
                        "OUT_OF_RANGE"
                    );
                }
                status = "OUT_OF_RANGE";
            }
        } else {
            if (!body.isForce) {
                throw new ValidationError(
                    "Lokasi tidak ditemukan atau tidak tersedia. Apakah Anda yakin ingin lanjut?",
                    400,
                    "OUT_OF_RANGE"
                );
            }
            status = "INVALID";
        }
    } else {
        status = "NO_LOCATION_REQUIRED";
    }

    const updated = await Model.attendances.update({
        where: { id: attendance.id },
        data: {
            checkOutAt: new Date(),
            checkOutLat: lat ? Number(lat) : null,
            checkOutLng: lng ? Number(lng) : null,
            checkOutDistance: distance,
            checkOutStatus: status,
            photoOutUrl,
            note: note || attendance.note,
        },
    });

    return {
        message: "Check-out successful",
        data: updated,
    };
};

export const getHistory = async (userId: string, query: any) => {
    const take = Number(query.limit) || 10;
    const page = Number(query.page) || 0;
    const skip = page * take;

    const data = await Model.attendances.findMany({
        where: { userId },
        orderBy: { checkInAt: "desc" },
        take,
        skip,
    });

    const total = await Model.attendances.count({
        where: { userId },
    });

    return {
        message: "Success get attendance history",
        data: {
            attendances: data,
            info: {
                page,
                limit: take,
                total,
            },
        },
    };
};

export const getData = async (ownerId: string, query: any) => {
    const take: number = parseInt(query.limit ?? "20");
    const page: number = parseInt(query.page ?? "1");
    const skip: number = (page - 1) * take;
    const where: any = { ownerId };

    if (query.storeId) where.storeId = query.storeId;
    if (query.userId) where.userId = query.userId;
    if (query.startDate || query.endDate) {
        where.checkInAt = {
            ...(query.startDate
                ? { gte: moment(query.startDate).startOf("day").toDate() }
                : {}),
            ...(query.endDate
                ? { lte: moment(query.endDate).endOf("day").toDate() }
                : {}),
        };
    }
    if (query.name) {
        where.users = {
            name: { contains: query.name },
        };
    }

    const data = await Model.attendances.findMany({
        where,
        include: {
            store: true,
            users: {
                select: { name: true, phone: true },
            },
        },
        orderBy: { checkInAt: "desc" },
        take,
        skip,
    });

    const total = await Model.attendances.count({ where });

    return {
        message: "successful in getting attendances data",
        data: {
            attendances: data,
            info: {
                page,
                limit: take,
                total,
            },
        },
    };
};
