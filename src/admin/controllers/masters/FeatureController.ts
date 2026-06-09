import Model from "#root/services/PrismaService";
import { Request, Response } from "express";
import { handleErrorMessage, ValidationError } from "#root/helpers/handleErrors";

type FeatureQuery = {
    limit?: string;
    page?: string;
    search?: string;
    key?: string;
    name?: string;
    status?: string;
    group?: string;
    sortby?: string;
    sort?: "asc" | "desc";
};

const getData = async (req: Request<{}, {}, {}, FeatureQuery>, res: Response) => {
    try {
        const query = req.query;
        const take = parseInt(query.limit ?? "20");
        const page = parseInt(query.page ?? "1");
        const skip = (page - 1) * take;

        let filter: any = {};
        if (query.search) {
            filter = {
                ...filter,
                OR: [
                    { key: { contains: query.search } },
                    { name: { contains: query.search } },
                ],
            };
        }
        if (query.key) {
            filter = { ...filter, key: { contains: query.key } };
        }
        if (query.name) {
            filter = { ...filter, name: { contains: query.name } };
        }
        if (query.status) {
            filter = { ...filter, status: query.status };
        }
        if (query.group) {
            filter = { ...filter, group: { contains: query.group } };
        }

        const allowedSortFields = ["key", "name", "group", "status", "createdAt"];
        const sortBy = allowedSortFields.includes(query.sortby ?? "")
            ? query.sortby
            : "createdAt";
        const sort = query.sort === "asc" || query.sort === "desc" ? query.sort : "desc";

        const [features, total] = await Promise.all([
            Model.features.findMany({
                where: filter,
                skip,
                take,
                orderBy: {
                    [sortBy as string]: sort,
                },
            }),
            Model.features.count({
                where: filter,
            }),
        ]);

        res.status(200).json({
            status: true,
            message: "successful in getting Feature data",
            data: {
                features,
                info: {
                    page,
                    limit: take,
                    total,
                    totalPage: Math.ceil(total / take),
                },
            },
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const postData = async (req: Request, res: Response) => {
    try {
        await Model.features.create({
            data: {
                key: req.body.key,
                name: req.body.name,
                description: req.body.description ?? null,
                group: req.body.group ?? null,
                status: req.body.status ?? "active",
            },
        });

        res.status(200).json({
            status: true,
            message: "successful in created Feature data",
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const updateData = async (req: Request, res: Response) => {
    try {
        await Model.features.update({
            where: {
                id: req.params.id,
            },
            data: {
                key: req.body.key,
                name: req.body.name,
                description: req.body.description,
                group: req.body.group,
                status: req.body.status,
            },
        });

        res.status(200).json({
            status: true,
            message: "successful in updated Feature data",
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const deleteData = async (req: Request, res: Response) => {
    try {
        const feature = await Model.features.findUnique({
            where: {
                id: req.params.id,
            },
            select: {
                id: true,
            },
        });

        if (!feature) {
            throw new ValidationError("Feature tidak ditemukan", 404, "feature");
        }

        await Model.features.delete({
            where: {
                id: req.params.id,
            },
        });

        res.status(200).json({
            status: true,
            message: "successfully in deleted Feature data",
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

const getDataById = async (req: Request, res: Response) => {
    try {
        const feature = await Model.features.findUnique({
            where: {
                id: req.params.id,
            },
        });

        if (!feature) {
            throw new ValidationError("Feature tidak ditemukan", 404, "feature");
        }

        res.status(200).json({
            status: true,
            message: "successfully in get Feature data",
            data: {
                feature,
            },
        });
    } catch (error) {
        handleErrorMessage(res, error);
    }
};

export { getData, postData, updateData, deleteData, getDataById };
