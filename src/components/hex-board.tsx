"use client";

import { Canvas, useThree } from "@react-three/fiber";
import {
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	type MutableRefObject,
} from "react";
import * as THREE from "three";
import { axialKey, axialToWorld, hexesInRadius } from "@/lib/hex";

const TILE = "#e8e8e8";
const TILE_HOVER = "#cfcfcf";
const TILE_SELECTED = "#a8a8a8";
const THICKNESS = 0.06;
const TILE_SCALE = 0.96;

type HexBoardProps = {
	radius?: number;
	hexSize?: number;
};

export function HexBoard({ radius = 5, hexSize = 1 }: HexBoardProps) {
	const clearSelection = useRef<() => void>(() => { });

	return (
		<Canvas
			orthographic
			camera={{
				position: [0, 50, 0],
				up: [0, 0, 1],
				near: 0.1,
				far: 200,
			}}
			gl={{ antialias: true, alpha: false }}
			style={{
				position: "fixed",
				inset: 0,
				width: "100%",
				height: "100%",
				background: "#ffffff",
			}}
			onCreated={({ gl }) => {
				gl.setClearColor("#ffffff", 1);
			}}
			onPointerMissed={() => clearSelection.current()}
		>
			<color attach="background" args={["#ffffff"]} />
			<FrameCamera radius={radius} hexSize={hexSize} />
			<HexGrid
				radius={radius}
				hexSize={hexSize}
				clearSelection={clearSelection}
			/>
		</Canvas>
	);
}

function FrameCamera({
	radius,
	hexSize,
}: {
	radius: number;
	hexSize: number;
}) {
	const { camera, size } = useThree();

	useLayoutEffect(() => {
		camera.position.set(0, 50, 0);
		camera.up.set(0, 0, 1);
		camera.lookAt(0, 0, 0);

		if (camera instanceof THREE.OrthographicCamera) {
			camera.manual = true;
			const worldW = hexSize * (3 * radius + 2);
			const worldH = hexSize * Math.sqrt(3) * (2 * radius + 1);
			const zoom = 1.0;
			const halfW = worldW / 2 / zoom;
			const halfH = worldH / 2 / zoom;
			const aspect = size.width / size.height;
			const viewAspect = halfW / halfH;
			if (aspect > viewAspect) {
				camera.left = -halfH * aspect;
				camera.right = halfH * aspect;
				camera.top = halfH;
				camera.bottom = -halfH;
			} else {
				camera.left = -halfW;
				camera.right = halfW;
				camera.top = halfW / aspect;
				camera.bottom = -halfW / aspect;
			}
			camera.near = 0.1;
			camera.far = 200;
			camera.updateProjectionMatrix();
		}
	}, [camera, size, radius, hexSize]);

	return null;
}

function HexGrid({
	radius,
	hexSize,
	clearSelection,
}: {
	radius: number;
	hexSize: number;
	clearSelection: MutableRefObject<() => void>;
}) {
	const hexes = useMemo(() => hexesInRadius(radius), [radius]);
	// Radius is center-to-vertex. Default 6-sided cylinder is pointy along
	// ±Z; rotate 30° so vertices point along ±X (flat-top), matching
	// axialToWorld. TILE_SCALE insets each hex so neighbors leave a grout gap.
	const geometry = useMemo(
		() =>
			new THREE.CylinderGeometry(
				hexSize * TILE_SCALE,
				hexSize * TILE_SCALE,
				THICKNESS,
				6,
			),
		[hexSize],
	);
	const [hovered, setHovered] = useState<string | null>(null);
	const [selected, setSelected] = useState<string | null>(null);

	clearSelection.current = () => setSelected(null);

	useEffect(() => {
		return () => {
			geometry.dispose();
		};
	}, [geometry]);

	useEffect(() => {
		document.body.style.cursor = hovered ? "pointer" : "auto";
		return () => {
			document.body.style.cursor = "auto";
		};
	}, [hovered]);

	return (
		<group>
			{hexes.map(({ q, r }) => {
				const key = axialKey(q, r);
				return (
					<HexTile
						key={key}
						q={q}
						r={r}
						hexSize={hexSize}
						geometry={geometry}
						hovered={hovered === key}
						selected={selected === key}
						onHover={setHovered}
						onSelect={(next) =>
							setSelected((prev) => (prev === next ? null : next))
						}
					/>
				);
			})}
		</group>
	);
}

function HexTile({
	q,
	r,
	hexSize,
	geometry,
	hovered,
	selected,
	onHover,
	onSelect,
}: {
	q: number;
	r: number;
	hexSize: number;
	geometry: THREE.CylinderGeometry;
	hovered: boolean;
	selected: boolean;
	onHover: (key: string | null) => void;
	onSelect: (key: string) => void;
}) {
	const [x, z] = axialToWorld(q, r, hexSize);
	const key = axialKey(q, r);
	const color = selected ? TILE_SELECTED : hovered ? TILE_HOVER : TILE;

	return (
		<mesh
			position={[x, THICKNESS / 2, z]}
			rotation={[0, Math.PI / 6, 0]}
			geometry={geometry}
			onPointerOver={(event) => {
				event.stopPropagation();
				onHover(key);
			}}
			onPointerOut={(event) => {
				event.stopPropagation();
				onHover(null);
			}}
			onClick={(event) => {
				event.stopPropagation();
				onSelect(key);
			}}
		>
			<meshBasicMaterial color={color} />
		</mesh>
	);
}
