import cn from "./lib/cn"

export function Tile({ children, className }: { children?: React.ReactNode; className?: string }) {
	return (
		<div
			className={cn(
				"relative rounded-xl bg-neutral-200 dark:bg-neutral-900 flex flex-col justify-end items-start",
				className,
			)}
		>
			{children}
		</div>
	)
}
