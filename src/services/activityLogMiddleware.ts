import { Prisma, PrismaClient } from "@prisma/client";
import { getActivityContext } from "#root/services/activityContext";

const TRACKED_MODELS = new Set([
    "account",
    "brands",
    "categories",
    "expense",
    "expenseCategory",
    "features",
    "memberLevels",
    "members",
    "products",
    "purchases",
    "roles",
    "salePending",
    "sales",
    "salesPeoples",
    "store_subscriptions",
    "stores",
    "subscription_plans",
    "suppliers",
    "units",
    "users",
    "variants",
]);

const SYSTEM_FIELDS = new Set(["createdAt", "updatedAt"]);
const SENSITIVE_FIELDS = new Set(["password", "token"]);

const toDelegateName = (model?: string) => {
    if (!model) return "";
    return model.charAt(0).toLowerCase() + model.slice(1);
};

const normalizeData = (value: any): any => {
    if (value === undefined) return null;
    return JSON.parse(
        JSON.stringify(value, (key, item) => {
            if (SENSITIVE_FIELDS.has(key)) return "[REDACTED]";
            return item;
        }),
    );
};

const extractEntityId = (record: any, args: any) =>
    record?.id ?? args?.where?.id ?? args?.data?.id ?? null;

const extractEntityLabel = (record: any) =>
    record?.name ??
    record?.title ??
    record?.invoice ??
    record?.code ??
    record?.username ??
    record?.email ??
    null;

const extractStoreId = (record: any, contextStoreId?: string | null) => {
    if (record?.storeId) return record.storeId;
    if (record?.defaultCashId) return record.id;
    if (record?.ownerId && record?.expiredDate !== undefined) return record.id;
    return contextStoreId ?? null;
};

const extractOwnerId = (record: any) => record?.ownerId ?? null;

const buildChanges = (beforeData: any, afterData: any) => {
    if (!beforeData || !afterData) return null;

    const fields = new Set([
        ...Object.keys(beforeData),
        ...Object.keys(afterData),
    ]);
    const changes: Record<string, { before: any; after: any }> = {};

    for (const field of fields) {
        if (SYSTEM_FIELDS.has(field)) continue;

        const beforeValue = normalizeData(beforeData[field]);
        const afterValue = normalizeData(afterData[field]);

        if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
            changes[field] = {
                before: beforeValue,
                after: afterValue,
            };
        }
    }

    return Object.keys(changes).length > 0 ? changes : null;
};

const getActionFromOperation = (operation: string) => {
    if (operation.startsWith("create")) return "CREATE";
    if (operation.startsWith("update")) return "UPDATE";
    if (operation.startsWith("delete")) return "DELETE";
    if (operation === "upsert") return "UPSERT";
    return operation.toUpperCase();
};

const getBeforeData = async (delegate: any, operation: string, args: any) => {
    if (!delegate) return null;

    if (["update", "delete", "upsert"].includes(operation) && args?.where) {
        return delegate.findUnique({ where: args.where });
    }

    return null;
};

export const createPrismaActivityLogMiddleware = (
    prisma: PrismaClient,
): Prisma.Middleware => {
    return async (params, next) => {
        const delegate = (prisma as any)[toDelegateName(params.model)];
        const shouldTrack =
            params.model &&
            TRACKED_MODELS.has(params.model) &&
            ["create", "update", "delete", "upsert"].includes(params.action);

        if (shouldTrack && params.runInTransaction) {
            return next(params);
        }

        const beforeData = shouldTrack
            ? await getBeforeData(delegate, params.action, params.args)
            : null;
        const result = await next(params);

        if (!shouldTrack) return result;

        const context = getActivityContext();
        if (!context?.userId) return result;

        const normalizedBefore = normalizeData(beforeData);
        const normalizedAfter = normalizeData(result);
        const changes = buildChanges(normalizedBefore, normalizedAfter);
        const referenceRecord = result ?? beforeData ?? {};

        try {
            const user = await prisma.users.findUnique({
                where: { id: context.userId },
                select: {
                    id: true,
                    name: true,
                },
            });

            await prisma.activityLogs.create({
                data: {
                    userId: context.userId,
                    userLevel: context.userLevel ?? null,
                    actorName: user?.name ?? null,
                    ownerId: extractOwnerId(referenceRecord),
                    storeId: extractStoreId(referenceRecord, context.storeId),
                    action: getActionFromOperation(params.action),
                    module: params.model as string,
                    entityId: extractEntityId(referenceRecord, params.args),
                    entityLabel: extractEntityLabel(referenceRecord),
                    method: context.method ?? null,
                    path: context.path ?? null,
                    ipAddress: context.ipAddress ?? null,
                    userAgent: context.userAgent ?? null,
                    beforeData: normalizedBefore,
                    afterData: normalizedAfter,
                    changes: changes ?? Prisma.JsonNull,
                },
            });
        } catch (error) {
            console.error("Failed to create activity log:", error);
        }

        return result;
    };
};
