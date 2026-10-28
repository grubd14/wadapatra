import Fastify  from "fastify";
import 'dotenv/config';
import { orgRoutes } from "./routes/organizations.js";
import { uploadRoutes } from "./routes/upload.js";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

// You can specify any property from the node-postgres connection options
// const db = drizzle({ 
//   connection: { 
//     connectionString: process.env.DATABASE_URL!,
//   }
// });


// const rows = await db.select().from(organizations)
// console.log(rows)



const fastify = Fastify({logger: true})

fastify.setValidatorCompiler(validatorCompiler)
fastify.setSerializerCompiler(serializerCompiler)
  
fastify.register(orgRoutes, {prefix: '/orgs'})
fastify.register(uploadRoutes, {prefix: '/uploads'})


fastify.listen({ port: 3000, host: '0.0.0.0' }, (err) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
})