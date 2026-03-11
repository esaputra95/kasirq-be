export interface MemberLevelInterface {
    id: string;
    ownerId: string | null;
    name: string;
    level: number;
    userCreate: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
    deletedAt: Date | null;
}

export interface MemberLevelQueryInterface {
    name?: string;
    limit?: string;
    page?: string;
}

export interface MemberLevelBodyInterface {
    name: string;
    level: number;
}
