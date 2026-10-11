import { loadEnvFile } from "../scripts/load-env.js";

loadEnvFile();
process.env.DEMO_MODE = process.env.DEMO_MODE || "true";
process.env.DEMO_FIXED_NOW = process.env.DEMO_FIXED_NOW || "2026-10-01T12:00:00.000Z";
