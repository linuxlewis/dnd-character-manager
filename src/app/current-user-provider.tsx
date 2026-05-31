import { useQuery } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext } from "react";
import type { CurrentUserResponse } from "../generated/api-client.generated.js";
import { apiQueries } from "../generated/api-client.generated.js";

type CurrentUser = CurrentUserResponse["user"];

interface CurrentUserContextValue {
	currentUser: CurrentUser | null;
	error: Error | null;
	isLoading: boolean;
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

export function CurrentUserProvider({ children }: { children: ReactNode }) {
	const currentUserQuery = useQuery(apiQueries.getCurrentUser());
	const value: CurrentUserContextValue = {
		currentUser: currentUserQuery.data?.user ?? null,
		error: currentUserQuery.error,
		isLoading: currentUserQuery.isLoading,
	};

	return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser() {
	const context = useContext(CurrentUserContext);
	if (!context) {
		throw new Error("useCurrentUser must be used within CurrentUserProvider.");
	}
	return context;
}
