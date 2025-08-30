import Model from "#root/services/PrismaService";
import { Request, Response } from "express";
import { Prisma, SubscriptionStore } from "@prisma/client";
import { handleValidationError } from "#root/helpers/handleValidationError";
import { errorType } from "#root/helpers/errorType";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";

interface SubscriptionStoreQueryInterface extends SubscriptionStore {
    limit: string;
    page: string;
}

const getData = async (req: Request, res: Response) => {
    try {
        const query = req.query as unknown as SubscriptionStoreQueryInterface;
        // PAGING
        const take: number = parseInt(query.limit ?? 20);
        const page: number = parseInt(query.page ?? 1);
        const skip: number = (page - 1) * take;
        // FILTER
        let filter: any = {};
        query.storeId ? (filter = { ...filter, storeId: query.storeId }) : null;

        const data = await Model.subscriptionStore.findMany({
            where: {
                ...filter,
            },
            include: {
                stores: true,
                users: true,
            },
            skip: skip,
            take: take,
        });
        const total = await Model.subscriptionStore.count({
            where: {
                ...filter,
            },
        });
        res.status(200).json({
            status: true,
            message: "successful in getting Subscription Store data",
            data: {
                subscriptionStore: data,
                info: {
                    page: page,
                    limit: take,
                    total: total,
                    totalPage: Math.round(total / take),
                },
            },
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const postData = async (req: Request, res: Response) => {
    try {
        const data = { ...req.body } as SubscriptionStore;
        const startDate = moment(data.startDate).format();
        const endDate = moment(data.endDate).format();
        const uuid = uuidv4();
        await Model.subscriptionStore.create({
            data: {
                storeId: data.storeId,
                startDate: startDate,
                endDate: endDate,
                userCreate: res.locals.userId ?? null,
                id: uuid,
            },
        });
        res.status(200).json({
            status: true,
            message: "successful in created Subscription Store data",
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const updateData = async (req: Request, res: Response) => {
    try {
        const data = { ...req.body } as SubscriptionStore;
        const startDate = moment(data.startDate).format();
        const endDate = moment(data.endDate).format();
        await Model.subscriptionStore.update({
            where: {
                id: req.params.id,
            },
            data: {
                startDate: startDate,
                endDate: endDate,
                storeId: data.storeId,
                updatedAt: moment().format(),
            },
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
        await Model.subscriptionStore.delete({
            where: {
                id: req.params.id,
            },
        });
        res.status(200).json({
            status: false,
            message: "successfully in deleted SubscriptionStore data",
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getDataById = async (req: Request, res: Response) => {
    try {
        const model = await Model.subscriptionStore.findUnique({
            where: {
                id: req.params.id,
            },
            include: {
                stores: true,
            },
        });
        if (!model) throw new Error("data not found");
        res.status(200).json({
            status: true,
            message: "successfully in get SubscriptionStore data",
            data: {
                subscriptionStore: model,
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
