export interface SupplierInterface {
    id: string
    ownerId: string | null
    name: string
    phone: string | null
    address: string | null
    userCreate: string | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
}

export interface SupplierQueryInterface extends SupplierInterface {
    limit: string,
    page: string
}

export interface SupplierBodyInterface {
    body: SupplierBodyInterface
}