import Fastify  from "fastify";
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import {db} from "./db/index.js"
import { organizations } from "./db/schema.js";
import { orgRoutes } from "./routes/organizations.js";

// You can specify any property from the node-postgres connection options
// const db = drizzle({ 
//   connection: { 
//     connectionString: process.env.DATABASE_URL!,
//   }
// });


const rows = await db.select().from(organizations)
console.log(rows)


const fastify = Fastify({logger: true})

fastify.register(orgRoutes, {prefix: '/orgs'})


fastify.listen({ port: 3000, host: '0.0.0.0' }, (err) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
})