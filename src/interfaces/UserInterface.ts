import { user_verifed, users, users_level } from "@prisma/client";

export interface UserInterface {
    id: string,
    name: string,
    username: string,
    password: string,
    email?: string | null,
    phone?: string | null,
    storeId?: string;
    userCreate?: string | null,
    createdAt?: Date | null,
    updatedAt?: Date | null,
    deletedAt?: Date | null
}

export interface UserQueryInterface extends UserInterface {
    limit: string,
    page: string,
    level?: users_level
    verified?: user_verifed;
    sortby?: keyof users;
    sort?: 'asc' | 'desc'
}

export interface UserBodyInterface {
    body: UserBodyInterface
}