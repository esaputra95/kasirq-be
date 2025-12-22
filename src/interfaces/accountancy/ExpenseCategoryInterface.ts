export interface ExpenseCategoryInterface {
    id: string;
    storeId: string;
    name: string;
    desc: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
    deletedAt: Date | null;
}

export interface ExpenseCategoryQueryInterface
    extends Partial<ExpenseCategoryInterface> {
    limit?: string;
    page?: string;
}

export interface ExpenseCategoryBodyInterface {
    name: string;
    desc?: string;
}
