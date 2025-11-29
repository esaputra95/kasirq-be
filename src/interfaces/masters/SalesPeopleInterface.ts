export interface SalesPeopleInterface {
    id: string;
    ownerId: string | null;
    name: string;
    phone: string | null;
    email: string | null;
    userCreate: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
    deletedAt: Date | null;
}

export interface SalesPeopleQueryInterface extends SalesPeopleInterface {
    limit: string;
    page: string;
}

export interface SalesPeopleBodyInterface {
    body: SalesPeopleBodyInterface;
}
