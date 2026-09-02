export interface CatalogueSearchPort<TInput, TResult> {
	search(input: TInput): Promise<TResult[]>;
}

export interface CatalogueDetailPort<TKey, TResult> {
	detail(key: TKey): Promise<TResult | null>;
}
