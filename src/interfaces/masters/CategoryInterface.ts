export interface CategoryInterface {
    id: string
    storeId: string | null
    name: string
    description: string | null
    userCreate: string | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
}

export interface CategoryQueryInterface extends CategoryInterface {
    limit: string,
    page: string
}

export interface CategoryBodyInterface {
    body: CategoryBodyInterface
}