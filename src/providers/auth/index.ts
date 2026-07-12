export { registerAnonymousAccountLinkHandler } from "./account-linking.js";
export { getAuth } from "./auth.js";
export { authRouteContracts } from "./contract.js";
export type { CurrentUser, CurrentUserResponse } from "./current-user.js";
export { CurrentUserResponseSchema, CurrentUserSchema } from "./current-user.js";
export type {
	MagicLinkRequest,
	MagicLinkRequestResponse,
	SignOutResponse,
} from "./magic-link-types.js";
export { registerAuthRoutes } from "./routes.js";
export { getOrCreateCurrentUser } from "./session.js";
