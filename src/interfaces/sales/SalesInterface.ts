import { sales_status } from "@prisma/client";

export interface SalesInterface {
    id: string;
    storeId: string | null;
    memberId: string | null;
    saleOrderId: string | null;
    date: Date | null;
    invoice: string | null;
    subTotal: number;
    tax: number;
    discount: number;
    addtionalCost: number;
    shippingCost: number;
    total: number;
    downPayment: number;
    payCash: number;
    payCredit: number;
    payMetodeId: string | null;
    status: sales_status | null;
    accountCashId: string | null;
    accountDebitId: string | null;
    accountCreditId: string | null;
    accountDownPaymentId: string | null;
    description?: string;
    userCreate: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
    deletedAt: Date | null;
}

export interface SalesQueryInterface extends SalesInterface {
    limit: string;
    page: string;
}

export interface ItemInBodyInterface {
    body: SalesInterface;
}
