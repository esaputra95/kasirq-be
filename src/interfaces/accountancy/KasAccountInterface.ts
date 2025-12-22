export interface KasAccountInterface {
    id: string;
    storeId: string;
    name: string;
    saldoAwal: number;
    saldoSaatIni: number;
    isDefault: boolean;
    createdAt: Date | null;
    updatedAt: Date | null;
    deletedAt: Date | null;
}

export interface KasAccountQueryInterface extends Partial<KasAccountInterface> {
    limit?: string;
    page?: string;
}

export interface KasAccountBodyInterface {
    name: string;
    saldoAwal?: number;
    isDefault?: boolean;
}
