import { Request, Response } from "express";
import Model from "#root/services/PrismaService";
import { v4 as uuidv4 } from "uuid";
import { handleErrorMessage } from "#root/helpers/handleErrors";

export const generateMemberLevels = async (req: Request, res: Response) => {
    try {
        // Fetch all owners
        const owners = await Model.users.findMany({
            where: { level: "owner" },
        });

        let createdCount = 0;
        let existingCount = 0;

        for (const owner of owners) {
            // Check if General level already exists for this owner
            const existingLevel = await Model.memberLevels.findFirst({
                where: {
                    ownerId: owner.id,
                    level: 1,
                    name: "General",
                },
            });

            if (!existingLevel) {
                // Create default "General" level
                await Model.memberLevels.create({
                    data: {
                        id: uuidv4(),
                        ownerId: owner.id,
                        userCreate: owner.id,
                        name: "General",
                        level: 1,
                    },
                });
                createdCount++;
            } else {
                existingCount++;
            }
        }

        res.status(200).json({
            status: true,
            message: "Successfully generated member levels",
            data: {
                totalOwnersProcessed: owners.length,
                newLevelsCreated: createdCount,
                existingLevelsSkipped: existingCount,
            },
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};
