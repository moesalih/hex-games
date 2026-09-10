import { Home } from "lucide-react";
import Link from "next/link";

export function BackToMenu({ title }: { title?: string }) {
	return (
		<nav className="pointer-events-none fixed inset-x-0 top-0 z-10 flex items-start justify-between p-4">
			<Link
				href="/"
				aria-label="Home"
				className="pointer-events-auto text-neutral-300 transition-colors hover:text-white"
			>
				<Home className="size-6" />
			</Link>
			{title ? (
				<span className="text-sm text-neutral-200">{title}</span>
			) : null}
		</nav>
	);
}
