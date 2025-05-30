import Model from "#root/services/PrismaService"
import moment from "moment"

export const transactionNumber = async () => {
  try {
    const startOfMonth = moment().startOf('month').toDate();
    const endOfMonth = moment().endOf('month').toDate(); 
    const data = await Model.sales.findFirst({
      where: {
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      orderBy: {
        transactionNumber: 'desc',
      },
    });
    if(data && data.transactionNumber){
      const number = (data.transactionNumber+1)
      return {
        invoice: 'SALE/'+moment().format('YYYY/MM')+'/'+number,
        transactionNumber: number
      }
    }else{
      return {
        invoice: 'SALE/'+moment().format('YYYY/MM')+'/1',
        transactionNumber: 1
      }
    }
  } catch (error) {
    return {
      invoice: 'SALE/'+moment().format('YYYY/MM')+'/1',
      transactionNumber: 1
    }
  }
}