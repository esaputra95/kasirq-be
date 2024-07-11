export interface BrandInterface {
    id: string
    storeId: string | null
    name: string
    description: string | null
    userCreate: string | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
}

export interface BrandQueryInterface extends BrandInterface {
    limit: string,
    page: string
}

export interface BrandBodyInterface {
    body: BrandBodyInterface
}