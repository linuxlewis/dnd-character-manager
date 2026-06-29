import { characterRouteContracts } from "./domains/characters/runtime/contract.js";
import { authRouteContracts } from "./providers/auth/index.js";

export const apiRouteContracts = [...authRouteContracts, ...characterRouteContracts] as const;
