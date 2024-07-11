export interface UnitInterface {
    id: string
    storeId: string | null
    name: string
    description: string | null
    userCreate: string | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
}

export interface UnitQueryInterface extends UnitInterface {
    limit: string,
    page: string
}

export interface UnitBodyInterface {
    body: UnitBodyInterface
}