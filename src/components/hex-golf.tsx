"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { HexBoard } from "@/components/hex-board";
import { gameById } from "@/lib/games";
import {
	applyHighlights,
	ballInHole,
	clampPowerRange,
	generateGolfCourse,
	golfTileColors,
	liePower,
	lightenHex,
	nextPower,
	onBoardNeighbors,
	shotDirection,
	shotPath,
	tileAt,
	type GolfCourse,
} from "@/lib/golf";
import { axialKey, type Axial } from "@/lib/hex";

const golf = gameById("golf");
const RADIUS_MIN = golf?.boardRadiusMin ?? 8;
const RADIUS_MAX = golf?.boardRadiusMax ?? 12;
const POWER_TICK_MS = 120;
const GREEN_POWER_TICK_MS = 240;
const ROLL_TICK_MS = 90;
const NEXT_HOLE_MS = 700;
const WATER_REVERT_MS = 450;
const AIM_HIGHLIGHT = 0.42;
const PATH_PREVIEW = 0.2;
const PATH_FILL = 0.55;

type Phase = "aim" | "power" | "rolling" | "wet" | "holed";

function dealCourse() {
	return generateGolfCourse({
		radiusMin: RADIUS_MIN,
		radiusMax: RADIUS_MAX,
	});
}

export function HexGolf() {
	const [course, setCourse] = useState<GolfCourse | null>(null);
	const [holeNumber, setHoleNumber] = useState(1);
	const [phase, setPhase] = useState<Phase>("aim");
	const [path, setPath] = useState<Axial[]>([]);
	const [power, setPower] = useState(1);
	const [powerMin, setPowerMin] = useState(1);
	const [rollSteps, setRollSteps] = useState<Axial[] | null>(null);
	const [rollFrom, setRollFrom] = useState<Axial | null>(null);

	const phaseRef = useRef(phase);
	const pathRef = useRef(path);
	const powerRef = useRef(power);
	const courseRef = useRef(course);

	phaseRef.current = phase;
	pathRef.current = path;
	powerRef.current = power;
	courseRef.current = course;

	useEffect(() => {
		setCourse(dealCourse());
	}, []);

	useEffect(() => {
		if (phase !== "power" || path.length === 0) return;
		const min = powerMin;
		let powerValue = min;
		let dir: 1 | -1 = 1;
		let hold = 1;
		setPower(min);
		const latest = courseRef.current;
		const onGreen = latest ? tileAt(latest, latest.ball) === "green" : false;
		const tickMs = onGreen ? GREEN_POWER_TICK_MS : POWER_TICK_MS;
		const id = window.setInterval(() => {
			const max = pathRef.current.length;
			if (max <= min) {
				powerValue = max;
				setPower(max);
				return;
			}
			if (hold > 0) {
				hold -= 1;
				return;
			}
			const stepped = nextPower(powerValue, dir, min, max);
			powerValue = stepped.power;
			dir = stepped.dir;
			if (powerValue === min || powerValue === max) hold = 1;
			setPower(powerValue);
		}, tickMs);
		return () => window.clearInterval(id);
	}, [phase, path, powerMin]);

	useEffect(() => {
		if (
			phase === "rolling" &&
			Array.isArray(rollSteps) &&
			rollSteps.length === 0
		) {
			const latest = courseRef.current;
			setPath([]);
			setRollSteps(null);
			if (latest && ballInHole(latest)) setPhase("holed");
			else if (latest && tileAt(latest, latest.ball) === "water") {
				setPhase("wet");
			} else setPhase("aim");
			return;
		}

		if (phase !== "rolling" || !rollSteps || rollSteps.length === 0) {
			return;
		}

		const id = window.setTimeout(() => {
			const [next, ...rest] = rollSteps;
			if (!next) return;
			setCourse((current) =>
				current ? { ...current, ball: next } : current,
			);
			if (rest.length === 0) {
				const latest = courseRef.current;
				const hole = latest?.hole;
				const holed = Boolean(
					hole && hole.q === next.q && hole.r === next.r,
				);
				setPath([]);
				setRollSteps(null);
				if (holed) {
					setPhase("holed");
				} else if (latest && tileAt(latest, next) === "water") {
					setPhase("wet");
				} else {
					setPhase("aim");
				}
			} else {
				setRollSteps(rest);
			}
		}, ROLL_TICK_MS);
		return () => window.clearTimeout(id);
	}, [phase, rollSteps]);

	useEffect(() => {
		if (phase !== "wet" || !rollFrom) return;
		const from = rollFrom;
		const id = window.setTimeout(() => {
			setCourse((current) =>
				current ? { ...current, ball: from } : current,
			);
			setPath([]);
			setRollSteps(null);
			setRollFrom(null);
			setPhase("aim");
		}, WATER_REVERT_MS);
		return () => window.clearTimeout(id);
	}, [phase, rollFrom]);

	useEffect(() => {
		if (phase !== "holed") return;
		const id = window.setTimeout(() => {
			setCourse(dealCourse());
			setHoleNumber((n) => n + 1);
			setPhase("aim");
			setPower(1);
			setPowerMin(1);
			setPath([]);
			setRollSteps(null);
			setRollFrom(null);
		}, NEXT_HOLE_MS);
		return () => window.clearTimeout(id);
	}, [phase]);

	const neighbors = useMemo(
		() => (course ? onBoardNeighbors(course.ball, course.radius) : []),
		[course],
	);

	const tileColors = useMemo(() => {
		if (!course) return undefined;
		const base = golfTileColors(course);
		if (phase === "aim") {
			return applyHighlights(
				base,
				neighbors.map((hex) => axialKey(hex.q, hex.r)),
				AIM_HIGHLIGHT,
			);
		}
		if (path.length === 0) return base;
		const next = { ...base };
		for (const hex of path) {
			const key = axialKey(hex.q, hex.r);
			const color = base[key];
			if (color) next[key] = lightenHex(color, PATH_PREVIEW);
		}
		const filled = Math.max(1, Math.min(power, path.length));
		for (const hex of path.slice(0, filled)) {
			const key = axialKey(hex.q, hex.r);
			const color = base[key];
			if (color) next[key] = lightenHex(color, PATH_FILL);
		}
		return next;
	}, [course, neighbors, path, phase, power]);

	const interactiveKeys = useMemo(() => {
		if (phase === "aim") {
			return neighbors.map((hex) => axialKey(hex.q, hex.r));
		}
		if (phase === "power") return undefined;
		return [];
	}, [neighbors, phase]);

	function handleTileClick(hex: Axial) {
		const current = courseRef.current;
		if (!current) return;
		if (phaseRef.current === "aim") {
			const dir = shotDirection(current.ball, hex);
			if (!dir) return;
			const lie = liePower(current);
			const nextPath = shotPath(
				current.ball,
				dir,
				current.radius,
				lie.max,
			);
			if (nextPath.length === 0) return;
			const range = clampPowerRange(lie, nextPath.length);
			setPath(nextPath);
			setPowerMin(range.min);
			setPower(range.min);
			setPhase("power");
			return;
		}
		if (phaseRef.current === "power") {
			const steps = pathRef.current.slice(0, powerRef.current);
			if (steps.length === 0) return;
			setRollFrom(current.ball);
			setPhase("rolling");
			setRollSteps(steps);
		}
	}

	if (!course || !tileColors) return null;

	return (
		<>
			<div className="pointer-events-none fixed inset-x-0 top-0 z-10 flex justify-end p-4">
				<span className="text-sm text-neutral-400">Hole {holeNumber}</span>
			</div>
			<HexBoard
				radius={course.radius}
				tileColors={tileColors}
				ballKey={axialKey(course.ball.q, course.ball.r)}
				interactiveKeys={interactiveKeys}
				selectable={false}
				onTileClick={handleTileClick}
			/>
		</>
	);
}
