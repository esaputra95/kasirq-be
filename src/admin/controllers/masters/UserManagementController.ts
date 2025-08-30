import bcrypt from "bcryptjs";
import { UserQueryInterface } from "#root/interfaces/UserInterface";
import Model from "#root/services/PrismaService";
import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { handleValidationError } from "#root/helpers/handleValidationError";
import { errorType } from "#root/helpers/errorType";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import { deleteUserAndRelatedData } from "#root/helpers/deleteRelation";

const getData = async (
    req: Request<{}, {}, {}, UserQueryInterface>,
    res: Response
) => {
    try {
        const q: Partial<UserQueryInterface> = req.query ?? {};

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

export { getData, postData, updateData, deleteData, getDataById };
