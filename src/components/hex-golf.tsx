"use client";

import { useEffect, useMemo, useState } from "react";
import { HexBoard } from "@/components/hex-board";
import { gameById } from "@/lib/games";
import {
	generateGolfCourse,
	golfTileColors,
	type GolfCourse,
} from "@/lib/golf";
import { axialKey } from "@/lib/hex";

const golf = gameById("golf");
const RADIUS_MIN = golf?.boardRadiusMin ?? 8;
const RADIUS_MAX = golf?.boardRadiusMax ?? 12;

export function HexGolf() {
	const [course, setCourse] = useState<GolfCourse | null>(null);

	useEffect(() => {
		setCourse(
			generateGolfCourse({
				radiusMin: RADIUS_MIN,
				radiusMax: RADIUS_MAX,
			}),
		);
	}, []);

	const tileColors = useMemo(
		() => (course ? golfTileColors(course) : undefined),
		[course],
	);

	if (!course || !tileColors) return null;

	return (
		<HexBoard
			radius={course.radius}
			tileColors={tileColors}
			ballKey={axialKey(course.ball.q, course.ball.r)}
			selectable={false}
		/>
	);
}
