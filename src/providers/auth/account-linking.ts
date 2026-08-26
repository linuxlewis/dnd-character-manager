export interface AnonymousAccountLink {
	anonymousUserId: string;
	linkedUserId: string;
}

export type AnonymousAccountLinkHandler = (link: AnonymousAccountLink) => Promise<void> | void;

const accountLinkHandlers = new Set<AnonymousAccountLinkHandler>();

export function registerAnonymousAccountLinkHandler(handler: AnonymousAccountLinkHandler) {
	accountLinkHandlers.add(handler);
	return () => {
		accountLinkHandlers.delete(handler);
	};
}

export async function handleAnonymousAccountLinked(link: AnonymousAccountLink) {
	for (const handler of accountLinkHandlers) {
		await handler(link);
	}
}

export function resetAnonymousAccountLinkHandlersForTest() {
	accountLinkHandlers.clear();
}
