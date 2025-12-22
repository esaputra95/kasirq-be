export interface ExpenseInterface {
    id: string;
    storeId: string;
    kasAccountId: string;
    expenseCategoryId: string;
    amount: number;
    description: string | null;
    expenseDate: Date;
    userCreate: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
    deletedAt: Date | null;
}

export interface ExpenseQueryInterface extends Partial<ExpenseInterface> {
    limit?: string;
    page?: string;
    startDate?: string;
    endDate?: string;
}

export interface ExpenseBodyInterface {
    kasAccountId: string;
    expenseCategoryId: string;
    amount: number;
    description?: string;
    expenseDate: string;
}
