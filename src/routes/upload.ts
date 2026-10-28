import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { createUploadBody, detectSourceType} from "../services/upload.js";
import { z } from "zod";
import type { Multipart } from "@fastify/multipart";

const selectUpload = z.object({
  id: z.string(),
  org_id: z.string(),
  file_path: z.string(),
});

const errorSchema = z.object({
  error: z.string()
})

export const uploadRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.post(
    "/",
    {
      schema: {
        body: createUploadBody,
        response: { 201: selectUpload, 400: errorSchema, 415: errorSchema },
      },
    },
    async (request, response) => {
      let orgIdField: unknown;
      let file: { buffer: Buffer; filename: string } | undefined;

      //handling multiple filestreams
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === "field" && part.fieldname === "org_id") {
          orgIdField = part.value;
        } else if (part.type === "file" && !file) {
          file = { buffer: await part.toBuffer(), filename: part.filename };
        }
      }

      const parsed = createUploadBody.safeParse({
        org_id: typeof orgIdField === "string" ? orgIdField : undefined
      });

      if (!parsed.success) {
        return response.code(400).send({error: "Missing or invalid org_id"})
      }

      if (!file) {
        return response.code(400).send({error: "no file uploaded"})
      }
      if (!detectSourceType(file?.filename)) {
        return response.code(415).send({ error: "unsupported filetype" })
      }
    },
    
  );
};
