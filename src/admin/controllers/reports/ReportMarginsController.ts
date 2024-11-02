import { Request, Response } from "express";
import moment from "moment";
import xlsx from "json-as-xlsx"
import Model from "#root/services/PrismaService";

const getData = async (req:Request, res:Response) => {
    try {
        const response = await modelData(req, res)
        console.log({response});
        
        res.status(200).json({
            status: true,
            message: 'SUccess get sales report',
            data: response
        })
    } catch (error) {
        res.status(500)
    }
}

const download = async (req: Request, res:Response) => {
    res.download('Laporan Penjualan.xlsx')
}

const xlsxData = async (req:Request, res:Response) => {
    try {
        const response = await modelData(req, res);
        let dataExcel:any=[];
        for (let index = 0; index < response.length; index++) {
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
            fileName: "Laporan Penjualan", 
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
            "Content-disposition": "attachment; filename=Laporan Penjualan.xlsx",
        })
        res.end(buffer)
    } catch (error) {
    }

}

const modelData = async (req: Request, res: Response) => {
    try {
        const body = req.query;

        const data:any[] = await Model.$queryRaw`
            SELECT 
                saleDetails.quantity * saleDetails.price AS sell,
                SUM(cogs.price * cogs.quantity) AS capital,
                sales.date,
                sales.invoice,
                saleDetails.id,
                sales.discount
            FROM 
                saleDetails
            LEFT JOIN 
                cogs ON cogs.saleDetailId = saleDetails.id
            LEFT JOIN 
                sales ON sales.id = saleDetails.saleId
            WHERE 
                sales.date BETWEEN ${moment(body?.startDate+' 00:00:00').format()} AND ${moment(body?.endDate+' 00:00:00').format()}
            GROUP BY saleDetails.id
        `;
        
        let newResponse:any=[];
        for (let index = 0; index < data.length; index++) {
            newResponse=[
                ...newResponse,
                [
                    (index+1),
                    data[index].invoice,
                    moment(data[index].date).format('DD/MM/YYYY'),
                    parseInt(data[index].capital+''),
                    parseInt(data[index].sell+''),
                    parseInt(data[index].sell+'')-parseInt(data[index].capital+'')
                ]
            ]
            // const salesDetail = data[index].saleDetails ?? [];
            // for (let iDetail = 0; iDetail < salesDetail.length; iDetail++) {
            //     newResponse=[
            //         ...newResponse,
            //         [
            //             '',
            //             '',
            //             '',
            //             salesDetail[iDetail].products?.name ?? '',
            //             salesDetail[iDetail].quantity,
            //             salesDetail[iDetail].price,
            //             (parseInt((salesDetail[iDetail].quantity??0)+'')*parseInt((salesDetail[iDetail].price??0)+''))
            //         ]
            //     ]
            // }
        }
        return newResponse;
    } catch (error) {
        return []
    }
}

export { getData, xlsxData, download }