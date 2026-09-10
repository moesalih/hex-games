"use client";

import { Rocket } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { HexBoard } from "@/components/hex-board";
import { gameById } from "@/lib/games";
import { axialKey, hexesInRadius, hexesInRange, type Axial } from "@/lib/hex";

const space = gameById("space");
const RADIUS = space?.boardRadiusMin ?? 8;
const MOON_RADIUS = 1;
const MOON_COLOR = "#555555";

function randomHex(radius: number): Axial {
	const hexes = hexesInRadius(radius);
	return hexes[Math.floor(Math.random() * hexes.length)]!;
}

export function HexSpace() {
	const [ship, setShip] = useState<Axial | null>(null);
	const [moon, setMoon] = useState<Axial | null>(null);

	useEffect(() => {
		setShip(randomHex(RADIUS));
		setMoon(randomHex(RADIUS - MOON_RADIUS));
	}, []);

	const tileColors = useMemo(() => {
		if (!moon) return undefined;
		const colors: Record<string, string> = {};
		for (const hex of hexesInRange(moon, MOON_RADIUS)) {
			colors[axialKey(hex.q, hex.r)] = MOON_COLOR;
		}
		return colors;
	}, [moon]);

	const icons = useMemo(
		() =>
			ship
				? {
					[axialKey(ship.q, ship.r)]: Rocket,
				}
				: undefined,
		[ship],
	);

	if (!ship || !moon || !icons || !tileColors) return null;

	return (
		<HexBoard
			radius={RADIUS}
			icons={icons}
			tileColors={tileColors}
			selectable={false}
		/>
	);
}
