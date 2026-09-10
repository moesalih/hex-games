"use client";

import { Flag, House, Star } from "lucide-react";
import { HexBoard } from "@/components/hex-board";
import { gameById } from "@/lib/games";
import { axialKey } from "@/lib/hex";

const test = gameById("test");
const RADIUS = test?.boardRadiusMin ?? 4;

const TILE_COLORS: Record<string, string> = {
	[axialKey(2, -1)]: "#e07070",
	[axialKey(-2, 1)]: "#6a9fd8",
	[axialKey(2, -2)]: "#c4b5fd",
};

const LABELS: Record<string, string> = {
	[axialKey(0, 2)]: "Hello",
	[axialKey(0, -2)]: "World",
	[axialKey(2, -2)]: "Home",
};

const ICONS = {
	[axialKey(2, 1)]: Star,
	[axialKey(-2, -1)]: Flag,
	[axialKey(2, -2)]: House,
};

export function HexTest() {
	return (
		<HexBoard
			radius={RADIUS}
			tileColors={TILE_COLORS}
			labels={LABELS}
			icons={ICONS}
		/>
	);
}
