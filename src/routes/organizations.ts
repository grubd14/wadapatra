import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { createOrgBody, createOrganization, listOrganization, orgList, selectOrg } from "../services/organizations.js";


export const orgRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.post('/', {
    schema: {
      body: createOrgBody,
      response: {201: selectOrg},
    },
  }, async (request, response) => {
    const org = await createOrganization(request.body)
    return response.code(201).send(org)
  })

  fastify.get('/', {
    schema: {
      response: {200:orgList}
    },
  }, async (request, response) => {
    return response.send(await listOrganization())
  })
}
