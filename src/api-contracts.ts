import { characterRouteContracts } from "./domains/characters/runtime/index.js";
import { authRouteContracts } from "./providers/auth/index.js";

export const apiRouteContracts = [...authRouteContracts, ...characterRouteContracts] as const;
