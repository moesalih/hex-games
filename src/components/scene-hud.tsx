import Link from "next/link";

export function BackToMenu({ title }: { title?: string }) {
	return (
		<nav className="pointer-events-none fixed inset-x-0 top-0 z-10 flex items-start justify-between p-4">
			<Link
				href="/"
				className="pointer-events-auto text-sm text-neutral-500 transition-colors hover:text-neutral-900"
			>
				Menu
			</Link>
			{title ? (
				<span className="text-sm text-neutral-400">{title}</span>
			) : null}
		</nav>
	);
}
