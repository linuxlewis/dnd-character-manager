import { authRouteContracts } from "./providers/auth/index.js";

export const apiRouteContracts = [...authRouteContracts] as const;
