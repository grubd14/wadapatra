import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  createUploadBody,
  detectSourceType,
} from "../services/upload.js";
import { z } from "zod";
import { processUpload } from "../services/org_services.js";

const selectUpload = z.object({
  id: z.string(),
  org_id: z.string(),
  file_path: z.string(),
});

const errorSchema = z.object({
  error: z.string(),
});

export const uploadRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.post(
    "/",
    {
      schema: {
        response: { 201: selectUpload, 400: errorSchema, 415: errorSchema },
      },
    },
    async (request, response) => {
      if (!request.isMultipart()) {
        return response
          .code(400)
          .send({ error: "expected multipart/form-data" });
      }

      let orgIdField: unknown;
      let file: { buffer: Buffer; filename: string } | undefined;

      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === "field") {
          if (part.fieldname === "org_id") orgIdField = part.value;
        } else if (!file) {
          file = { buffer: await part.toBuffer(), filename: part.filename };
        } else {
          // drain extra files so the parser can continue
          await part.toBuffer();
        }
      }

      if (!file) {
        return response.code(400).send({ error: "no file uploaded" });
      }

      const parsed = createUploadBody.safeParse({
        org_id: typeof orgIdField === "string" ? orgIdField : undefined,
      });
      if (!parsed.success) {
        return response.code(400).send({ error: "Missing or invalid org_id" });
      }

      if (!detectSourceType(file.filename)) {
        return response.code(415).send({ error: "unsupported filetype" });
      }



      const { savedPath, results } = await processUpload(
        parsed.data.org_id,
        file.buffer,
        file.filename
      )

      request.log.info({services: results.services, rejected:results.rejected})
      return response.code(201).send(savedPath);
    },
  );
};
