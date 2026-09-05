"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { HexBoard } from "@/components/hex-board";
import { GAMES, MENU_RADIUS, MENU_TITLE, gameAt } from "@/lib/games";
import { axialKey } from "@/lib/hex";

export function MainMenu() {
	const router = useRouter();
	const labels = useMemo(
		() => ({
			[axialKey(MENU_TITLE.q, MENU_TITLE.r)]: MENU_TITLE.title,
			...Object.fromEntries(
				GAMES.map((game) => [axialKey(game.q, game.r), game.title]),
			),
		}),
		[],
	);
	const interactiveKeys = useMemo(
		() => GAMES.map((game) => axialKey(game.q, game.r)),
		[],
	);

	return (
		<HexBoard
			radius={MENU_RADIUS}
			labels={labels}
			interactiveKeys={interactiveKeys}
			selectable={false}
			onTileClick={({ q, r }) => {
				const game = gameAt(q, r);
				if (game) router.push(game.path);
			}}
		/>
	);
}
