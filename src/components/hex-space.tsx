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
const ASTEROID_COLOR = "#333333";

function randomHex(radius: number): Axial {
	const hexes = hexesInRadius(radius);
	return hexes[Math.floor(Math.random() * hexes.length)]!;
}

function pickAsteroids(moon: Axial): Axial[] {
	const occupied = new Set(
		hexesInRange(moon, MOON_RADIUS).map((hex) => axialKey(hex.q, hex.r)),
	);
	const candidates = hexesInRadius(RADIUS).filter(
		(hex) => !occupied.has(axialKey(hex.q, hex.r)),
	);
	const count = 2 + Math.floor(Math.random() * 2);
	const asteroids: Axial[] = [];
	for (let i = 0; i < count && candidates.length > 0; i++) {
		const index = Math.floor(Math.random() * candidates.length);
		asteroids.push(candidates.splice(index, 1)[0]!);
	}
	return asteroids;
}

export function HexSpace() {
	const [ship, setShip] = useState<Axial | null>(null);
	const [moon, setMoon] = useState<Axial | null>(null);
	const [asteroids, setAsteroids] = useState<Axial[] | null>(null);

	useEffect(() => {
		const nextMoon = randomHex(RADIUS - MOON_RADIUS);
		setShip(randomHex(RADIUS));
		setMoon(nextMoon);
		setAsteroids(pickAsteroids(nextMoon));
	}, []);

	const tileColors = useMemo(() => {
		if (!moon || !asteroids) return undefined;
		const colors: Record<string, string> = {};
		for (const hex of hexesInRange(moon, MOON_RADIUS)) {
			colors[axialKey(hex.q, hex.r)] = MOON_COLOR;
		}
		for (const hex of asteroids) {
			colors[axialKey(hex.q, hex.r)] = ASTEROID_COLOR;
		}
		return colors;
	}, [moon, asteroids]);

	const icons = useMemo(
		() =>
			ship
				? {
					[axialKey(ship.q, ship.r)]: Rocket,
				}
				: undefined,
		[ship],
	);

	if (!ship || !moon || !asteroids || !icons || !tileColors) return null;

	return (
		<HexBoard
			radius={RADIUS}
			icons={icons}
			tileColors={tileColors}
			selectable={false}
		/>
	);
}
