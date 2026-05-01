import { NextFunction, Request, Response } from "express";

const requireOwnerAccess = (
    _req: Request,
    res: Response,
    next: NextFunction,
) => {
    const level = String(res.locals.level || "").toLowerCase();
    const userId = String(res.locals.userId || "");

    if (!userId) {
        return res.status(401).json({
            status: false,
            message: "Unauthorized",
        });
    }

    if (level === "owner" || level === "superadmin") {
        return next();
    }

    return res.status(403).json({
        status: false,
        message: "Hanya owner/superadmin yang bisa mengakses endpoint ini",
    });
};

export default requireOwnerAccess;
