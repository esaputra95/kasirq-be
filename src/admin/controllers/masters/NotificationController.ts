import Model from "#root/services/PrismaService";
import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { NotificationQueryInterface } from "#root/interfaces/masters/NotificationInterface";
import getOwnerId from "#root/helpers/GetOwnerId";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import { sendNotificationToDevice } from "#root/helpers/sendNotification";

const getData = async (
    req: Request<{}, {}, {}, NotificationQueryInterface>,
    res: Response
) => {
    try {
        const query = req.query;
        const owner: any = await getOwnerId(
            res.locals.userId,
            res.locals.userType
        );

        // PAGING
        const take: number = parseInt(query.limit ?? "20");
        const page: number = parseInt(query.page ?? "1");
        const skip: number = (page - 1) * take;

        // FILTER
        let filter: any = {};
        let recipientFilter: any = {};

        if (query.title) {
            filter.title = { contains: query.title };
        }

        if (query.type) {
            filter.type = query.type;
        }

        if (query.userId) {
            recipientFilter.userId = query.userId;
        }

        const whereClause: any = {
            ...filter,
        };

        if (query.userId) {
            whereClause.recipients = {
                some: recipientFilter,
            };
        }

        const data = await Model.notifications.findMany({
            // where: whereClause,
            include: {
                recipients: {
                    select: {
                        id: true,
                        userId: true,
                        isRead: true,
                        readAt: true,
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
            skip: skip,
            take: take,
            orderBy: {
                createdAt: "desc",
            },
        });

        const total = await Model.notifications.count({
            where: whereClause,
        });

        res.status(200).json({
            status: true,
            message: "successful in getting Notification data",
            data: {
                notifications: data,
                info: {
                    page: page,
                    limit: take,
                    total: total,
                },
            },
        });
    } catch (error) {
        console.log({ error });

        handleErrorMessage(res, error);
    }
};

const postData = async (req: Request, res: Response) => {
    try {
        const { title, type, userIds, body } = req.body;
        const notificationId = uuidv4();

        // Create notification with recipients
        const createdNotification = await Model.notifications.create({
            data: {
                id: notificationId,
                title: title,
                body: body,
                type: "PAYMENT",
                recipients: {
                    create: (userIds || []).map((userId: string) => ({
                        id: uuidv4(),
                        userId: userId,
                        isRead: false,
                    })),
                },
            },
            include: {
                recipients: true, // Include recipients to get their IDs
            },
        });

        console.log({ userIds });

        // Send FCM notification to devices
        if (userIds && userIds.length > 0) {
            // Fetch all recipients with their device tokens
            const recipients = await Model.notificationRecipients.findMany({
                where: {
                    notificationId: notificationId,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            deviceTokens: {
                                where: {
                                    isActive: true, // Only active devices
                                },
                                select: {
                                    id: true,
                                    token: true,
                                    platform: true,
                                },
                            },
                        },
                    },
                },
            });

            // Send notification to each device for each recipient
            const sendPromises: Promise<void>[] = [];

            for (const recipient of recipients) {
                // Skip if user has no device tokens
                if (
                    !recipient.user.deviceTokens ||
                    recipient.user.deviceTokens.length === 0
                ) {
                    console.log(
                        `⚠️ User ${recipient.userId} has no active device tokens`
                    );
                    continue;
                }

                // Send to all devices of this user
                for (const deviceToken of recipient.user.deviceTokens) {
                    const promise = (async () => {
                        try {
                            await sendNotificationToDevice(
                                deviceToken.token,
                                title || "Notification",
                                body,
                                {
                                    notificationId: recipient.id, // Use recipient ID
                                    type: type || "GENERAL",
                                }
                            );
                            console.log(
                                `✅ Sent to user ${recipient.userId} on ${deviceToken.platform} (recipientId: ${recipient.id})`
                            );
                        } catch (error) {
                            console.error(
                                `❌ Failed to send to user ${recipient.userId} device ${deviceToken.id}:`,
                                error
                            );
                            // Don't throw, continue sending to other devices
                        }
                    })();

                    sendPromises.push(promise);
                }
            }

            await Promise.allSettled(sendPromises);
        }

        res.status(200).json({
            status: true,
            message: "successful in created Notification data",
        });
    } catch (error) {
        console.log({ error });

        handleErrorMessage(res, error);
    }
};

const updateData = async (req: Request, res: Response) => {
    try {
        const { title, body, type } = req.body;

        await Model.notifications.update({
            where: {
                id: req.params.id,
            },
            data: {
                title: title,
                body: body,
                type: type,
            },
        });

        res.status(200).json({
            status: true,
            message: "successful in updated Notification data",
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const deleteData = async (req: Request, res: Response) => {
    try {
        await Model.notifications.delete({
            where: {
                id: req.params.id,
            },
        });

        res.status(200).json({
            status: true,
            message: "successfully in deleted Notification data",
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getDataById = async (req: Request, res: Response) => {
    try {
        const model = await Model.notifications.findUnique({
            where: {
                id: req.params.id,
            },
            include: {
                recipients: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                username: true,
                            },
                        },
                    },
                },
            },
        });

        if (!model) throw new Error("data not found");

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

const markAsRead = async (req: Request, res: Response) => {
    try {
        const { id, userId } = req.params;

        await Model.notificationRecipients.updateMany({
            where: {
                notificationId: id,
                userId: userId,
                isRead: false,
            },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });

        res.status(200).json({
            status: true,
            message: "successfully marked notification as read",
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getUserNotification = async (req: Request, res: Response) => {
    try {
        const model = await Model.users.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                username: true,
                deviceTokens: true,
            },
        });

        if (!model) throw new Error("data not found");

        res.status(200).json({
            status: true,
            message: "successfully in get Notification data",
            data: {
                users: model,
            },
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
    markAsRead,
    getUserNotification,
};
