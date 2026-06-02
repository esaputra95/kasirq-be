import { Prisma } from "@prisma/client";
import moment from "moment-timezone";
import { ValidationError } from "#root/helpers/handleErrors";

type PrismaClientLike = Prisma.TransactionClient | any;

const jakartaStartOfToday = () =>
    moment.tz("Asia/Jakarta").startOf("day").toDate();

export const assertStoreCanTransact = async (
    prisma: PrismaClientLike,
    storeId?: string | null,
) => {
    if (!storeId) {
        throw new ValidationError("Toko wajib dipilih", 400, "storeId");
    }

    const store = await prisma.stores.findUnique({
        where: { id: storeId },
        select: {
            id: true,
            expiredDate: true,
        },
    });

    if (!store) {
        throw new ValidationError("Toko tidak ditemukan", 404, "storeId");
    }

    if (!store.expiredDate || store.expiredDate < jakartaStartOfToday()) {
        throw new ValidationError(
            "Masa aktif toko sudah habis. Silakan perpanjang subscription untuk melanjutkan transaksi.",
            403,
            "storeId",
        );
    }
};
