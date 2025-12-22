export interface CashflowInterface {
    id: string;
    kasId: string;
    type: "IN" | "OUT";
    amount: number;
    description: string | null;
    referenceId: string | null;
    referenceType: string | null;
    userCreate: string | null;
    createdAt: Date | null;
    deletedAt: Date | null;
}

export interface CashflowQueryInterface extends Partial<CashflowInterface> {
    limit?: string;
    page?: string;
    startDate?: string;
    endDate?: string;
}

export interface CashflowBodyInterface {
    kasId: string;
    type: "IN" | "OUT";
    amount: number;
    description?: string;
    referenceId?: string;
    referenceType?: string;
}
