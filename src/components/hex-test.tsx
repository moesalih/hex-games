"use client";

import { HexBoard } from "@/components/hex-board";
import { gameById } from "@/lib/games";
import { axialKey } from "@/lib/hex";

const test = gameById("test");
const RADIUS = test?.boardRadiusMin ?? 4;

const TILE_COLORS: Record<string, string> = {
	[axialKey(2, -1)]: "#e07070",
	[axialKey(-2, 1)]: "#6a9fd8",
};

const LABELS: Record<string, string> = {
	[axialKey(0, 2)]: "Hello",
	[axialKey(0, -2)]: "World",
};

export function HexTest() {
	return (
		<HexBoard
			radius={RADIUS}
			tileColors={TILE_COLORS}
			labels={LABELS}
		/>
	);
}
