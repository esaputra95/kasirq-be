import { Request, Response } from "express";
import moment from "moment";
import xlsx from "json-as-xlsx"
import Model from "#root/services/PrismaService";

const getData = async (req:Request, res:Response) => {
    try {
        const response = await modelData(req, res)
        res.status(200).json({
            status: true,
            message: 'SUccess get purchases report',
            data: response
        })
    } catch (error) {
        res.status(500)
    }
}

const download = async (req: Request, res:Response) => {
    res.download('Laporan Pembelian.xlsx')
}

const xlsxData = async (req:Request, res:Response) => {
    try {
        const response = await modelData(req, res);
        let dataExcel:any=[];
        for (let index = 0; index < response.length; index++) {
            console.log(response[index]);
            
            dataExcel=[
                ...dataExcel,
                {
                    no: response[index][0],
                    invoice: response[index][1],
                    date: response[index][2],
                    user: response[index][3],
                    subTotal: response[index][4],
                    discount: response[index][5],
                    total: response[index][6],
                }
            ]
        };
        let settings = {
            fileName: "Laporan Pembelian", 
            extraLength: 3,
            writeMode: "writeFile", 
            writeOptions: {},
            RTL: false,
        }

        const buffer = xlsx([
            {
                columns: [
                    {
                        label: 'No', value: 'no'
                    },
                    {
                        label: 'Invoice', value: 'invoice'
                    },
                    {
                        label: 'Tanggal', value: 'date'
                    },
                    {
                        label: 'User', value: 'user'
                    },
                    {
                        label: 'Sub Total', value: 'subTotal'
                    },
                    {
                        label: 'Discount', value: 'discount'
                    },
                    {
                        label: 'Total', value: 'total'
                    },
                ],
                content: dataExcel
            }
        ], settings)
        res.writeHead(200, {
            "Content-Type": "application/octet-stream",
            "Content-disposition": "attachment; filename=Laporan Pembelian.xlsx",
        })
        res.end(buffer)
    } catch (error) {
    }

}

const modelData = async (req: Request, res: Response) => {
    try {
        const body = req.query;
        console.log({body});
        
        let filter={};
        body?.user ? filter = {
            ...filter,
            userId: body.user
        } : null;
        body?.storeId ? filter = {
            ...filter,
            storeId: body.storeId
        } : null;
        body.accountCashId ? filter = {
            ...filter,
            accountCashId: body.accountCashId
        } : null

        const data = await Model.purchases.findMany({
            where: {
                date: {
                    gte: moment(body.startDate+' 00:00:00').format(),
                    lte: moment(body.endDate+' 23:59:00').format(),
                },
                ...filter
            },
            include:{
                purchaseDetails: {
                    include: {
                        products: true
                    }
                },
                users: true
            }
        });
        
        let newResponse:any=[];
        for (let index = 0; index < data.length; index++) {
            newResponse=[
                ...newResponse,
                [
                    (index+1),
                    data[index].invoice,
                    moment(data[index].date).format('DD/MM/YYYY'),
                    data[index]?.users?.name??'',
                    parseInt(data[index].subTotal+''),
                    parseInt(data[index].discount+''),
                    parseInt(data[index].total+'')
                ]
            ]
            const salesDetail = data[index].purchaseDetails ?? [];
            if(salesDetail.length>0){
                newResponse=[
                    ...newResponse,
                    [
                        '',
                        '',
                        '',
                        'Nama',
                        'Jumlah',
                        'Harga',
                        'Total'
                    ]
                ]
            }
            for (let iDetail = 0; iDetail < salesDetail.length; iDetail++) {
                newResponse=[
                    ...newResponse,
                    [
                        '',
                        '',
                        '',
                        salesDetail[iDetail].products?.name ?? '',
                        salesDetail[iDetail].quantity,
                        salesDetail[iDetail].price,
                        (parseInt((salesDetail[iDetail].quantity??0)+'')*parseInt((salesDetail[iDetail].price??0)+''))
                    ]
                ]
            }
        }
        return newResponse;
    } catch (error) {
        return []
    }
}

export { getData, xlsxData, download }