import Model from "#root/services/PrismaService";
import { Request, Response } from "express";
import { handleErrorMessage, ValidationError } from "#root/helpers/handleErrors";
import { v4 as uuidv4 } from "uuid";

type SubscriptionPlanQuery = {
    limit?: string;
    page?: string;
    search?: string;
    status?: string;
    isPublic?: string;
};

const mapPlanResponse = (plan: any) => {
    const features =
        plan.planFeatures?.map((item: any) => item.feature).filter(Boolean) ??
        [];

    return {
        ...plan,
        features,
        featureKeys: features.map((feature: any) => feature.key),
        planFeatures: undefined,
    };
};

const getData = async (
    req: Request<{}, {}, {}, SubscriptionPlanQuery>,
    res: Response,
) => {
    try {
        const query = req.query;
        const take = parseInt(query.limit ?? "20");
        const page = parseInt(query.page ?? "1");
        const skip = (page - 1) * take;

        let filter: any = {};
        if (query.search) {
            filter = {
                ...filter,
                OR: [
                    { code: { contains: query.search } },
                    { name: { contains: query.search } },
                ],
            };
        }
        if (query.status) {
            filter = { ...filter, status: query.status };
        }
        if (query.isPublic !== undefined) {
            filter = { ...filter, isPublic: query.isPublic === "true" };
        }

        const [plans, total] = await Promise.all([
            Model.subscription_plans.findMany({
                where: filter,
                include: {
                    planFeatures: {
                        include: {
                            feature: true,
                        },
                    },
                },
                skip,
                take,
                orderBy: {
                    createdAt: "desc",
                },
            }),
            Model.subscription_plans.count({
                where: filter,
            }),
        ]);

        res.status(200).json({
            status: true,
            message: "successful in getting Subscription Plan data",
            data: {
                subscriptionPlans: plans.map(mapPlanResponse),
                info: {
                    page,
                    limit: take,
                    total,
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
        await Model.subscription_plans.create({
            data: {
                code: req.body.code,
                name: req.body.name,
                description: req.body.description ?? null,
                price: req.body.price ?? null,
                durationMonth: req.body.durationMonth ?? null,
                status: req.body.status ?? "active",
                isPublic: req.body.isPublic ?? true,
            },
        });

        res.status(200).json({
            status: true,
            message: "successful in created Subscription Plan data",
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const updateData = async (req: Request, res: Response) => {
    try {
        await Model.subscription_plans.update({
            where: {
                id: req.params.id,
            },
            data: {
                code: req.body.code,
                name: req.body.name,
                description: req.body.description,
                price: req.body.price,
                durationMonth: req.body.durationMonth,
                status: req.body.status,
                isPublic: req.body.isPublic,
            },
        });

        res.status(200).json({
            status: true,
            message: "successful in updated Subscription Plan data",
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const updateFeatures = async (req: Request, res: Response) => {
    try {
        const featureIds = req.body.featureIds;
        if (!Array.isArray(featureIds)) {
            throw new ValidationError("featureIds wajib berupa array", 400, "featureIds");
        }
        const uniqueFeatureIds = Array.from(new Set(featureIds)) as string[];

        await Model.$transaction(async (tx) => {
            const plan = await tx.subscription_plans.findUnique({
                where: {
                    id: req.params.id,
                },
                select: {
                    id: true,
                },
            });

            if (!plan) {
                throw new ValidationError(
                    "Subscription plan tidak ditemukan",
                    404,
                    "planId",
                );
            }

            const totalFeatures = await tx.features.count({
                where: {
                    id: {
                        in: uniqueFeatureIds,
                    },
                },
            });

            if (totalFeatures !== uniqueFeatureIds.length) {
                throw new ValidationError(
                    "Ada feature yang tidak ditemukan",
                    404,
                    "featureIds",
                );
            }

            await tx.subscription_plan_features.deleteMany({
                where: {
                    planId: req.params.id,
                },
            });

            if (uniqueFeatureIds.length > 0) {
                await tx.subscription_plan_features.createMany({
                    data: uniqueFeatureIds.map((featureId: string) => ({
                        id: uuidv4(),
                        planId: req.params.id,
                        featureId,
                    })),
                    skipDuplicates: true,
                });
            }
        });

        res.status(200).json({
            status: true,
            message: "successfully update subscription plan features",
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const deleteData = async (req: Request, res: Response) => {
    try {
        const plan = await Model.subscription_plans.findUnique({
            where: {
                id: req.params.id,
            },
            select: {
                id: true,
            },
        });

        if (!plan) {
            throw new ValidationError(
                "Subscription plan tidak ditemukan",
                404,
                "planId",
            );
        }

        await Model.subscription_plans.delete({
            where: {
                id: req.params.id,
            },
        });

        res.status(200).json({
            status: true,
            message: "successfully in deleted Subscription Plan data",
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getDataById = async (req: Request, res: Response) => {
    try {
        const plan = await Model.subscription_plans.findUnique({
            where: {
                id: req.params.id,
            },
            include: {
                planFeatures: {
                    include: {
                        feature: true,
                    },
                },
            },
        });

        if (!plan) {
            throw new ValidationError(
                "Subscription plan tidak ditemukan",
                404,
                "planId",
            );
        }

        res.status(200).json({
            status: true,
            message: "successfully in get Subscription Plan data",
            data: {
                subscriptionPlan: mapPlanResponse(plan),
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
    updateFeatures,
    deleteData,
    getDataById,
};
