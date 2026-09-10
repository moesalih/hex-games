"use client";

import { Rocket } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { HexBoard } from "@/components/hex-board";
import { gameById } from "@/lib/games";
import { axialKey, hexesInRadius, type Axial } from "@/lib/hex";

const space = gameById("space");
const RADIUS = space?.boardRadiusMin ?? 8;

function randomHex(radius: number): Axial {
	const hexes = hexesInRadius(radius);
	return hexes[Math.floor(Math.random() * hexes.length)]!;
}

export function HexSpace() {
	const [ship, setShip] = useState<Axial | null>(null);

	useEffect(() => {
		setShip(randomHex(RADIUS));
	}, []);

	const icons = useMemo(
		() =>
			ship
				? {
						[axialKey(ship.q, ship.r)]: Rocket,
					}
				: undefined,
		[ship],
	);

	if (!ship || !icons) return null;

	return (
		<HexBoard radius={RADIUS} icons={icons} selectable={false} />
	);
}
