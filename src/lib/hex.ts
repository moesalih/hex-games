export type Axial = {
	q: number;
	r: number;
};

export function axialKey(q: number, r: number) {
	return `${q},${r}`;
}

/** All axial hexes in a hexagon of the given radius (0 = single tile). */
export function hexesInRadius(radius: number): Axial[] {
	const hexes: Axial[] = [];
	for (let q = -radius; q <= radius; q++) {
		const rMin = Math.max(-radius, -q - radius);
		const rMax = Math.min(radius, -q + radius);
		for (let r = rMin; r <= rMax; r++) {
			hexes.push({ q, r });
		}
	}
	return hexes;
}

/** Flat-top axial → world XZ. `size` is center-to-vertex. */
export function axialToWorld(
	q: number,
	r: number,
	size: number,
): [number, number] {
	const x = size * (3 / 2) * q;
	const z = size * Math.sqrt(3) * (r + q / 2);
	return [x, z];
}
