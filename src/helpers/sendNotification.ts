import admin from "#services/firebaseAdmin";
import type { Message } from "firebase-admin/messaging";

export async function sendNotificationToDevice(
    token: string,
    title: string,
    body: string,
    data: Record<string, string> = {}
): Promise<string> {
    const message: Message = {
        token,
        notification: { title, body },
        data: { ...data },
        android: {
            priority: "high" as const,
        },
        apns: {
            payload: {
                aps: {
                    sound: "default",
                },
            },
        },
    };

    try {
        const response = await admin.messaging().send(message);
        console.log("Notification sent successfully:", response);
        return response;
    } catch (error) {
        console.error("Error sending notification:", error);
        throw error; // Re-throw untuk caller bisa handle
    }
}
