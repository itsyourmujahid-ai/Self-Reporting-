import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load environment variables from .env file.
dotenv.config();

const connectionUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
const sqlHost = process.env.SQL_HOST;
const sqlDbName = process.env.SQL_DB_NAME;
const user = process.env.SQL_ADMIN_USER || process.env.SQL_USER;
const password = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD;

if (!connectionUrl && !sqlHost) {
  throw new Error("Either DATABASE_URL, SUPABASE_DB_URL, or SQL_HOST must be set in environment variables.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle", // Output directory for migrations.
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: connectionUrl
    ? {
        url: connectionUrl,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: sqlHost!,
        user: user!,
        password: password!,
        database: sqlDbName!,
        ssl: sqlHost && !sqlHost.startsWith('/') ? { rejectUnauthorized: false } : false,
      },
  verbose: true, // Enable verbose output.
});
