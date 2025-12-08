import Model from "#root/services/PrismaService";
import { Request, Response } from "express";
import { handleErrorMessage } from "#root/helpers/handleErrors";

/**
 * GET list notifications for logged in user
 */
const getData = async (req: Request, res: Response) => {
    try {
        const userId = res.locals.userId;
        const page = parseInt((req.query.page as string) ?? "1");
        const limit = parseInt((req.query.limit as string) ?? "20");
        const skip = (page - 1) * limit;

        // Get notificationRecipients for this user with notification details
        const data = await Model.notificationRecipients.findMany({
            where: {
                userId: userId,
            },
            include: {
                notification: true,
            },
            orderBy: {
                createdAt: "desc",
            },
            skip,
            take: limit,
        });

        const total = await Model.notificationRecipients.count({
            where: {
                userId: userId,
            },
        });

        res.status(200).json({
            status: true,
            message: "successful in getting Notification data",
            data: {
                notifications: data,
                info: {
                    page,
                    limit,
                    total,
                },
            },
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

/**
 * GET single notification by ID
 */
const getDataById = async (req: Request, res: Response) => {
    try {
        const notificationId = req.params.id;
        const model = await Model.notificationRecipients.findFirst({
            where: {
                id: notificationId,
            },
            include: {
                notification: true,
            },
        });

        if (!model) {
            return res.status(404).json({
                status: false,
                message: "Notification not found",
            });
        }

        res.status(200).json({
            status: true,
            message: "successfully in get Notification data",
            data: {
                notification: model,
            },
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

/**
 * PUT mark notification as read
 */
const markAsRead = async (req: Request, res: Response) => {
    try {
        const notificationId = req.params.id;

        const updated = await Model.notificationRecipients.updateMany({
            where: {
                id: notificationId,
                isRead: false,
            },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });

        if (updated.count === 0) {
            return res.status(404).json({
                status: false,
                message: "Notification not found or already read",
            });
        }

        res.status(200).json({
            status: true,
            message: "successfully marked notification as read",
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

export { getData, getDataById, markAsRead };
