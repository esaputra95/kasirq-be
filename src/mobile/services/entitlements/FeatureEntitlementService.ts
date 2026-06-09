import { Prisma } from "@prisma/client";
import moment from "moment-timezone";
import Model from "#root/services/PrismaService";
import { ValidationError } from "#root/helpers/handleErrors";

type PrismaClientLike = Prisma.TransactionClient | typeof Model | any;

export const DEFAULT_FEATURE_KEYS = [
    "sales",
    "sale_pending",
    "products",
    "purchases",
    "members",
    "stock_opname",
    "finance",
    "reports",
    "attendance",
    "settings",
    "suppliers",
    "sales_people",
    "rbac",
] as const;

export type FeatureEntitlementMode = "OFF" | "DETECT_ONLY" | "ENFORCE";

export type EntitlementContext = {
    userId?: string | null;
    method?: string;
    path?: string;
};

export type StoreEntitlementResult = {
    storeId: string;
    subscription: {
        id: string;
        planId: string | null;
        planCode: string | null;
        planName: string | null;
        status: string;
        startDate: Date;
        endDate: Date;
    } | null;
    featureKeys: string[];
    isExpired: boolean;
};

const ACTIVE_STATUS = "ACTIVE";
const LEGACY_PLAN_CODE = "LEGACY_FULL";

const jakartaStartOfToday = () =>
    moment.tz("Asia/Jakarta").startOf("day").toDate();

export const getFeatureEntitlementMode = (): FeatureEntitlementMode => {
    const mode = process.env.FEATURE_ENTITLEMENT_MODE;
    if (mode === "OFF" || mode === "ENFORCE" || mode === "DETECT_ONLY") {
        return mode;
    }
    return "DETECT_ONLY";
};

const getActiveSubscription = async (
    prisma: PrismaClientLike,
    storeId: string,
) => {
    const now = new Date();

    return prisma.store_subscriptions.findFirst({
        where: {
            storeId,
            status: ACTIVE_STATUS,
            startDate: {
                lte: now,
            },
            endDate: {
                gte: now,
            },
        },
        include: {
            plan: {
                include: {
                    planFeatures: {
                        include: {
                            feature: true,
                        },
                    },
                },
            },
        },
        orderBy: {
            endDate: "desc",
        },
    });
};

const getLegacyFeatureKeys = async (prisma: PrismaClientLike) => {
    const legacyPlan = await prisma.subscription_plans.findUnique({
        where: {
            code: LEGACY_PLAN_CODE,
        },
        include: {
            planFeatures: {
                include: {
                    feature: true,
                },
            },
        },
    });

    return (
        legacyPlan?.planFeatures
            ?.map((item: any) => item.feature)
            .filter((feature: any) => feature?.status === "active")
            .map((feature: any) => feature.key) ?? []
    );
};

const mapFeatureKeysFromPlan = async (
    prisma: PrismaClientLike,
    subscription: any,
) => {
    if (!subscription) {
        return [];
    }

    if (!subscription.plan) {
        return getLegacyFeatureKeys(prisma);
    }

    return (
        subscription.plan.planFeatures
            ?.map((item: any) => item.feature)
            .filter((feature: any) => feature?.status === "active")
            .map((feature: any) => feature.key) ?? []
    );
};

export const getStoreEntitlement = async (
    storeId: string,
    prisma: PrismaClientLike = Model,
): Promise<StoreEntitlementResult> => {
    if (!storeId) {
        throw new ValidationError("Toko wajib dipilih", 400, "storeId");
    }

    const store = await prisma.stores.findUnique({
        where: {
            id: storeId,
        },
        select: {
            id: true,
            expiredDate: true,
        },
    });

    if (!store) {
        throw new ValidationError("Toko tidak ditemukan", 404, "storeId");
    }

    const subscription = await getActiveSubscription(prisma, storeId);
    const featureKeys = await mapFeatureKeysFromPlan(prisma, subscription);
    const isExpired =
        !subscription ||
        !store.expiredDate ||
        store.expiredDate < jakartaStartOfToday();

    return {
        storeId,
        subscription: subscription
            ? {
                  id: subscription.id,
                  planId: subscription.planId ?? null,
                  planCode: subscription.plan?.code ?? null,
                  planName: subscription.plan?.name ?? null,
                  status: subscription.status,
                  startDate: subscription.startDate,
                  endDate: subscription.endDate,
              }
            : null,
        featureKeys: Array.from(new Set(featureKeys)),
        isExpired,
    };
};

export const assertUserCanAccessStore = async (
    userId: string,
    userLevel: string,
    storeId: string,
    prisma: PrismaClientLike = Model,
) => {
    const store = await prisma.stores.findUnique({
        where: {
            id: storeId,
        },
        select: {
            id: true,
            ownerId: true,
        },
    });

    if (!store) {
        throw new ValidationError("Toko tidak ditemukan", 404, "storeId");
    }

    if (["superadmin", "admin"].includes(userLevel)) {
        return true;
    }

    if (userLevel === "owner" && store.ownerId === userId) {
        return true;
    }

    const user = await prisma.users.findUnique({
        where: {
            id: userId,
        },
        select: {
            storeId: true,
        },
    });

    if (user?.storeId === storeId) {
        return true;
    }

    const userRole = await prisma.user_roles.findUnique({
        where: {
            userId_storeId: {
                userId,
                storeId,
            },
        },
        select: {
            userId: true,
        },
    });

    if (userRole) {
        return true;
    }

    throw new ValidationError(
        "Anda tidak memiliki akses ke toko ini",
        403,
        "storeId",
    );
};

export const getStoreEntitlementForUser = async (
    storeId: string,
    userId: string,
    userLevel: string,
) => {
    await assertUserCanAccessStore(userId, userLevel, storeId);
    return getStoreEntitlement(storeId);
};

const logDetectedBlock = (
    storeId: string,
    featureKey: string,
    entitlement: StoreEntitlementResult,
    context?: EntitlementContext,
) => {
    console.warn(
        JSON.stringify({
            type: "FEATURE_ENTITLEMENT_DETECTED_BLOCK",
            storeId,
            userId: context?.userId ?? null,
            featureKey,
            method: context?.method ?? null,
            path: context?.path ?? null,
            planCode: entitlement.subscription?.planCode ?? null,
            subscriptionStatus: entitlement.subscription?.status ?? null,
            timestamp: new Date().toISOString(),
        }),
    );
};

export const assertStoreHasFeature = async (
    prisma: PrismaClientLike,
    storeId: string | null | undefined,
    featureKey: string,
    context?: EntitlementContext,
) => {
    const mode = getFeatureEntitlementMode();
    if (mode === "OFF") {
        return true;
    }

    if (!storeId) {
        if (mode === "DETECT_ONLY") {
            console.warn(
                JSON.stringify({
                    type: "FEATURE_ENTITLEMENT_MISSING_STORE",
                    userId: context?.userId ?? null,
                    featureKey,
                    method: context?.method ?? null,
                    path: context?.path ?? null,
                    timestamp: new Date().toISOString(),
                }),
            );
            return true;
        }
        throw new ValidationError("Toko wajib dipilih", 400, "storeId");
    }

    const entitlement = await getStoreEntitlement(storeId, prisma);
    const allowed = entitlement.featureKeys.includes(featureKey);

    if (allowed) {
        return true;
    }

    if (mode === "DETECT_ONLY") {
        logDetectedBlock(storeId, featureKey, entitlement, context);
        return true;
    }

    throw new ValidationError(
        "Fitur ini tidak tersedia pada paket subscription toko.",
        403,
        "feature",
    );
};

export const assertStoreCanUseFeature = async (
    prisma: PrismaClientLike,
    storeId: string | null | undefined,
    featureKey: string,
    context?: EntitlementContext,
) => {
    if (!storeId) {
        throw new ValidationError("Toko wajib dipilih", 400, "storeId");
    }

    const entitlement = await getStoreEntitlement(storeId, prisma);
    if (entitlement.isExpired) {
        throw new ValidationError(
            "Masa aktif toko sudah habis. Silakan perpanjang subscription untuk melanjutkan transaksi.",
            403,
            "storeId",
        );
    }

    return assertStoreHasFeature(prisma, storeId, featureKey, context);
};

export const getRequiredPlanByCode = async (
    code: string,
    prisma: PrismaClientLike = Model,
) => {
    const plan = await prisma.subscription_plans.findUnique({
        where: {
            code,
        },
    });

    if (!plan) {
        throw new ValidationError(`Paket ${code} belum dikonfigurasi.`, 500, "planId");
    }

    return plan;
};

export const resolveSubscriptionPlanId = async (
    planId: string | null | undefined,
    type?: string | null,
    prisma: PrismaClientLike = Model,
) => {
    if (planId) {
        const plan = await prisma.subscription_plans.findUnique({
            where: {
                id: planId,
            },
        });

        if (!plan) {
            throw new ValidationError("Paket subscription tidak ditemukan", 404, "planId");
        }

        return plan.id;
    }

    const fallbackCode = type === "TRIAL" ? "TRIAL" : LEGACY_PLAN_CODE;
    const fallbackPlan = await getRequiredPlanByCode(fallbackCode, prisma);

    return fallbackPlan.id;
};
