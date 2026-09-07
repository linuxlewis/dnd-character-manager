import { characterCreationRouteContracts } from "./application/character-detail/contract.js";
import { catalogueItemRouteContracts } from "./domains/catalogue/runtime/index.js";
import { characterRouteContracts } from "./domains/characters/runtime/index.js";
import {
	characterHistoryRouteContracts,
	characterItemRouteContracts,
	inventoryTreasuryRouteContracts,
} from "./domains/inventory/runtime/index.js";
import { authRouteContracts } from "./providers/auth/index.js";

export const apiRouteContracts = [
	...authRouteContracts,
	...characterCreationRouteContracts,
	...characterRouteContracts,
	...inventoryTreasuryRouteContracts,
	...characterItemRouteContracts,
	...characterHistoryRouteContracts,
	...catalogueItemRouteContracts,
] as const;
