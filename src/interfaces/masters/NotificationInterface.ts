export interface NotificationInterface {
    id: string;
    title: string | null;
    message: string;
    type: string | null;
    createdAt: Date;
}

export interface NotificationRecipientInterface {
    id: string;
    notificationId: string;
    userId: string;
    isRead: boolean;
    readAt: Date | null;
    createdAt: Date;
}

export interface NotificationQueryInterface {
    limit?: string;
    page?: string;
    title?: string;
    type?: string;
    userId?: string;
}
