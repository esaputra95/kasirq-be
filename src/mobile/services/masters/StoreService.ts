import Model from "#root/services/PrismaService";
import moment from "moment";
import { ValidationError } from "#root/helpers/handleErrors";
import { getStoreEntitlement } from "#root/mobile/services/entitlements/FeatureEntitlementService";

/**
 * Get stores for select dropdown based on user level
 */
export const getStoresForSelect = async (userId: string, userLevel: string) => {
    let dataOption: any = [];

    if (userLevel === "cashier") {
        const user = await Model.users.findUnique({
            where: { id: userId },
        });

        const stores = await Model.stores.findMany({
            where: {
                id: user?.storeId ?? "",
                expiredDate: {
                    gte: moment().format(),
                },
            },
        });

        dataOption = stores.map((store) => ({
            key: store.id,
            value: store.name,
        }));
    } else {
        const stores = await Model.stores.findMany({
            where: {
                ownerId: userId,
                expiredDate: {
                    gte: moment().format(),
                },
            },
        });

        dataOption = stores.map((store) => ({
            key: store.id,
            value: store.name,
            defaultCashId: store.defaultCashId,
        }));
    }

    return {
        message: "successfully in get user data",
        data: {
            store: dataOption,
        },
    };
};

export const getStoresForSelectSubscription = async (
    userId: string,
    userLevel: string,
) => {
    let dataOption: any = [];
    const now = new Date();
    if (userLevel === "cashier") {
        const user = await Model.users.findUnique({
            where: { id: userId },
        });

        const stores = await Model.stores.findMany({
            where: {
                id: user?.storeId ?? "",
                expiredDate: {
                    gte: now,
                },
                storeSubscriptions: {
                    some: {
                        status: "ACTIVE",
                        endDate: {
                            gte: now,
                        },
                    },
                },
            },
        });

        dataOption = await Promise.all(
            stores.map(async (store) => {
                const entitlement = await getStoreEntitlement(store.id);

                return {
                    key: store.id,
                    value: store.name,
                    subscription: entitlement.subscription,
                    featureKeys: entitlement.featureKeys,
                    isExpired: entitlement.isExpired,
                };
            }),
        );
    } else {
        const stores = await Model.stores.findMany({
            where: {
                ownerId: userId,
                expiredDate: {
                    gte: now,
                },
                storeSubscriptions: {
                    some: {
                        status: "ACTIVE",
                        endDate: {
                            gte: now,
                        },
                    },
                },
            },
        });
        console.log("stores", stores);

        dataOption = await Promise.all(
            stores.map(async (store) => {
                const entitlement = await getStoreEntitlement(store.id);

                return {
                    key: store.id,
                    value: store.name,
                    defaultCashId: store.defaultCashId,
                    subscription: entitlement.subscription,
                    featureKeys: entitlement.featureKeys,
                    isExpired: entitlement.isExpired,
                };
            }),
        );
    }

    return {
        message: "successfully in get user data",
        data: {
            store: dataOption,
        },
    };
};

export const updateStore = async (id: string, storeData: any) => {
    const data = { ...storeData };
    delete data.storeId;
    await Model.stores.update({ where: { id }, data });
    return { message: "successful in updated Store data" };
};

export const getStoreById = async (id: string) => {
    const store = await Model.stores.findUnique({ where: { id } });
    if (!store) throw new ValidationError("data not found", 404, "store");
    return {
        message: "successfully in get Store data",
        data: { Store: store },
    };
};
