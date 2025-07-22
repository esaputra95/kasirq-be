import { handleValidationError } from "#root/helpers/handleValidationError";
import Model from "#root/services/PrismaService";
import { Prisma } from "@prisma/client";
import { Request, Response } from "express";
import moment from "moment";

const getSelect = async (_req: Request, res: Response) => {
    try {
        let user;

        let dataOption: any = [];
        if (res.locals.level === "cashier") {
            user = await Model.users.findUnique({
                where: {
                    id: res.locals.userId,
                },
            });
            const data = await Model.stores.findMany({
                where: {
                    id: user?.storeId ?? "",
                    expiredDate: {
                        gte: moment().format(),
                    },
                },
            });
            for (const value of data) {
                dataOption = [
                    ...dataOption,
                    {
                        key: value.id,
                        value: value.name,
                    },
                ];
            }
        } else if (res.locals.level === "owner") {
            const data = await Model.stores.findMany({
                where: {
                    ownerId: res.locals.userId,
                    expiredDate: {
                        gte: moment().format(),
                    },
                },
            });
            for (const value of data) {
                dataOption = [
                    ...dataOption,
                    {
                        key: value.id,
                        value: value.name,
                    },
                ];
            }
            for (const value of data) {
                dataOption = [
                    ...dataOption,
                    {
                        key: value.id,
                        value: value.name,
                    },
                ];
            }
        } else {
            const data = await Model.stores.findMany({
                where: {
                    ownerId: res.locals.userId,
                    expiredDate: {
                        gte: moment().format(),
                    },
                },
            });
            for (const value of data) {
                dataOption = [
                    ...dataOption,
                    {
                        key: value.id,
                        value: value.name,
                    },
                ];
            }
        }

        res.status(200).json({
            status: true,
            message: "successfully in get user data",
            data: {
                store: dataOption,
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

export { getSelect };
