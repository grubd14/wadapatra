import { fastify, type FastifyPluginAsync } from "fastify";
import { db } from "../db/index.js";
import { organizations } from "../db/schema.js";

export const orgRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/', {
    schema: {
      body: {
        type: 'object',
        required: ['name_np'],
        properties: {
          name_np: {type: 'string'},
          name_en: { type: 'string' },
          type: { type: 'string' },
          district: { type: 'string' },
          province: { type: 'string' },
          website: {type: 'string'}
        }
      }
    }
  }, async (request, response) => {
    const body = request.body as {
      name_np: string
      name_en: string
      type?: string
      district: string
      province?: string
      website: string
    }

    const [org] = await db.insert(organizations).values(body).returning()
    return response.code(201).send(org)
  })

  fastify.get('/', async (request, response) => {
    const rows = await db.select().from(organizations)
    return response.send(rows)
  })
}
