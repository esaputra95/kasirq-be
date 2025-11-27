import bcrypt from "bcryptjs";
import { UserQueryInterface } from "#root/interfaces/UserInterface";
import Model from "#root/services/PrismaService";
import getOwnerId from "#root/helpers/GetOwnerId";
import { ValidationError } from "#root/helpers/handleErrors";

/**
 * Get users with filtering and pagination
 */
export const getUsers = async (
    query: UserQueryInterface,
    userId?: string,
    userType?: string
) => {
    // PAGING
    const take: number = parseInt(query.limit ?? "20");
    const page: number = parseInt(query.page ?? "1");
    const skip: number = (page - 1) * take;

    // FILTER
    let filter: any = [];
    if (query.name) filter.push({ name: { contains: query.name } });
    if (query.username) filter.push({ username: { contains: query.username } });
    if (query.email) filter.push({ email: { contains: query.email } });
    if (query.phone) filter.push({ phone: { contains: query.phone } });
    if (query.storeId) filter.push({ storeId: query.storeId });

    const whereClause: any =
        filter.length > 0
            ? { OR: filter, verified: "active" as const }
            : { verified: "active" as const };

    const [users, total] = await Promise.all([
        Model.users.findMany({
            where: whereClause,
            skip: skip,
            take: take,
        }),
        Model.users.count({
            where: whereClause,
        }),
    ]);

    return {
        message: "successful in getting user data",
        data: {
            users,
            info: {
                page,
                limit: take,
                total,
            },
        },
    };
};

/**
 * Create new user
 */
export const createUser = async (
    userData: any,
    userId: string,
    userType: string
) => {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    let data = { ...userData, password: hashedPassword };

    // If user is cashier, get owner ID
    if (data.level === "cashier") {
        const owner: any = await getOwnerId(userId, userType);
        data = { ...data, ownerId: owner.id };
    }

    await Model.users.create({
        data: {
            email: data.email,
            username: data.email,
            password: hashedPassword,
            storeId: data.storeId,
            name: data.name,
            level: data.level,
            verified: "active",
        },
    });

    return {
        message: "successful in created user data",
    };
};

/**
 * Update user data
 */
export const updateUser = async (id: string, userData: any) => {
    const data = { ...userData };

    // Hash password if provided
    if (userData.password) {
        const salt = await bcrypt.genSalt();
        data.password = await bcrypt.hash(userData.password, salt);
    } else {
        delete data.password;
    }

    await Model.users.update({
        where: { id },
        data,
    });

    return {
        message: "successful in updated user data",
    };
};

/**
 * Change user password
 */
export const changePassword = async (
    userId: string,
    currentPassword: string,
    newPassword: string
) => {
    // Validation: check if all fields are provided
    if (!currentPassword || !newPassword) {
        throw new ValidationError(
            "All fields are required (currentPassword, newPassword)",
            400,
            "password"
        );
    }

    // Get user from database
    const user = await Model.users.findUnique({
        where: { id: userId },
    });

    if (!user) {
        throw new ValidationError("User not found", 404, "user");
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
    );
    if (!isPasswordValid) {
        throw new ValidationError(
            "Current password is incorrect",
            401,
            "currentPassword"
        );
    }

    // Hash new password and update
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await Model.users.update({
        where: { id: userId },
        data: { password: hashedPassword },
    });

    return {
        message: "Password changed successfully",
    };
};

/**
 * Delete user
 */
export const deleteUser = async (id: string) => {
    await Model.users.delete({
        where: { id },
    });

    return {
        message: "successfully in deleted user data",
    };
};

/**
 * Get user by ID
 */
export const getUserById = async (id: string) => {
    const user = await Model.users.findUnique({
        where: { id },
    });

    if (!user) {
        throw new ValidationError("User not found", 404, "user");
    }

    return {
        message: "successfully in get user data",
        data: {
            users: user,
        },
    };
};

export const getUserCashiers = async (query: UserQueryInterface) => {
    // PAGING
    const take: number = parseInt(query.limit ?? "20");
    const page: number = parseInt(query.page ?? "1");
    const skip: number = (page - 1) * take;
    let filter: any = {};
    if (query.name) filter = { ...filter, name: { contains: query.name } };
    if (query.username)
        filter = { ...filter, username: { contains: query.username } };
    if (query.email) filter = { ...filter, email: { contains: query.email } };
    if (query.phone) filter = { ...filter, phone: { contains: query.phone } };
    if (query.storeId) filter = { ...filter, storeId: query.storeId };

    const whereClause: any =
        Object.keys(filter).length > 0
            ? { ...filter, verified: "active" as const }
            : { verified: "active" as const };

    const [users, total] = await Promise.all([
        Model.users.findMany({
            where: {
                level: "cashier",
                ...whereClause,
            },
            skip: skip,
            take: take,
        }),
        Model.users.count({
            where: whereClause,
        }),
    ]);

    return {
        message: "successful in getting user data",
        data: {
            users,
            info: {
                page,
                limit: take,
                total,
            },
        },
    };
};
