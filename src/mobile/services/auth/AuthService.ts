import Model from "#root/services/PrismaService";
import { compare, genSalt, hash } from "bcryptjs";
import { sign } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import sendEmail from "#root/helpers/sendEmail";
import moment from "moment";
import { UnauthorizedError, ValidationError } from "#root/helpers/handleErrors";

/**
 * Login user and generate JWT token
 */
export const loginUser = async (email: string, password: string) => {
    const user = await Model.users.findFirst({
        where: { email },
    });

    if (!user) {
        throw new UnauthorizedError("Username or password incorrect", 401);
    }

    if (user.verified !== "active") {
        throw new UnauthorizedError("Please verify your account", 401);
    }

    const match = await compare(password, user.password);
    if (!match) {
        throw new UnauthorizedError("Username or password incorrect", 401);
    }

    const accessToken = sign(
        {
            id: user.id,
            username: user.username,
            name: user.name,
            level: user.level,
        },
        "1234567890"
    );

    return { token: accessToken };
};

/**
 * Register new owner with store
 */
export const registerOwner = async (userData: {
    name: string;
    email: string;
    password: string;
    store: string;
    addressStore: string;
}) => {
    const checkEmail = await Model.users.findFirst({
        where: { email: userData.email },
    });

    if (checkEmail) {
        throw new ValidationError("Email already exists", 400, "email");
    }

    const salt = await genSalt();
    const hashedPassword = await hash(userData.password, salt);
    const token = Math.random().toString(36).substring(2, 7);
    const code = await hash(token, salt);

    const user = await Model.$transaction(async (tx) => {
        const user = await tx.users.create({
            data: {
                id: uuidv4(),
                name: userData.name,
                password: hashedPassword,
                email: userData.email,
                username: userData.email,
                token: code,
                level: "owner",
            },
        });

        const store = await tx.stores.create({
            data: {
                id: uuidv4(),
                ownerId: user.id,
                name: userData.store,
                expiredDate: moment().add(30, "d").format(),
                address: userData.addressStore,
            },
        });

        // tambahkan create subscription

        const account = await tx.account.create({
            data: {
                id: uuidv4(),
                storeId: store.id,
                name: "Kas Kecil",
                type: "CASH",
                currentBalance: 0,
                ownerId: user.id,
            },
        });

        await tx.stores.update({
            where: { id: store.id },
            data: {
                defaultCashId: account.id,
            },
        });

        // Create subscription for store (30 days trial)
        await tx.store_subscriptions.create({
            data: {
                id: uuidv4(),
                storeId: store.id,
                type: "TRIAL",
                startDate: moment().toDate(),
                endDate: moment().add(30, "d").toDate(),
                durationMonth: 1,
                price: 0,
                status: "ACTIVE",
                userCreate: user.id,
            },
        });

        return user;
    });

    await sendEmail(userData.email, code, "register");

    return {
        message: "success post user data",
        data: user,
    };
};

/**
 * Verify email with token
 */
export const verifyEmail = async (code: string) => {
    const user = await Model.users.findFirst({
        where: { token: code },
    });

    if (!user) {
        throw new ValidationError("Invalid token", 400, "token");
    }

    await Model.users.update({
        where: { id: user.id },
        data: {
            token: "",
            verified: "active" as const,
        },
    });

    return { message: "Email verified successfully" };
};

/**
 * Request password reset code
 */
export const requestPasswordResetCode = async (email: string) => {
    const user = await Model.users.findFirst({
        where: { email },
    });

    if (!user) {
        throw new ValidationError("Email not found", 404, "email");
    }

    const code = Math.floor(10000 + Math.random() * 90000);

    await Model.users.updateMany({
        where: { email: user.email },
        data: { token: code + "" },
    });

    await sendEmail(user.email ?? "", code + "", "forgot-password");

    return { message: "code is created" };
};

/**
 * Verify password reset code
 */
export const verifyPasswordResetCode = async (email: string, code: string) => {
    const user = await Model.users.findFirst({
        where: {
            token: code,
            email: email,
        },
    });

    if (!user) {
        throw new ValidationError("Code invalid", 400, "code");
    }

    return { message: "Code Valid" };
};

/**
 * Reset password with new password
 */
export const resetPassword = async (
    email: string,
    newPassword: string,
    confirmPassword: string
) => {
    if (newPassword !== confirmPassword) {
        throw new ValidationError("Password does not match", 400, "password");
    }

    const salt = await genSalt();
    const hashedPassword = await hash(newPassword, salt);

    await Model.users.updateMany({
        data: { password: hashedPassword },
        where: { email },
    });

    return { message: "success update password" };
};
