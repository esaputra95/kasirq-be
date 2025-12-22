import { Request, Response } from "express";
import Model from "./PrismaService";
import { v4 as uuidv4 } from "uuid";

export const enhanceStore = async (req: Request, res: Response) => {
    try {
        await Model.$transaction(async (prisma) => {
            const users = await prisma.users.findMany({
                include: { stores: true },
            });

            for (const user of users) {
                // Skip if user has no stores to avoid errors
                if (!user.stores || user.stores.length === 0) continue;

                const firstStoreId = user.stores[0].id;

                // 1. Update existing accounts belonging to this user
                const existingAccounts = await prisma.account.findMany({
                    where: { ownerId: user.id },
                });

                for (const acc of existingAccounts) {
                    await prisma.account.update({
                        where: { id: acc.id },
                        data: {
                            // Only set storeId if it's currently null or empty
                            storeId: acc.storeId || firstStoreId,
                            // Ensure currentBalance is initialized if null
                            currentBalance:
                                acc.currentBalance ?? acc.balance ?? 0,
                            // Maintain existing balance if present
                            balance: acc.balance ?? 0,
                        },
                    });
                }

                // 2. Ensure every store has at least one "Kas Kecil"
                for (const store of user.stores) {
                    const hasKasKecil = await prisma.account.findFirst({
                        where: {
                            storeId: store.id,
                            name: "Kas Kecil",
                        },
                    });

                    if (!hasKasKecil) {
                        const newAccount = await prisma.account.create({
                            data: {
                                id: uuidv4(),
                                name: "Kas Kecil",
                                ownerId: user.id,
                                storeId: store.id,
                                balance: 0,
                                currentBalance: 0,
                                type: "CASH",
                            },
                        });
                        await prisma.stores.update({
                            where: { id: store.id },
                            data: {
                                defaultCashId: newAccount.id,
                            },
                        });
                    } else {
                        await prisma.stores.update({
                            where: { id: store.id },
                            data: {
                                defaultCashId: hasKasKecil.id,
                            },
                        });
                    }
                }
            }
        });
        res.status(200).json({
            message: "successfully in enhancing store",
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "failed in enhancing store",
            error,
        });
    }
};
