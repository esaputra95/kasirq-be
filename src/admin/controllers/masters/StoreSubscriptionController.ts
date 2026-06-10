import Model from "#root/services/PrismaService";
import { Request, Response } from "express";
import { Prisma, store_subscriptions } from "@prisma/client";
import { handleValidationError } from "#root/helpers/handleValidationError";
import { errorType } from "#root/helpers/errorType";
import { handleErrorMessage } from "#root/helpers/handleErrors";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";
import { resolveSubscriptionPlanId } from "#root/mobile/services/entitlements/FeatureEntitlementService";

interface StoreSubscriptionQueryInterface extends Partial<store_subscriptions> {
    limit?: string;
    page?: string;
}

const SUBSCRIPTION_TRANSACTION_OPTIONS = {
    maxWait: 10000,
    timeout: 15000,
};

const getData = async (req: Request, res: Response) => {
    try {
        const query = req.query as unknown as StoreSubscriptionQueryInterface;
        // PAGING
        const take: number = parseInt(query.limit ?? "20");
        const page: number = parseInt(query.page ?? "1");
        const skip: number = (page - 1) * take;

        // FILTER
        let filter: any = {};
        if (query.storeId) {
            filter = { ...filter, storeId: query.storeId };
        }
        if (query.status) {
            filter = { ...filter, status: query.status };
        }
        if (query.type) {
            filter = { ...filter, type: query.type };
        }
        if ((query as any).planId) {
            filter = { ...filter, planId: (query as any).planId };
        }

        const data = await Model.store_subscriptions.findMany({
            where: {
                ...filter,
            },
            include: {
                plan: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                    },
                },
                store: {
                    select: {
                        id: true,
                        name: true,
                        ownerId: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            skip: skip,
            take: take,
            orderBy: {
                createdAt: "desc",
            },
        });

        const total = await Model.store_subscriptions.count({
            where: {
                ...filter,
            },
        });

        res.status(200).json({
            status: true,
            message: "successful in getting Store Subscription data",
            data: {
                storeSubscriptions: data,
                info: {
                    page: page,
                    limit: take,
                    total: total,
                    totalPage: Math.ceil(total / take),
                },
            },
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const postData = async (req: Request, res: Response) => {
    try {
        const data = { ...req.body } as store_subscriptions;
        const uuid = uuidv4();

        await Model.$transaction(
            async (tx) => {
                const planId = await resolveSubscriptionPlanId(
                    (data as any).planId,
                    data.type,
                    tx,
                );

                await tx.store_subscriptions.create({
                    data: {
                        id: uuid,
                        storeId: data.storeId,
                        planId,
                        type: data.type,
                        startDate: moment(data.startDate).toISOString(),
                        endDate: moment(data.endDate).toISOString(),
                        durationMonth: data.durationMonth,
                        price: data.price,
                        status: data.status,
                        paymentRef: data.paymentRef ?? null,
                        userCreate: res.locals.userId ?? null,
                    },
                });

                // Update expiredDate in stores
                const store = await tx.stores.update({
                    where: {
                        id: data.storeId,
                    },
                    data: {
                        expiredDate: moment(data.endDate).toISOString(),
                    },
                    select: {
                        ownerId: true,
                    },
                });

                // Commission Logic
                if (Number(data.price || 0) > 0 && store.ownerId) {
                    const referral = await tx.referrals.findFirst({
                        where: { referredUserId: store.ownerId },
                        include: {
                            affiliateCode: true,
                        },
                    });

                    if (referral && referral.affiliateCode) {
                        const aff = referral.affiliateCode;
                        let commissionAmount = 0;

                        if (aff.commissionType === "PERCENTAGE") {
                            commissionAmount =
                                (Number(data.price) *
                                    Number(aff.commissionValue || 0)) /
                                100;
                        } else if (aff.commissionType === "FIXED") {
                            commissionAmount =
                                Number(aff.commissionValue || 0) *
                                Number(data.durationMonth);
                        }

                        if (commissionAmount > 0) {
                            // Create commission record
                            await tx.affiliate_commissions.create({
                                data: {
                                    id: uuidv4(),
                                    affiliateCodeId: aff.id,
                                    subscriptionId: uuid,
                                    amount: commissionAmount,
                                },
                            });

                            // Update referral earnedAmount
                            await tx.referrals.update({
                                where: { id: referral.id },
                                data: {
                                    earnedAmount: {
                                        increment: commissionAmount,
                                    },
                                },
                            });
                        }
                    }
                }
            },
            SUBSCRIPTION_TRANSACTION_OPTIONS,
        );

        res.status(200).json({
            status: true,
            message: "successful in created Store Subscription data",
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const updateData = async (req: Request, res: Response) => {
    try {
        const data = { ...req.body } as store_subscriptions;

        const existing = await Model.store_subscriptions.findUnique({
            where: {
                id: req.params.id,
            },
            select: {
                planId: true,
                type: true,
                storeId: true,
                endDate: true,
            },
        });

        if (!existing) throw new Error("data not found");

        const requestedPlanId = (data as any).planId;
        const shouldResolvePlan =
            requestedPlanId !== undefined || data.type !== undefined;
        const planId = shouldResolvePlan
            ? await resolveSubscriptionPlanId(
                  requestedPlanId,
                  data.type ?? existing.type,
                  Model,
              )
            : existing.planId;

        const subscriptionData: Prisma.store_subscriptionsUncheckedUpdateInput =
            {
                planId,
                updatedAt: moment().toISOString(),
            };

        if (data.storeId !== undefined) {
            subscriptionData.storeId = data.storeId;
        }
        if (data.type !== undefined) subscriptionData.type = data.type;
        if (data.startDate !== undefined) {
            subscriptionData.startDate = moment(data.startDate).toISOString();
        }
        if (data.endDate !== undefined) {
            subscriptionData.endDate = moment(data.endDate).toISOString();
        }
        if (data.durationMonth !== undefined) {
            subscriptionData.durationMonth = data.durationMonth;
        }
        if (data.price !== undefined) {
            subscriptionData.price = data.price;
        }
        if (data.status !== undefined) {
            subscriptionData.status = data.status;
        }
        if (data.paymentRef !== undefined) {
            subscriptionData.paymentRef = data.paymentRef;
        }

        await Model.store_subscriptions.update({
            where: {
                id: req.params.id,
            },
            data: subscriptionData,
        });

        // Update expiredDate in stores
        await Model.stores.update({
            where: {
                id: data.storeId ?? existing.storeId,
            },
            data: {
                expiredDate: moment(
                    data.endDate ?? existing.endDate,
                ).toISOString(),
            },
        });

        res.status(200).json({
            status: true,
            message: "successful in updated Store Subscription data",
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
        await Model.store_subscriptions.delete({
            where: {
                id: req.params.id,
            },
        });

        res.status(200).json({
            status: true,
            message: "successfully in deleted Store Subscription data",
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getDataById = async (req: Request, res: Response) => {
    try {
        const model = await Model.store_subscriptions.findUnique({
            where: {
                id: req.params.id,
            },
            include: {
                plan: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                    },
                },
                store: {
                    select: {
                        id: true,
                        name: true,
                        ownerId: true,
                        address: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        if (!model) throw new Error("data not found");

        res.status(200).json({
            status: true,
            message: "successfully in get Store Subscription data",
            data: {
                storeSubscription: model,
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

const migrateData = async (req: Request, res: Response) => {
    try {
        // 1. Ambil semua store yang punya expiredDate
        const stores = await Model.stores.findMany({
            where: {
                expiredDate: { not: null },
            },
        });

        let successCount = 0;
        let skipCount = 0;
        let logs: string[] = [];

        for (const store of stores) {
            // Cek apakah sudah ada data di store_subscriptions untuk store ini
            const existingSub = await Model.store_subscriptions.findFirst({
                where: { storeId: store.id },
            });

            if (existingSub) {
                logs.push(
                    `[SKIP] Store: ${store.name} sudah memiliki data langganan.`,
                );
                skipCount++;
                continue;
            }

            const now = new Date();
            const expiredDate = store.expiredDate as Date;

            // Tentukan status berdasarkan tanggal hari ini
            const status = moment(expiredDate).isAfter(now)
                ? "ACTIVE"
                : "EXPIRED";

            // 2. Buat record baru di store_subscriptions
            const planId = await resolveSubscriptionPlanId(
                null,
                "PAID",
                Model,
            );

            await Model.store_subscriptions.create({
                data: {
                    id: uuidv4(),
                    storeId: store.id,
                    planId,
                    type: "PAID",
                    startDate: store.createdAt || now,
                    endDate: expiredDate,
                    durationMonth: 0,
                    price: 0,
                    status: status as any,
                    userCreate: store.userCreate,
                    createdAt: store.createdAt || now,
                },
            });

            logs.push(
                `[OK] Berhasil migrasi Store: ${store.name} (Status: ${status})`,
            );
            successCount++;
        }

        res.status(200).json({
            status: true,
            message: "Migrasi selesai",
            summary: {
                total_found: stores.length,
                success: successCount,
                skipped: skipCount,
            },
            logs: logs,
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

export { getData, postData, updateData, deleteData, getDataById, migrateData };
