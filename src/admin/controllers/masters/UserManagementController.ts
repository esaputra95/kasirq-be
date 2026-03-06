import bcrypt from "bcryptjs";
import { UserQueryInterface } from "#root/interfaces/UserInterface";
import Model from "#root/services/PrismaService";
import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { handleValidationError } from "#root/helpers/handleValidationError";
import { errorType } from "#root/helpers/errorType";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import { deleteUserAndRelatedData } from "#root/helpers/deleteRelation";
import { v4 as uuidv4 } from "uuid";

const getData = async (
    req: Request<{}, {}, {}, UserQueryInterface>,
    res: Response,
) => {
    try {
        const q: any = req.query ?? {};

        // paging - ensure sensible defaults and safe parsing
        const limit = Math.max(1, Number(q.limit ?? 20));
        const page = Math.max(1, Number(q.page ?? 1));
        const skip = (page - 1) * limit;

        // build filter incrementally
        const filter: any = {};
        // if (ownerId) filter.ownerId = ownerId;
        if (q.name) filter.name = { contains: q.name };
        if (q.username) filter.username = { contains: q.username };
        if (q.email) filter.email = { contains: q.email };
        if (q.phone) filter.phone = { contains: q.phone };
        if (q.level) filter.level = q.level;
        if (q.verified) filter.verified = q.verified;
        if (q.affiliateCode) {
            if (q.affiliateCode === "true") {
                filter.affiliateCode = { isNot: null };
            } else if (q.affiliateCode === "false") {
                filter.affiliateCode = { is: null };
            }
        }
        if (q.createdAt) {
            const created = new Date(q.createdAt as any);
            if (!Number.isNaN(created.getTime()))
                filter.createdAt = { gte: created };
        }

        // ordering
        const validSort = q.sort === "asc" || q.sort === "desc";
        const orderBy =
            q.sortby && validSort
                ? { [q.sortby]: q.sort as Prisma.SortOrder }
                : { createdAt: "desc" as Prisma.SortOrder };

        const data = await Model.users.findMany({
            where: filter,
            select: {
                id: true,
                name: true,
                email: true,
                level: true,
                phone: true,
                token: true,
                username: true,
                storeId: true,
                verified: true,
                createdAt: true,
                updatedAt: true,
                affiliateCode: {
                    select: {
                        code: true,
                        commissionType: true,
                        commissionValue: true,
                    },
                },
            },
            skip,
            take: limit,
            orderBy,
        });

        const total = await Model.users.count({ where: filter });

        res.status(200).json({
            status: true,
            message: "successful in getting user data",
            data: {
                UserManagement: data,
                info: {
                    page,
                    limit,
                    total,
                    totalPage: Math.ceil(total / limit),
                },
            },
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const postData = async (req: Request, res: Response) => {
    try {
        const salt = await bcrypt.genSalt();
        const newPass = await bcrypt.hash(req.body.password, salt);
        const data = { ...req.body, password: newPass };
        await Model.users.create({
            data: {
                email: data.email,
                username: data.email,
                password: newPass,
                storeId: data.storeId,
                name: data.name,
                level: data.level,
                verified: "active",
            },
        });
        res.status(200).json({
            status: true,
            message: "successful in created user data",
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const updateData = async (req: Request, res: Response) => {
    try {
        const salt = await bcrypt.genSalt();
        const data = { ...req.body };
        if (!req.body.password) {
            delete data.password;
        } else {
            data.password = await bcrypt.hash(req.body.password, salt);
        }
        await Model.users.update({
            where: {
                id: req.params.id,
            },
            data: data,
        });
        res.status(200).json({
            status: true,
            message: "successful in updated user data",
        });
    } catch (error) {
        let message = errorType;
        message.message.msg = `${error}`;
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            message = await handleValidationError(error);
        }
        res.status(500).json({
            status: message.status,
            errors: [message.message],
        });
    }
};

const deleteData = async (req: Request, res: Response) => {
    try {
        await Model.$transaction(async (prisma) => {
            await deleteUserAndRelatedData(prisma, req.params.id);
        });

        res.status(200).json({
            status: true,
            message: "Berhasil menghapus user dan seluruh data terkait",
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getDataById = async (req: Request, res: Response) => {
    try {
        const model = await Model.users.findUnique({
            where: {
                id: req.params.id,
            },
        });
        if (!model) throw new Error("data not found");
        res.status(200).json({
            status: true,
            message: "successfully in get user data",
            data: {
                UserManagement: model,
            },
        });
    } catch (error) {
        let message = {
            status: 500,
            message: { msg: `${error}` },
        };
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            message = await handleValidationError(error);
        }
        res.status(500).json({
            status: message.status,
            errors: [message.message],
        });
    }
};

const RegisterAffiliate = async (req: Request, res: Response) => {
    try {
        const { userId, code, commissionType, commissionValue } = req.body;

        const user = await Model.users.findFirst({
            where: { id: userId },
        });

        if (!user) {
            throw new Error("User not found");
        }

        const existingAffiliate = await Model.affiliate_codes.findFirst({
            where: { userId },
        });

        if (existingAffiliate) {
            throw new Error("User already registered as affiliate");
        }

        let affiliateCode = code;
        if (!affiliateCode || affiliateCode === "Auto") {
            affiliateCode =
                user.name.substring(0, 3).toUpperCase() +
                Math.floor(1000 + Math.random() * 9000);
        }

        const checkCode = await Model.affiliate_codes.findFirst({
            where: { code: affiliateCode },
        });

        if (checkCode) {
            throw new Error("Affiliate code already exists");
        }

        const affiliate = await Model.affiliate_codes.create({
            data: {
                id: uuidv4(),
                userId: userId,
                code: affiliateCode,
                commissionType: commissionType || "FIXED",
                commissionValue: commissionValue || 0,
            },
        });

        res.status(200).json({
            status: true,
            message: "Successfully registered as affiliate",
            data: affiliate,
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

export {
    getData,
    postData,
    updateData,
    deleteData,
    getDataById,
    RegisterAffiliate,
};
