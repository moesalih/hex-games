import {
	AXIAL_DIRECTIONS,
	axialAdd,
	axialDistance,
	axialEqual,
	axialKey,
	axialNeighbors,
	axialRound,
	axialScale,
	axialSubtract,
	hexesInRadius,
	hexesInRange,
	hexLine,
	inHexRadius,
	type Axial,
} from "@/lib/hex";

export type GolfTileType =
	| "rough"
	| "fairway"
	| "sand"
	| "water"
	| "green"
	| "hole";

export const GOLF_TILE_COLORS: Record<GolfTileType, string> = {
	rough: "#4e7a32",
	fairway: "#7dae3e",
	green: "#9ccc55",
	sand: "#e8d39a",
	water: "#3aa0c8",
	hole: "#1c1c1c",
};

export type GolfCourse = {
	radius: number;
	seed: number;
	tiles: Record<string, GolfTileType>;
	ball: Axial;
	tee: Axial;
	hole: Axial;
};

export const GOLF_MAX_POWER = 8;

export type PowerRange = {
	min: number;
	max: number;
};

/** Power meter range from the tile the ball is on. */
export const GOLF_LIE_POWER: Record<GolfTileType, PowerRange> = {
	fairway: { min: 1, max: 8 },
	rough: { min: 1, max: 2 },
	sand: { min: 2, max: 3 },
	green: { min: 1, max: 5 },
	hole: { min: 1, max: 5 },
	water: { min: 1, max: 2 },
};

export function tileAt(course: GolfCourse, hex: Axial): GolfTileType {
	return course.tiles[axialKey(hex.q, hex.r)] ?? "rough";
}

export function liePower(
	course: GolfCourse,
	ball: Axial = course.ball,
): PowerRange {
	return GOLF_LIE_POWER[tileAt(course, ball)];
}

export function clampPowerRange(
	range: PowerRange,
	pathLength: number,
): PowerRange {
	if (pathLength <= 0) return { min: 1, max: 1 };
	const max = Math.min(range.max, pathLength);
	const min = Math.min(range.min, max);
	return { min, max };
}

export function golfTileColors(course: GolfCourse): Record<string, string> {
	const colors: Record<string, string> = {};
	for (const [key, type] of Object.entries(course.tiles)) {
		colors[key] = GOLF_TILE_COLORS[type];
	}
	return colors;
}

export function lightenHex(hex: string, t: number): string {
	const raw = hex.replace("#", "");
	const full =
		raw.length === 3
			? raw
					.split("")
					.map((c) => c + c)
					.join("")
			: raw;
	const n = Number.parseInt(full, 16);
	const mix = (c: number) => Math.round(c + (255 - c) * t);
	const r = mix((n >> 16) & 255);
	const g = mix((n >> 8) & 255);
	const b = mix(n & 255);
	return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function applyHighlights(
	colors: Record<string, string>,
	keys: Iterable<string>,
	amount: number,
): Record<string, string> {
	const next = { ...colors };
	for (const key of keys) {
		const base = next[key];
		if (base) next[key] = lightenHex(base, amount);
	}
	return next;
}

export function onBoardNeighbors(ball: Axial, radius: number): Axial[] {
	return axialNeighbors(ball).filter((hex) => inHexRadius(hex, radius));
}

export function shotPath(
	ball: Axial,
	dir: Axial,
	radius: number,
	max = GOLF_MAX_POWER,
): Axial[] {
	const path: Axial[] = [];
	let current = ball;
	for (let i = 0; i < max; i++) {
		current = axialAdd(current, dir);
		if (!inHexRadius(current, radius)) break;
		path.push(current);
	}
	return path;
}

export function shotDirection(ball: Axial, neighbor: Axial): Axial | null {
	if (axialDistance(ball, neighbor) !== 1) return null;
	return axialSubtract(neighbor, ball);
}

/** One step of the min..max power meter. Pure so the swing includes both ends. */
export function nextPower(
	power: number,
	dir: 1 | -1,
	min: number,
	max: number,
): { power: number; dir: 1 | -1 } {
	if (max <= min) return { power: min, dir: 1 };
	const next = power + dir;
	if (next >= max) return { power: max, dir: -1 };
	if (next <= min) return { power: min, dir: 1 };
	return { power: next, dir };
}

export function ballInHole(course: GolfCourse) {
	return axialEqual(course.ball, course.hole);
}

export function generateGolfCourse({
	radiusMin,
	radiusMax,
	seed = Math.floor(Math.random() * 2 ** 31),
}: {
	radiusMin: number;
	radiusMax: number;
	seed?: number;
}): GolfCourse {
	const rng = mulberry32(seed);
	const min = Math.min(radiusMin, radiusMax);
	const max = Math.max(radiusMin, radiusMax);
	const radius = randInt(rng, min, max);
	const tiles: Record<string, GolfTileType> = {};
	const hexes = hexesInRadius(radius);
	const inBoard = (hex: Axial) => inHexRadius(hex, radius);

	for (const hex of hexes) {
		tiles[axialKey(hex.q, hex.r)] = "rough";
	}

	const greenRadius = randInt(rng, 2, 4);
	const dir = randInt(rng, 0, 5);
	const opposite = (dir + 3) % 6;
	const teeDist = Math.max(2, radius - 1);
	const holeDist = Math.max(2, radius - greenRadius);

	let tee = offsetAlongEdge(dir, teeDist, rng);
	let hole = offsetAlongEdge(opposite, holeDist, rng);
	tee = clampToBoard(tee, radius);
	hole = clampToBoard(hole, radius);

	if (axialDistance(tee, hole) < Math.max(4, radius)) {
		tee = clampToBoard(axialScale(AXIAL_DIRECTIONS[dir], teeDist), radius);
		hole = clampToBoard(
			axialScale(AXIAL_DIRECTIONS[opposite], holeDist),
			radius,
		);
	}

	const pathHexes: Axial[] = [];
	const useDogleg = radius >= 4 && rng() < 0.8;
	if (useDogleg) {
		const side = rng() < 0.5 ? 1 : 5;
		const offset = randInt(
			rng,
			Math.max(2, Math.floor(radius * 0.35)),
			Math.max(2, Math.floor(radius * 0.7)),
		);
		const mid = axialRound({
			q: (tee.q + hole.q) / 2,
			r: (tee.r + hole.r) / 2,
		});
		const waypoint = clampToBoard(
			axialAdd(mid, axialScale(AXIAL_DIRECTIONS[(dir + side) % 6], offset)),
			Math.max(1, radius - 1),
		);
		pathHexes.push(...hexLine(tee, waypoint), ...hexLine(waypoint, hole));
	} else {
		pathHexes.push(...hexLine(tee, hole));
	}

	const fairwayWidth = 2;
	for (const hex of pathHexes) {
		for (const neighbor of hexesInRange(hex, fairwayWidth)) {
			if (inBoard(neighbor)) {
				tiles[axialKey(neighbor.q, neighbor.r)] = "fairway";
			}
		}
	}

	for (const hex of hexesInRange(hole, greenRadius)) {
		if (inBoard(hex)) tiles[axialKey(hex.q, hex.r)] = "green";
	}
	tiles[axialKey(hole.q, hole.r)] = "hole";
	tiles[axialKey(tee.q, tee.r)] = "fairway";

	const protectedKeys = new Set([
		axialKey(hole.q, hole.r),
		axialKey(tee.q, tee.r),
	]);

	const greenRing = hexesInRange(hole, greenRadius + 1).filter(
		(hex) =>
			inBoard(hex) &&
			axialDistance(hex, hole) === greenRadius + 1 &&
			!protectedKeys.has(axialKey(hex.q, hex.r)),
	);
	const bunkerCount = randInt(rng, 2, 3);
	for (let i = 0; i < bunkerCount && greenRing.length > 0; i++) {
		const start = pick(rng, greenRing);
		for (const hex of growBlob(start, randInt(rng, 2, 5), rng, inBoard)) {
			const key = axialKey(hex.q, hex.r);
			if (protectedKeys.has(key)) continue;
			if (tiles[key] === "green" || tiles[key] === "hole") continue;
			tiles[key] = "sand";
		}
	}

	const fairwayHexes = hexes.filter((hex) => {
		const key = axialKey(hex.q, hex.r);
		return (
			tiles[key] === "fairway" &&
			axialDistance(hex, tee) > 2 &&
			axialDistance(hex, hole) > greenRadius + 1
		);
	});
	if (fairwayHexes.length > 0) {
		const along = pick(rng, fairwayHexes);
		const sideStarts = axialNeighbors(along).filter(inBoard);
		const start = sideStarts.length > 0 ? pick(rng, sideStarts) : along;
		for (const hex of growBlob(start, randInt(rng, 2, 4), rng, inBoard)) {
			const key = axialKey(hex.q, hex.r);
			if (protectedKeys.has(key)) continue;
			if (tiles[key] === "green" || tiles[key] === "hole") continue;
			tiles[key] = "sand";
		}
	}

	const waterSize = randInt(
		rng,
		Math.max(5, radius),
		Math.max(8, radius * 2),
	);
	const waterCandidates = hexes.filter((hex) => {
		const type = tiles[axialKey(hex.q, hex.r)];
		return (
			type === "rough" &&
			axialDistance(hex, hole) > greenRadius + 2 &&
			axialDistance(hex, tee) > 3
		);
	});
	if (waterCandidates.length > 0) {
		const start = pick(rng, waterCandidates);
		for (const hex of growBlob(start, waterSize, rng, inBoard)) {
			const key = axialKey(hex.q, hex.r);
			if (protectedKeys.has(key)) continue;
			if (tiles[key] === "green" || tiles[key] === "hole") continue;
			tiles[key] = "water";
		}
	}

	return { radius, seed, tiles, ball: tee, tee, hole };
}

function mulberry32(seed: number) {
	let a = seed >>> 0;
	return () => {
		a += 0x6d2b79f5;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function randInt(rng: () => number, min: number, max: number) {
	return min + Math.floor(rng() * (max - min + 1));
}

function pick<T>(rng: () => number, items: T[]): T {
	return items[Math.floor(rng() * items.length)]!;
}

function offsetAlongEdge(
	dir: number,
	distance: number,
	rng: () => number,
): Axial {
	const lateral = AXIAL_DIRECTIONS[(dir + 2) % 6];
	return axialAdd(
		axialScale(AXIAL_DIRECTIONS[dir], distance),
		axialScale(lateral, randInt(rng, -1, 1)),
	);
}

function clampToBoard(hex: Axial, radius: number): Axial {
	const distance = axialDistance(hex, { q: 0, r: 0 });
	if (distance <= radius) return hex;
	if (distance === 0) return { q: 0, r: 0 };
	const scale = radius / distance;
	return axialRound({ q: hex.q * scale, r: hex.r * scale });
}

function growBlob(
	start: Axial,
	size: number,
	rng: () => number,
	inBoard: (hex: Axial) => boolean,
): Axial[] {
	const result: Axial[] = [];
	const seen = new Set<string>();
	const frontier: Axial[] = [start];
	while (result.length < size && frontier.length > 0) {
		const index = Math.floor(rng() * frontier.length);
		const hex = frontier.splice(index, 1)[0];
		if (!hex || !inBoard(hex)) continue;
		const key = axialKey(hex.q, hex.r);
		if (seen.has(key)) continue;
		seen.add(key);
		result.push(hex);
		for (const neighbor of axialNeighbors(hex)) {
			if (!seen.has(axialKey(neighbor.q, neighbor.r))) {
				frontier.push(neighbor);
			}
		}
	}
	return result;
}
