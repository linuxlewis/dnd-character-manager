import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { apiRouteContracts } from "../src/api-contracts.js";
import { createGeneratedOutputs, writeGeneratedOutputs } from "./openapi-generator.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputs = createGeneratedOutputs(apiRouteContracts, root);

writeGeneratedOutputs(outputs, root, process.argv.includes("--check"));
