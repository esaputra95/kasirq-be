export interface ItemInInterface {
    id: string
    storeId: string | null
    name: string
    description: string | null
    userCreate: string | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
}

export interface ItemInQueryInterface extends ItemInInterface {
    limit: string,
    page: string
}

export interface ItemInBodyInterface {
    body: ItemInBodyInterface
}