import { Prisma } from "@prisma/client";
import { Response, Request } from "express";
import fs from "fs";
import path from "path";
import moment from "moment";

/* ---------- Util ---------- */

export class UnauthorizedError extends Error {
    statusCode!: number;
    constructor(message: string, statusCode = 401) {
        super(message);
        this.name = "UnauthorizedError";
        this.statusCode = statusCode;
    }
}

export class ValidationError extends Error {
    statusCode: number;
    path: string;

    constructor(message: string, statusCode = 400, path = "") {
        super(message);
        this.name = "ValidationError";
        this.statusCode = statusCode;
        this.path = path;

        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}

const logToFile = (req: Request, error: any, statusCode: number) => {
    try {
        const logDir = path.join(process.cwd(), "logs");
        const logFile = path.join(logDir, "error.log");

        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir);
        }

        const timestamp = moment().format("YYYY-MM-DD HH:mm:ss");
        const method = req.method;
        const url = req.originalUrl;
        const body = JSON.stringify(req.body);
        const stack = error instanceof Error ? error.stack : error;

        const logMessage = `[${timestamp}] ${method} ${url} - Status: ${statusCode}\nBody: ${body}\nError: ${error}\nStack: ${stack}\n${"-".repeat(50)}\n`;

        fs.appendFileSync(logFile, logMessage);
    } catch (err) {
        console.error("Failed to write to log file:", err);
    }
};

/**
 * Mengonversi berbagai error (Prisma, auth, dsb.) menjadi respons HTTP terstruktur.
 */
export const handleErrorMessage = async (res: Response, error: any) => {
    let statusCode = 500;
    let message = {
        type: "field",
        msg: `${error}`,
        path: "",
        location: "body",
    };

    // Logging to file ALWAYS happens first
    if (res.req) {
        logToFile(res.req as Request, error, statusCode);
    }

    /* 🔒― 401  */
    if (error instanceof UnauthorizedError) {
        statusCode = error.statusCode;
        message = { ...message, msg: error.message };
    } else if (error instanceof ValidationError) {
        /* 🛡️― Validation Error */
        statusCode = error.statusCode;
        message = {
            ...message,
            msg: error.message,
            path: error.path,
        };
    } else if (error instanceof Prisma.PrismaClientValidationError) {
        /* 📄― Validasi skema Prisma (mis. field hilang) */
        statusCode = 400;

        const fieldMatch = error.message.match(/argument\s+`([^`]+)`/i);
        const fieldName = fieldMatch ? fieldMatch[1] : "unknown_field";

        const detailMatch = error.message.match(
            /Invalid value for argument `\w+`:\s*(.+)/,
        );
        const detailMessage = detailMatch
            ? detailMatch[1].trim()
            : "Data tidak valid.";

        message = {
            ...message,
            msg: detailMessage,
            path: fieldName,
        };
    } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
        /* 🔧― Error request Prisma */
        statusCode = 400;

        switch (error.code) {
            case "P2002":
                message = {
                    ...message,
                    msg: "Data yang Anda masukkan sudah ada. Silakan gunakan nilai lain.",
                    path: String(error?.meta?.target),
                };
                break;
            case "P2003":
                message = {
                    ...message,
                    msg: "Tidak dapat menambah atau menghapus data karena ada data relasi yang tidak cocok atau data yang masih terkait.",
                    path: String(
                        error?.meta?.target ?? error?.meta?.field_name,
                    ),
                };
                break;
            case "P2025":
                message = {
                    ...message,
                    msg: "Data yang ingin Anda ubah atau hapus tidak ditemukan.",
                    path: String(error?.meta?.target),
                };
                break;
            case "P2014":
                message = {
                    ...message,
                    msg: "Data ini tidak dapat dihapus karena masih berelasi dengan data lain.",
                    path: String(error?.meta?.target),
                };
                break;
            case "P2000":
                message = {
                    ...message,
                    msg: "Input terlalu panjang. Mohon masukkan nilai yang lebih pendek.",
                    path: String(error?.meta?.target),
                };
                break;
            case "P2001":
                message = {
                    ...message,
                    msg: "Data yang diminta tidak ditemukan.",
                    path: String(error?.meta?.target),
                };
                break;
            case "P2011":
                message = {
                    ...message,
                    msg: "Field wajib belum diisi. Mohon lengkapi data.",
                    path: String(error?.meta?.target),
                };
                break;
            case "P2005":
                message = {
                    ...message,
                    msg: "Format data tidak valid. Periksa kembali input Anda.",
                    path: String(error?.meta?.target),
                };
                break;
            case "P2016":
                message = {
                    ...message,
                    msg: "Query tidak valid atau tidak ada data di database.",
                    path: String(error?.meta?.target),
                };
                break;
            case "P2018":
                message = {
                    ...message,
                    msg: "Data yang diberikan tidak valid untuk operasi ini.",
                    path: String(error?.meta?.target),
                };
                break;
            case "P2020":
                message = {
                    ...message,
                    msg: "Format data tidak sesuai dengan skema database.",
                    path: String(error?.meta?.target),
                };
                break;
            case "P2021":
                statusCode = 500;
                message = {
                    ...message,
                    msg: "Tabel atau kolom yang diminta tidak ditemukan di database.",
                    path: String(error?.meta?.target),
                };
                break;
            case "P2030":
                statusCode = 500;
                message = {
                    ...message,
                    msg: "Transaksi database gagal. Silakan coba lagi.",
                    path: String(error?.meta?.target),
                };
                break;
            case "P2022":
                message = {
                    ...message,
                    msg: "Data tidak memenuhi constraint validasi.",
                    path: String(error?.meta?.target),
                };
                break;
            case "P2032":
                message = {
                    ...message,
                    msg: `Ekspektasi tipe ${String(error?.meta?.expected_type)}, namun ditemukan ${String(error?.meta?.found)}.`,
                    path: String(error?.meta?.field),
                };
                break;
            case "P2034":
                statusCode = 500;
                message = {
                    ...message,
                    msg: "Permintaan ke database melebihi batas waktu. Coba beberapa saat lagi.",
                    path: String(error?.meta?.target),
                };
                break;
            default:
                statusCode = 500;
                message = {
                    ...message,
                    msg: "Terjadi kesalahan yang tidak diketahui.",
                    path: String(error?.meta?.target),
                };
                break;
        }
    }

    /* 🔙 Kirim respons JSON */
    res.status(statusCode).json({
        status: false,
        message: "error",
        errors: [message],
    });
};
