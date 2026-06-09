import { AsyncLocalStorage } from "async_hooks";
import { NextFunction, Request, Response } from "express";

export interface ActivityContext {
    userId?: string | null;
    userLevel?: string | null;
    storeId?: string | null;
    method?: string | null;
    path?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
}

const activityContext = new AsyncLocalStorage<ActivityContext>();

export const activityContextMiddleware = (
    req: Request,
    _res: Response,
    next: NextFunction,
) => {
    activityContext.run(
        {
            method: req.method,
            path: req.originalUrl,
            ipAddress: req.ip,
            userAgent: req.get("user-agent") ?? null,
        },
        next,
    );
};

export const setActivityUserContext = (context: Partial<ActivityContext>) => {
    const store = activityContext.getStore();
    if (!store) return;

    Object.assign(store, context);
};

export const getActivityContext = () => activityContext.getStore();
