import { characterRouteContracts } from "./domains/characters/runtime/contract.js";
import { inventoryTreasuryRouteContracts } from "./domains/inventory/runtime/contract.js";
import { authRouteContracts } from "./providers/auth/index.js";

export const apiRouteContracts = [
	...authRouteContracts,
	...characterRouteContracts,
	...inventoryTreasuryRouteContracts,
] as const;
