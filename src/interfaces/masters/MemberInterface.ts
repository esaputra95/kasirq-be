export interface MemberInterface {
    id: string
    ownerId: string | null
    level: number
    name: string
    phone: string | null
    address: string | null
    userCreate: string | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
}

export interface MemberQueryInterface extends MemberInterface {
    limit: string,
    page: string
}

export interface MemberBodyInterface {
    body: MemberBodyInterface
}