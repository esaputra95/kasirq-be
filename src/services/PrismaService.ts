import { PrismaClient } from '@prisma/client'

const Model = new PrismaClient({
  // log: ['query']
})

export default Model