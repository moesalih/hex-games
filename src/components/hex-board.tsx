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
import { axialKey, axialToWorld, hexesInRadius, type Axial } from "@/lib/hex";

const TILE = "#eeeeee";
const TILE_HOVER = "#dddddd";
const TILE_SELECTED = "#cccccc";
const LABEL = "#333333";
const THICKNESS = 0.06;
const TILE_SCALE = 0.96;

type HexBoardProps = {
	radius?: number;
	hexSize?: number;
	/** Axial key (`q,r`) → label drawn on the tile. */
	labels?: Record<string, string>;
	/** Axial key (`q,r`) → tile fill color. */
	tileColors?: Record<string, string>;
	/** Axial key of the tile that shows a ball. */
	ballKey?: string;
	/** Axial keys that hover/click. Defaults to labeled tiles, or all if unlabeled. */
	interactiveKeys?: string[];
	/** When false, tiles don't toggle a selected state. Default true. */
	selectable?: boolean;
	onTileClick?: (hex: Axial) => void;
};

export function HexBoard({
	radius = 5,
	hexSize = 1,
	labels,
	tileColors,
	ballKey,
	interactiveKeys,
	selectable = true,
	onTileClick,
}: HexBoardProps) {
	const clearSelection = useRef<() => void>(() => { });

	return (
		<Canvas
			orthographic
			flat
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
				labels={labels}
				tileColors={tileColors}
				ballKey={ballKey}
				interactiveKeys={interactiveKeys}
				selectable={selectable}
				onTileClick={onTileClick}
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
	labels,
	tileColors,
	ballKey,
	interactiveKeys,
	selectable,
	onTileClick,
	clearSelection,
}: {
	radius: number;
	hexSize: number;
	labels?: Record<string, string>;
	tileColors?: Record<string, string>;
	ballKey?: string;
	interactiveKeys?: string[];
	selectable: boolean;
	onTileClick?: (hex: Axial) => void;
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
	const labelGeometry = useMemo(
		() => new THREE.PlaneGeometry(hexSize * 1.5, hexSize * 1.5),
		[hexSize],
	);
	const ballGeometry = useMemo(
		() => new THREE.CircleGeometry(hexSize * 0.2, 24),
		[hexSize],
	);
	const ballOutlineGeometry = useMemo(
		() => new THREE.CircleGeometry(hexSize * 0.26, 24),
		[hexSize],
	);
	const [hovered, setHovered] = useState<string | null>(null);
	const [selected, setSelected] = useState<string | null>(null);

	clearSelection.current = () => setSelected(null);

	useEffect(() => {
		return () => {
			geometry.dispose();
			labelGeometry.dispose();
			ballGeometry.dispose();
			ballOutlineGeometry.dispose();
		};
	}, [geometry, labelGeometry, ballGeometry, ballOutlineGeometry]);

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
				const label = labels?.[key];
				const listed =
					interactiveKeys?.includes(key) ??
					(labels ? Boolean(label) : true);
				const interactive = selectable || Boolean(onTileClick && listed);
				const color =
					tileColors?.[key] ??
					(selectable && selected === key
						? TILE_SELECTED
						: hovered === key
							? TILE_HOVER
							: TILE);
				return (
					<HexTile
						key={key}
						q={q}
						r={r}
						hexSize={hexSize}
						geometry={geometry}
						labelGeometry={labelGeometry}
						ballGeometry={ballGeometry}
						ballOutlineGeometry={ballOutlineGeometry}
						label={label}
						color={color}
						hasBall={ballKey === key}
						interactive={interactive}
						onHover={setHovered}
						onClick={() => {
							if (selectable) {
								setSelected((prev) => (prev === key ? null : key));
							}
							if (interactive) onTileClick?.({ q, r });
						}}
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
	labelGeometry,
	ballGeometry,
	ballOutlineGeometry,
	label,
	color,
	hasBall,
	interactive,
	onHover,
	onClick,
}: {
	q: number;
	r: number;
	hexSize: number;
	geometry: THREE.CylinderGeometry;
	labelGeometry: THREE.PlaneGeometry;
	ballGeometry: THREE.CircleGeometry;
	ballOutlineGeometry: THREE.CircleGeometry;
	label?: string;
	color: string;
	hasBall: boolean;
	interactive: boolean;
	onHover: (key: string | null) => void;
	onClick: () => void;
}) {
	const [x, z] = axialToWorld(q, r, hexSize);
	const key = axialKey(q, r);

	return (
		<group position={[x, 0, z]}>
			<mesh
				position={[0, THICKNESS / 2, 0]}
				rotation={[0, Math.PI / 6, 0]}
				geometry={geometry}
				onPointerOver={(event) => {
					event.stopPropagation();
					if (interactive) onHover(key);
				}}
				onPointerOut={(event) => {
					event.stopPropagation();
					onHover(null);
				}}
				onClick={(event) => {
					event.stopPropagation();
					if (interactive) onClick();
				}}
			>
				<meshBasicMaterial color={color} />
			</mesh>
			{hasBall ? (
				<BallMarker
					geometry={ballGeometry}
					outlineGeometry={ballOutlineGeometry}
				/>
			) : null}
			{label ? (
				<TileLabel label={label} geometry={labelGeometry} />
			) : null}
		</group>
	);
}

function BallMarker({
	geometry,
	outlineGeometry,
}: {
	geometry: THREE.CircleGeometry;
	outlineGeometry: THREE.CircleGeometry;
}) {
	return (
		<group
			position={[0, THICKNESS + 0.02, 0]}
			rotation={[-Math.PI / 2, 0, 0]}
		>
			<mesh geometry={outlineGeometry} raycast={() => { }}>
				<meshBasicMaterial color="#333333" />
			</mesh>
			<mesh
				position={[0, 0, 0.002]}
				geometry={geometry}
				raycast={() => { }}
			>
				<meshBasicMaterial color="#f4f4f4" />
			</mesh>
		</group>
	);
}

function TileLabel({
	label,
	geometry,
}: {
	label: string;
	geometry: THREE.PlaneGeometry;
}) {
	const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);

	useEffect(() => {
		let cancelled = false;
		let tex: THREE.CanvasTexture | undefined;

		const draw = () => {
			if (cancelled) return;
			tex?.dispose();
			tex = makeLabelTexture(label);
			setTexture(tex);
		};

		if (document.fonts.status === "loaded") {
			draw();
		} else {
			void document.fonts.ready.then(draw);
		}

		return () => {
			cancelled = true;
			tex?.dispose();
		};
	}, [label]);

	if (!texture) return null;

	return (
		<mesh
			position={[0, THICKNESS + 0.01, 0]}
			rotation={[-Math.PI / 2, 0, Math.PI]}
			geometry={geometry}
			raycast={() => { }}
		>
			<meshBasicMaterial map={texture} transparent depthWrite={false} />
		</mesh>
	);
}

function makeLabelTexture(label: string) {
	const size = 512;
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		return new THREE.CanvasTexture(canvas);
	}
	ctx.clearRect(0, 0, size, size);
	ctx.fillStyle = LABEL;
	const family =
		getComputedStyle(document.documentElement).fontFamily ||
		"Geist, ui-sans-serif, sans-serif";
	const lines = label.trim().split(/\s+/);
	const fontSize = lines.length > 1 ? 56 : 64;
	ctx.font = `600 ${fontSize}px ${family}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	const lineHeight = fontSize * 1.15;
	const startY = size / 2 - ((lines.length - 1) * lineHeight) / 2;
	for (let i = 0; i < lines.length; i++) {
		ctx.fillText(lines[i], size / 2, startY + i * lineHeight);
	}
	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.needsUpdate = true;
	return texture;
}
