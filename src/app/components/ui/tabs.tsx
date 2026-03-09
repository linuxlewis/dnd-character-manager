import { type ReactNode, createContext, useContext, useState } from "react";
import { cn } from "../../lib/utils.ts";

interface TabsContextValue {
	activeTab: string;
	setActiveTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextValue>({ activeTab: "", setActiveTab: () => {} });

interface TabsProps {
	defaultValue: string;
	children: ReactNode;
	className?: string;
}

export function Tabs({ defaultValue, children, className }: TabsProps) {
	const [activeTab, setActiveTab] = useState(defaultValue);
	return (
		<TabsContext.Provider value={{ activeTab, setActiveTab }}>
			<div className={className}>{children}</div>
		</TabsContext.Provider>
	);
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
	return (
		<div
			role="tablist"
			className={cn(
				"inline-flex h-11 items-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground w-full",
				className,
			)}
		>
			{children}
		</div>
	);
}

interface TabsTriggerProps {
	value: string;
	children: ReactNode;
	className?: string;
}

export function TabsTrigger({ value, children, className }: TabsTriggerProps) {
	const { activeTab, setActiveTab } = useContext(TabsContext);
	const isActive = activeTab === value;
	return (
		<button
			role="tab"
			type="button"
			aria-selected={isActive}
			className={cn(
				"inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all cursor-pointer",
				isActive ? "bg-card text-foreground shadow-sm" : "hover:bg-card/50 hover:text-foreground",
				className,
			)}
			onClick={() => setActiveTab(value)}
		>
			{children}
		</button>
	);
}

interface TabsContentProps {
	value: string;
	children: ReactNode;
	className?: string;
}

export function TabsContent({ value, children, className }: TabsContentProps) {
	const { activeTab } = useContext(TabsContext);
	if (activeTab !== value) return null;
	return (
		<div role="tabpanel" className={cn("mt-3 animate-fade-in", className)}>
			{children}
		</div>
	);
}
