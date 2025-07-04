import { Prisma } from "@prisma/client";
import { Response } from "express";

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

  /* 🔒― 401  */
  if (error instanceof UnauthorizedError) {
    statusCode = error.statusCode;
    message = { ...message, msg: error.message };
  }

  /* 📄― Validasi skema Prisma (mis. field hilang) */
  if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    const match = error.message.match(/Argument `(\w+)` is missing/);
    const fieldName = match ? match[1] : "field_tidak_diketahui";
    message = {
      ...message,
      msg: "Satu atau lebih field berisi data tidak valid.",
      path: fieldName,
    };
  }

  /* 🔧― Error request Prisma */
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    statusCode = 400;

    switch (error.code) {
      /* Unik */
      case "P2002":
        message = {
          ...message,
          msg: "Data yang Anda masukkan sudah ada. Silakan gunakan nilai lain.",
          path: String(error?.meta?.target),
        };
        break;

      /* Foreign-key constraint */
      case "P2003":
        message = {
          ...message,
          msg: "Tidak dapat menghapus karena masih ada data yang terkait.",
          path: String(error?.meta?.target ?? error?.meta?.field_name),
        };
        break;

      /* Record tidak ditemukan */
      case "P2025":
        message = {
          ...message,
          msg: "Data yang ingin Anda ubah atau hapus tidak ditemukan.",
          path: String(error?.meta?.target),
        };
        break;

      /* Child masih terkait */
      case "P2014":
        message = {
          ...message,
          msg: "Data ini tidak dapat dihapus karena masih berelasi dengan data lain.",
          path: String(error?.meta?.target),
        };
        break;

      /* Teks terlalu panjang */
      case "P2000":
        message = {
          ...message,
          msg: "Input terlalu panjang. Mohon masukkan nilai yang lebih pendek.",
          path: String(error?.meta?.target),
        };
        break;

      /* Data WHERE tidak ditemukan */
      case "P2001":
        message = {
          ...message,
          msg: "Data yang diminta tidak ditemukan.",
          path: String(error?.meta?.target),
        };
        break;

      /* Field wajib kosong */
      case "P2011":
        message = {
          ...message,
          msg: "Field wajib belum diisi. Mohon lengkapi data.",
          path: String(error?.meta?.target),
        };
        break;

      /* Format data salah */
      case "P2005":
        message = {
          ...message,
          msg: "Format data tidak valid. Periksa kembali input Anda.",
          path: String(error?.meta?.target),
        };
        break;

      /* Query tak menghasilkan data */
      case "P2016":
        message = {
          ...message,
          msg: "Query tidak valid atau tidak ada data di database.",
          path: String(error?.meta?.target),
        };
        break;

      /* Data tak valid untuk operasi */
      case "P2018":
        message = {
          ...message,
          msg: "Data yang diberikan tidak valid untuk operasi ini.",
          path: String(error?.meta?.target),
        };
        break;

      /* Format data tidak cocok */
      case "P2020":
        message = {
          ...message,
          msg: "Format data tidak sesuai dengan skema database.",
          path: String(error?.meta?.target),
        };
        break;

      /* Tabel/kolom tidak ditemukan */
      case "P2021":
        statusCode = 500;
        message = {
          ...message,
          msg: "Tabel atau kolom yang diminta tidak ditemukan di database.",
          path: String(error?.meta?.target),
        };
        break;

      /* Transaksi gagal */
      case "P2030":
        statusCode = 500;
        message = {
          ...message,
          msg: "Transaksi database gagal. Silakan coba lagi.",
          path: String(error?.meta?.target),
        };
        break;

      /* Check constraint */
      case "P2022":
        message = {
          ...message,
          msg: "Data tidak memenuhi constraint validasi.",
          path: String(error?.meta?.target),
        };
        break;

      /* Tipe tidak sesuai ekspektasi */
      case "P2032":
        message = {
          ...message,
          msg: `Ekspektasi tipe ${String(
            error?.meta?.expected_type
          )}, namun ditemukan ${String(error?.meta?.found)}.`,
          path: String(error?.meta?.field),
        };
        break;

      /* Timeout */
      case "P2034":
        statusCode = 500;
        message = {
          ...message,
          msg: "Permintaan ke database melebihi batas waktu. Coba beberapa saat lagi.",
          path: String(error?.meta?.target),
        };
        break;

      /* Lain-lain */
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

/* ---------- Util ---------- */

export class UnauthorizedError extends Error {
  statusCode!: number;
  constructor(message: string, statusCode = 401) {
    super(message);
    this.name = "UnauthorizedError";
    this.statusCode = statusCode;
  }
}
