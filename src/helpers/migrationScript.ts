import Model from "#root/services/PrismaService";
import { v4 as uuidv4 } from "uuid";
import moment from "moment";

async function migrateStoreSubscriptions() {
    try {
        // 1. Ambil semua store yang punya expiredDate
        const stores = await Model.stores.findMany({
            where: {
                expiredDate: { not: null },
            },
        });

        let successCount = 0;
        let skipCount = 0;

        for (const store of stores) {
            // Cek apakah sudah ada data di store_subscriptions untuk store ini
            const existingSub = await Model.store_subscriptions.findFirst({
                where: { storeId: store.id },
            });

            if (existingSub) {
                skipCount++;
                continue;
            }

            const now = new Date();
            const expiredDate = store.expiredDate as Date;

            // Tentukan status berdasarkan tanggal hari ini
            const status = moment(expiredDate).isAfter(now)
                ? "ACTIVE"
                : "EXPIRED";

            // 2. Buat record baru di store_subscriptions
            await Model.store_subscriptions.create({
                data: {
                    id: uuidv4(),
                    storeId: store.id,
                    type: "PAID", // Default ke PAID karena memiliki expiredDate
                    startDate: store.createdAt || now,
                    endDate: expiredDate,
                    durationMonth: 0, // Informasi ini tidak tersedia di data lama
                    price: 0, // Informasi ini tidak tersedia di data lama
                    status: status,
                    userCreate: store.userCreate,
                    createdAt: store.createdAt || now,
                },
            });

            successCount++;
        }

        console.log("=========================================");
        console.log(`Migrasi Selesai!`);
        console.log(`Berhasil: ${successCount}`);
        console.log(`Dilewati: ${skipCount}`);
        console.log("=========================================");
    } catch (error) {
        console.error("Terjadi kesalahan saat migrasi:", error);
    } finally {
        await Model.$disconnect();
    }
}

// Jalankan fungsi
migrateStoreSubscriptions();
