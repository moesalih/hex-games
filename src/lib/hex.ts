export type Axial = {
	q: number;
	r: number;
};

type Cube = {
	q: number;
	r: number;
	s: number;
};

export const AXIAL_DIRECTIONS: Axial[] = [
	{ q: 1, r: 0 },
	{ q: 1, r: -1 },
	{ q: 0, r: -1 },
	{ q: -1, r: 0 },
	{ q: -1, r: 1 },
	{ q: 0, r: 1 },
];

export function axialKey(q: number, r: number) {
	return `${q},${r}`;
}

export function axialAdd(a: Axial, b: Axial): Axial {
	return { q: a.q + b.q, r: a.r + b.r };
}

export function axialScale(hex: Axial, k: number): Axial {
	return { q: hex.q * k, r: hex.r * k };
}

export function axialNeighbors(hex: Axial): Axial[] {
	return AXIAL_DIRECTIONS.map((dir) => axialAdd(hex, dir));
}

export function axialDistance(a: Axial, b: Axial): number {
	return (
		(Math.abs(a.q - b.q) +
			Math.abs(a.q + a.r - b.q - b.r) +
			Math.abs(a.r - b.r)) /
		2
	);
}

export function inHexRadius(hex: Axial, radius: number): boolean {
	return axialDistance(hex, { q: 0, r: 0 }) <= radius;
}

function axialToCube(hex: Axial): Cube {
	return { q: hex.q, r: hex.r, s: -hex.q - hex.r };
}

function cubeToAxial(cube: Cube): Axial {
	return { q: cube.q, r: cube.r };
}

function cubeRound(cube: { q: number; r: number; s: number }): Cube {
	let q = Math.round(cube.q);
	let r = Math.round(cube.r);
	let s = Math.round(cube.s);
	const qDiff = Math.abs(q - cube.q);
	const rDiff = Math.abs(r - cube.r);
	const sDiff = Math.abs(s - cube.s);
	if (qDiff > rDiff && qDiff > sDiff) q = -r - s;
	else if (rDiff > sDiff) r = -q - s;
	else s = -q - r;
	return { q, r, s };
}

export function axialRound(hex: { q: number; r: number }): Axial {
	return cubeToAxial(cubeRound(axialToCube(hex)));
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

export function hexesInRange(center: Axial, radius: number): Axial[] {
	return hexesInRadius(radius).map((hex) => axialAdd(center, hex));
}

/** Inclusive hex line from `a` to `b`. */
export function hexLine(a: Axial, b: Axial): Axial[] {
	const n = axialDistance(a, b);
	if (n === 0) return [{ q: a.q, r: a.r }];
	const ac = axialToCube(a);
	const bc = axialToCube(b);
	const out: Axial[] = [];
	for (let i = 0; i <= n; i++) {
		const t = i / n;
		out.push(
			cubeToAxial(
				cubeRound({
					q: ac.q + (bc.q - ac.q) * t + 1e-6,
					r: ac.r + (bc.r - ac.r) * t + 1e-6,
					s: ac.s + (bc.s - ac.s) * t - 2e-6,
				}),
			),
		);
	}
	return out;
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
