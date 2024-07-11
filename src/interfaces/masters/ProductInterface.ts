import { products_consignmentType, products_status, products_type } from "@prisma/client"

export interface ProductInterface {
    id: string
    storeId: string | null
    categoriId: string
    brandId: string
    code: string | null
    name: string
    hppType: string | null
    taxInclude: number | null
    stockMinimum: number | null
    description: string | null
    status: products_status | null
    image: string | null
    type: products_type | null
    consignment: number | null
    consignmentType: products_consignmentType | null
    userCreate: string | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
}

export interface ProductQueryInterface extends ProductInterface {
    limit: string,
    page: string
}

export interface ProductBodyInterface {
    body: ProductBodyInterface
}