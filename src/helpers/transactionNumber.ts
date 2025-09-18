import Model from "#root/services/PrismaService";
import moment from "moment";

export const transactionNumber = async ({
    module,
    storeId,
}: {
    module?: "SALE" | "PENDING";
    storeId: string;
}) => {
    try {
        const startOfMonth = moment().startOf("month").toDate();
        const endOfMonth = moment().endOf("month").toDate();
        let data: any;
        if (module === "SALE") {
            data = await Model.sales.findFirst({
                where: {
                    date: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                    storeId,
                },
                orderBy: {
                    transactionNumber: "desc",
                },
            });
        } else {
            data = await Model.salePending.findFirst({
                where: {
                    date: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                    storeId,
                },
                orderBy: {
                    transactionNumber: "desc",
                },
            });
        }
        if (data && data.transactionNumber) {
            const number = data.transactionNumber + 1;
            return {
                invoice: `${module}/${moment().format("YYYY/MM")}/${number}`,
                transactionNumber: number,
            };
        } else {
            return {
                invoice: `${module}/${moment().format("YYYY/MM")}/1`,
                transactionNumber: 1,
            };
        }
    } catch (error) {
        return {
            invoice: `${module}/${moment().format("YYYY/MM")}/1`,
            transactionNumber: 1,
        };
    }
};
