export interface HppHistory {
    id: string
    storeId: string | null
    transactionDetailId: string | null
    productConversionId: string | null
    price: number | null
    quantity: number | null
    quantityUsed: number | null
    status: 'available' | 'not_available'
}
