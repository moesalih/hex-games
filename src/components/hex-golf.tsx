"use client";

import { HexBoard } from "@/components/hex-board";
import { gameById } from "@/lib/games";

const GOLF_RADIUS = gameById("golf")?.boardRadius ?? 8;

export function HexGolf() {
	return <HexBoard radius={GOLF_RADIUS} />;
}
