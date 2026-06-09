import { PrismaClient } from '@prisma/client'
import { createPrismaActivityLogMiddleware } from "#root/services/activityLogMiddleware";

const Model = new PrismaClient({
  // log: ['query']
})

Model.$use(createPrismaActivityLogMiddleware(Model));

export default Model
