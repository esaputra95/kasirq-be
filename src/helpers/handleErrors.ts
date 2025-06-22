import { Prisma } from "@prisma/client";
import { Response } from "express";

export const handleErrorMessage = async (res: Response, error: any) => {
  let statusCode = 500;
  let message = {
    type: "field",
    msg: `${error}`,
    path: "",
    location: "body",
  };

  if (error instanceof UnauthorizedError) {
    console.log({error});
    
    statusCode = error.statusCode;
    message = {
      ...message,
      msg: error.message,
    };
  }
  if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    const match = error.message.match(/Argument `(\w+)` is missing/);
    const fieldName = match ? match[1] : "unknown field";
    message = {
      ...message,
      msg: `One or more fields contain invalid data.`,
      path: fieldName,
    };
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    statusCode = 400;
    switch (error.code) {
      // 🔹 Unique constraint failed
      case "P2002":
        message = {
          ...message,
          msg: `The data you entered already exists. Please use a different value`,
          path: String(error?.meta?.target),
        };
        break;

      // 🔹 Foreign key constraint failed
      case "P2003":
        message = {
          ...message,
          msg: `Related data not found or invalid. Please ensure your input is correct.`,
          path: String(error?.meta?.target ?? error?.meta?.field_name),
        };
        break;

      // 🔹 Record not found
      case "P2025":
        message = {
          ...message,
          msg: `The data you are trying to update or delete was not found.`,
          path: String(error?.meta?.target),
        };
        break;

      // 🔹 Cannot delete or update due to relation constraints
      case "P2014":
        message = {
          ...message,
          msg: `This data cannot be deleted because it is still related to other data.`,
          path: String(error?.meta?.target),
        };
        break;

      // 🔹 Value too long
      case "P2000":
        message = {
          ...message,
          msg: `The input value is too long. Please enter a shorter value`,
          path: String(error?.meta?.target),
        };
        break;

      // 🔹 Record not found for WHERE condition
      case "P2001":
        message = {
          ...message,
          msg: `The requested data was not found.`,
          path: String(error?.meta?.target),
        };
        break;

      // 🔹 Required value missing
      case "P2011":
        message = {
          ...message,
          msg: `A required field is missing. Please check your input.`,
          path: String(error?.meta?.target),
        };
        break;

      // 🔹 Field has an invalid value
      case "P2005":
        message = {
          ...message,
          msg: `The data format is invalid. Please check your input and try again.`,
          path: String(error?.meta?.target),
        };
        break;

      // 🔹 Query returned no results
      case "P2016":
        message = {
          ...message,
          msg: `Invalid query or no data found in the database.`,
          path: String(error?.meta?.target),
        };
        break;

      // 🔹 Invalid data for operation
      case "P2018":
        message = {
          ...message,
          msg: `The data provided is not valid for this operation.`,
          path: String(error?.meta?.target),
        };
        break;

      // 🔹 Incorrect data format
      case "P2020":
        message = {
          ...message,
          msg: `The data format does not match the expected format in the database.`,
          path: String(error?.meta?.target),
        };
        break;

      // 🔹 Table or column does not exist
      case "P2021":
        message = {
          ...message,
          msg: `The requested table or column was not found in the database.`,
          path: String(error?.meta?.target),
        };
        statusCode = 500;
        break;

      // 🔹 Transaction failed
      case "P2030":
        message = {
          ...message,
          msg: `Database transaction failed. Please try again.`,
          path: String(error?.meta?.target),
        };
        statusCode = 500;
        break;

      // 🔹 Constraint failed (check constraint)
      case "P2022":
        message = {
          ...message,
          msg: `The data does not meet the required validation constraints.`,
          path: String(error?.meta?.target),
        };
        break;
      
      case "P2032":
        message = {
          ...message,
          msg: `Expectation type ${String(error?.meta?.expected_type)} found ${String(error?.meta?.found)}`,
          path: String(error?.meta?.field),
        };
        break;
      

      // 🔹 Timeout error
      case "P2034":
        message = {
          ...message,
          msg: `Database request timed out. Please try again later.`,
          path: String(error?.meta?.target),
        };
        statusCode = 500;
        break;

      default:
        message = {
          ...message,
          msg: `An unknown error has occurred.`,
          path: String(error?.meta?.target),
        };
        statusCode = 500;
        break;
    }
  }
  res.status(statusCode).json({
    status: false,
    message: "error",
    errors: [message],
  });
};

export const errorType = {
  statusCode: 500,
  message: "",
  errors: [
    {
      type: "",
      msg: "",
      path: "",
      location: "",
    },
  ],
};

const extractFieldFromError = (errorMessage: string): string | null => {
  const match = errorMessage.match(/Argument `(\w+)`:/);
  return match ? match[1] : null;
};

export class UnauthorizedError extends Error {
  statusCode!: number;
  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = "UnauthorizedError";
    this.statusCode = statusCode
  }
}