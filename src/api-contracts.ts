import { catalogueItemRouteContracts } from "./domains/catalogue/runtime/contract.js";
import { characterRouteContracts } from "./domains/characters/runtime/contract.js";
import { characterItemRouteContracts } from "./domains/inventory/runtime/character-item-contract.js";
import { inventoryTreasuryRouteContracts } from "./domains/inventory/runtime/contract.js";
import { characterHistoryRouteContracts } from "./domains/inventory/runtime/history-contract.js";
import { authRouteContracts } from "./providers/auth/index.js";

export const apiRouteContracts = [
	...authRouteContracts,
	...characterRouteContracts,
	...inventoryTreasuryRouteContracts,
	...characterItemRouteContracts,
	...characterHistoryRouteContracts,
	...catalogueItemRouteContracts,
] as const;
