"use client";

import { CircleSmall, Flag, House, Star } from "lucide-react";
import { HexBoard } from "@/components/hex-board";
import { gameById } from "@/lib/games";
import { GOLF_TILE_COLORS } from "@/lib/golf";
import { axialKey } from "@/lib/hex";

const test = gameById("test");
const RADIUS = test?.boardRadiusMin ?? 4;

const TILE_COLORS: Record<string, string> = {
	[axialKey(2, -1)]: "#e07070",
	[axialKey(-2, 1)]: "#6a9fd8",
	[axialKey(2, -2)]: "#c4b5fd",
	[axialKey(-2, 2)]: GOLF_TILE_COLORS.fairway,
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
	[axialKey(-2, 2)]: {
		icon: CircleSmall,
		color: "#ffffff",
		fill: "#ffffff",
	},
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
