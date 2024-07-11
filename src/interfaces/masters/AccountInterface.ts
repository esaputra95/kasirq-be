export interface AccountInterface {
    id: string
    ownerId: string | null
    name: string | null
    balance: number
    type: string | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
}

export interface AccountQueryInterface extends AccountInterface {
    limit: string,
    page: string
}

export interface AccountBodyInterface {
    body: AccountBodyInterface
}