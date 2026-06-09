import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { setActivityUserContext } from "#root/services/activityContext";

const AccessToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization ?? "";
        if (!authHeader) throw new Error("");

        const token = authHeader.split(" ")[1];
        if (token == null) return res.send(401);

        jwt.verify(
            token,
            process.env.JWT_TOKEN || "1234567890",
            (err, decode: any) => {
                if (err) return res.send(403);
                res.locals.userId = decode?.id ?? "";
                res.locals.level = decode?.level ?? "";
                setActivityUserContext({
                    userId: res.locals.userId,
                    userLevel: res.locals.level,
                    storeId: decode?.storeId ?? null,
                });
                return next();
            },
        );
    } catch (error) {
        return res.send(403);
    }
};

export { AccessToken };
