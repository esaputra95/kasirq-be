import moment from "moment-timezone";
import { v4 as uuidv4 } from "uuid";
import Model from "#root/services/PrismaService";
import { sendNotificationToDevice } from "#root/helpers/sendNotification";

const TIMEZONE = "Asia/Jakarta";
const REMINDER_DAYS_BEFORE = 3;
const NOTIFICATION_TYPE = "STORE_EXPIRY_REMINDER";

const jakartaDayRange = (date = moment.tz(TIMEZONE)) => ({
    start: date.clone().startOf("day").toDate(),
    end: date.clone().endOf("day").toDate(),
});

const sendExpiryNotification = async (store: {
    id: string;
    name: string;
    expiredDate: Date | null;
    ownerId: string;
    users: {
        id: string;
        deviceTokens: { id: string; token: string }[];
    };
}) => {
    if (!store.expiredDate) return false;

    const today = jakartaDayRange();
    const existingNotification = await Model.notifications.findFirst({
        where: {
            type: NOTIFICATION_TYPE,
            referenceId: store.id,
            createdAt: {
                gte: today.start,
                lte: today.end,
            },
        },
        select: { id: true },
    });

    if (existingNotification) return false;

    const notificationId = uuidv4();
    const recipientId = uuidv4();
    const expiredDateText = moment(store.expiredDate)
        .tz(TIMEZONE)
        .format("DD/MM/YYYY");
    const title = "Masa aktif toko hampir habis";
    const body = `Masa aktif ${store.name} akan berakhir dalam ${REMINDER_DAYS_BEFORE} hari (${expiredDateText}). Silakan perpanjang subscription toko.`;

    await Model.notifications.create({
        data: {
            id: notificationId,
            title,
            body,
            type: NOTIFICATION_TYPE,
            screen: "StoreSubscription",
            referenceId: store.id,
            metadata: {
                storeId: store.id,
                storeName: store.name,
                expiredDate: moment(store.expiredDate).tz(TIMEZONE).format(),
                daysBefore: REMINDER_DAYS_BEFORE,
            },
            recipients: {
                create: {
                    id: recipientId,
                    userId: store.ownerId,
                    isRead: false,
                },
            },
        },
    });

    const sendPromises = store.users.deviceTokens.map(async (deviceToken) => {
        try {
            await sendNotificationToDevice(deviceToken.token, title, body, {
                notificationId: recipientId,
                type: NOTIFICATION_TYPE,
                screen: "StoreSubscription",
                referenceId: store.id,
                storeId: store.id,
            });
        } catch (error) {
            console.error(
                `Failed to send store expiry reminder to user ${store.ownerId} device ${deviceToken.id}:`,
                error,
            );
        }
    });

    await Promise.allSettled(sendPromises);
    return true;
};

export const runStoreExpiryReminder = async () => {
    const targetDate = moment.tz(TIMEZONE).add(REMINDER_DAYS_BEFORE, "days");
    const target = jakartaDayRange(targetDate);

    const stores = await Model.stores.findMany({
        where: {
            deletedAt: null,
            expiredDate: {
                gte: target.start,
                lte: target.end,
            },
        },
        select: {
            id: true,
            name: true,
            expiredDate: true,
            ownerId: true,
            users: {
                select: {
                    id: true,
                    deviceTokens: {
                        where: { isActive: true },
                        select: {
                            id: true,
                            token: true,
                        },
                    },
                },
            },
        },
    });

    const results = await Promise.allSettled(
        stores.map((store) => sendExpiryNotification(store)),
    );
    const sent = results.filter(
        (result) => result.status === "fulfilled" && result.value,
    ).length;

    console.log(
        `Store expiry reminder checked ${stores.length} store(s), sent ${sent} notification(s).`,
    );
};

export const startStoreExpiryReminderScheduler = () => {
    runStoreExpiryReminder().catch((error) => {
        console.error("Failed to run store expiry reminder:", error);
    });

    const scheduleNextRun = () => {
        const now = moment.tz(TIMEZONE);
        let nextRun = now.clone().hour(8).minute(0).second(0).millisecond(0);

        if (nextRun.isSameOrBefore(now)) {
            nextRun = nextRun.add(1, "day");
        }

        const timeoutMs = nextRun.diff(now);

        setTimeout(() => {
            runStoreExpiryReminder()
                .catch((error) => {
                    console.error("Failed to run store expiry reminder:", error);
                })
                .finally(scheduleNextRun);
        }, timeoutMs);
    };

    scheduleNextRun();
};
