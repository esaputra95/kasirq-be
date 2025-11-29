import Model from "#root/services/PrismaService";

const getOwnerId = async (id: string, userType: string) => {
    try {
        if (userType === "cashier") {
            const user = await Model.users.findUnique({
                where: {
                    id: id,
                },
            });

            const store = await Model.stores.findFirst({
                where: {
                    id: user?.storeId ?? "",
                },
            });
            return { status: true, id: store?.ownerId };
        }
        return { status: true, id: id };
    } catch (error) {
        return error;
    }
};

export default getOwnerId;
