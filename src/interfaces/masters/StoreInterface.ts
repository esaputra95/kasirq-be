export interface StoreInterface {
    id: string
    name: string
    ownerId: string
    address: string | null
    expiredDate: Date | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
    userCreate: string | null
}

export interface StoreQueryInterface extends StoreInterface {
    limit: string,
    page: string
}

export interface StoreBodyInterface {
    body: StoreInterface
}