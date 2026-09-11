"use client";

import { Canvas, useThree } from "@react-three/fiber";
import type { LucideIcon } from "lucide-react";
import {
	createElement,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	type MutableRefObject,
} from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import * as THREE from "three";
import { axialKey, axialToWorld, hexesInRadius, type Axial } from "@/lib/hex";

const BACKGROUND = "#000000";
const TILE = "#111111";
const TILE_HOVER = "#222222";
const TILE_SELECTED = "#333333";
const LABEL = "#eeeeee";
const ICON = "#eeeeee";
const THICKNESS = 0.06;
const TILE_SCALE = 0.96;
/** Corner fillet as a fraction of hex size — enough to soften vertices. */
const TILE_CORNER = 0.25;

/** A Lucide icon, or an icon with stroke and optional fill. */
export type HexTileIcon =
	| LucideIcon
	| {
		icon: LucideIcon;
		color?: string;
		fill?: string;
	};

type HexBoardProps = {
	radius?: number;
	hexSize?: number;
	/** Axial key (`q,r`) → label drawn on the tile. */
	labels?: Record<string, string>;
	/** Axial key (`q,r`) → tile fill color. */
	tileColors?: Record<string, string>;
	/** Axial key (`q,r`) → Lucide icon drawn on the tile. */
	icons?: Record<string, HexTileIcon>;
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
	icons,
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
				background: BACKGROUND,
			}}
			onCreated={({ gl }) => {
				gl.setClearColor(BACKGROUND, 1);
			}}
			onPointerMissed={() => clearSelection.current()}
		>
			<color attach="background" args={[BACKGROUND]} />
			<FrameCamera radius={radius} hexSize={hexSize} />
			<HexGrid
				radius={radius}
				hexSize={hexSize}
				labels={labels}
				tileColors={tileColors}
				icons={icons}
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
			const zoom = 0.96;
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
	icons,
	interactiveKeys,
	selectable,
	onTileClick,
	clearSelection,
}: {
	radius: number;
	hexSize: number;
	labels?: Record<string, string>;
	tileColors?: Record<string, string>;
	icons?: Record<string, HexTileIcon>;
	interactiveKeys?: string[];
	selectable: boolean;
	onTileClick?: (hex: Axial) => void;
	clearSelection: MutableRefObject<() => void>;
}) {
	const hexes = useMemo(() => hexesInRadius(radius), [radius]);
	// Rounded hex in XZ, thickness along Y, vertices along ±X (flat-top)
	// so it tessellates with axialToWorld. TILE_SCALE insets each hex so
	// neighbors leave a grout gap.
	const geometry = useMemo(
		() =>
			roundedHexGeometry(
				hexSize * TILE_SCALE,
				hexSize * TILE_CORNER,
				THICKNESS,
			),
		[hexSize],
	);
	const labelGeometry = useMemo(
		() => new THREE.PlaneGeometry(hexSize * 1.5, hexSize * 1.5),
		[hexSize],
	);
	const [hovered, setHovered] = useState<string | null>(null);
	const [selected, setSelected] = useState<string | null>(null);

	clearSelection.current = () => setSelected(null);

	useEffect(() => {
		return () => {
			geometry.dispose();
			labelGeometry.dispose();
		};
	}, [geometry, labelGeometry]);

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
				const icon = icons?.[key];
				const listed =
					interactiveKeys?.includes(key) ??
					(labels ? Boolean(label) : true);
				const interactive = selectable || Boolean(onTileClick && listed);
				let color =
					tileColors?.[key] ??
					(selectable && selected === key
						? TILE_SELECTED
						: hovered === key
							? TILE_HOVER
							: TILE);
				if (interactive && hovered === key && tileColors?.[key]) {
					color = new THREE.Color(color)
						.lerp(new THREE.Color("#ffffff"), 0.18)
						.getStyle();
				}
				return (
					<HexTile
						key={key}
						q={q}
						r={r}
						hexSize={hexSize}
						geometry={geometry}
						labelGeometry={labelGeometry}
						label={label}
						icon={icon}
						color={color}
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
	label,
	icon,
	color,
	interactive,
	onHover,
	onClick,
}: {
	q: number;
	r: number;
	hexSize: number;
	geometry: THREE.BufferGeometry;
	labelGeometry: THREE.PlaneGeometry;
	label?: string;
	icon?: HexTileIcon;
	color: string;
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
			{label || icon ? (
				<TileOverlay
					label={label}
					icon={icon}
					geometry={labelGeometry}
				/>
			) : null}
		</group>
	);
}

function TileOverlay({
	label,
	icon,
	geometry,
}: {
	label?: string;
	icon?: HexTileIcon;
	geometry: THREE.PlaneGeometry;
}) {
	const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
	const resolved = icon ? resolveTileIcon(icon) : undefined;
	const Icon = resolved?.icon;
	const iconColor = resolved?.color;
	const iconFill = resolved?.fill;

	useEffect(() => {
		let cancelled = false;
		const cached = overlayTextureCache.get(
			overlayCacheKey(label, Icon, iconColor, iconFill),
		);
		if (cached) {
			setTexture(cached);
			return;
		}

		const run = async () => {
			if (document.fonts.status !== "loaded") {
				await document.fonts.ready;
			}
			if (cancelled) return;
			try {
				const next = await getOverlayTexture(
					label,
					Icon,
					iconColor,
					iconFill,
				);
				if (cancelled) return;
				setTexture(next);
			} catch {
				if (!cancelled) setTexture(null);
			}
		};

		void run();

		return () => {
			cancelled = true;
		};
	}, [label, Icon, iconColor, iconFill]);

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

function roundedHexGeometry(
	radius: number,
	cornerRadius: number,
	thickness: number,
) {
	const n = 6;
	const maxCorner = radius * Math.sin(Math.PI / n);
	const r = Math.min(cornerRadius, maxCorner * 0.95);
	// Arc center sits on the vertex ray, inset so the fillet is tangent
	// to both edges (interior half-angle is 60° for a hexagon).
	const centerDist = radius - r / Math.sin(Math.PI / 3);
	const shape = new THREE.Shape();
	for (let i = 0; i < n; i++) {
		const theta = (i * Math.PI * 2) / n;
		shape.absarc(
			Math.cos(theta) * centerDist,
			Math.sin(theta) * centerDist,
			r,
			theta - Math.PI / n,
			theta + Math.PI / n,
			false,
		);
	}
	shape.closePath();

	const geometry = new THREE.ExtrudeGeometry(shape, {
		depth: thickness,
		bevelEnabled: false,
		curveSegments: 6,
		steps: 1,
	});
	geometry.rotateX(-Math.PI / 2);
	geometry.translate(0, -thickness / 2, 0);
	return geometry;
}

function resolveTileIcon(value: HexTileIcon): {
	icon: LucideIcon;
	color: string;
	fill?: string;
} {
	if (typeof value === "object" && value !== null && "icon" in value) {
		return {
			icon: value.icon,
			color: value.color ?? ICON,
			fill: value.fill,
		};
	}
	return { icon: value, color: ICON };
}

const overlayTextureCache = new Map<string, THREE.CanvasTexture>();

function overlayCacheKey(
	label: string | undefined,
	Icon: LucideIcon | undefined,
	iconColor: string | undefined,
	iconFill: string | undefined,
) {
	return `${Icon?.displayName ?? ""}:${iconColor ?? ""}:${iconFill ?? ""}:${label ?? ""}`;
}

async function getOverlayTexture(
	label: string | undefined,
	Icon: LucideIcon | undefined,
	iconColor: string | undefined,
	iconFill: string | undefined,
) {
	const key = overlayCacheKey(label, Icon, iconColor, iconFill);
	const cached = overlayTextureCache.get(key);
	if (cached) return cached;
	const texture = await makeOverlayTexture(label, Icon, iconColor, iconFill);
	overlayTextureCache.set(key, texture);
	return texture;
}

function makeOverlayTexture(
	label: string | undefined,
	Icon: LucideIcon | undefined,
	iconColor: string | undefined,
	iconFill: string | undefined,
): Promise<THREE.CanvasTexture> {
	const size = 512;
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		return Promise.resolve(new THREE.CanvasTexture(canvas));
	}

	const trimmed = label?.trim() ?? "";
	const hasLabel = trimmed.length > 0;
	const hasIcon = Boolean(Icon);

	const paint = async () => {
		ctx.clearRect(0, 0, size, size);
		if (hasIcon && Icon) {
			const svg = lucideSvgMarkup(Icon, iconColor ?? ICON, iconFill);
			if (svg) {
				const img = await loadSvgImage(svg);
				const iconSize = hasLabel ? 240 : 320;
				const iconY = hasLabel
					? size * 0.40 - iconSize / 2
					: size / 2 - iconSize / 2;
				ctx.drawImage(
					img,
					size / 2 - iconSize / 2,
					iconY,
					iconSize,
					iconSize,
				);
			}
		}
		if (hasLabel) {
			const lines = trimmed.split(/\s+/);
			const fontSize = hasIcon ? 64 : lines.length > 1 ? 56 : 80;
			const family =
				getComputedStyle(document.documentElement).fontFamily ||
				"Geist, ui-sans-serif, sans-serif";
			ctx.fillStyle = LABEL;
			ctx.font = `600 ${fontSize}px ${family}`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			const lineHeight = fontSize * 1.15;
			const y = hasIcon ? size * 0.75 : size / 2;
			const startY = y - ((lines.length - 1) * lineHeight) / 2;
			for (let i = 0; i < lines.length; i++) {
				ctx.fillText(lines[i], size / 2, startY + i * lineHeight);
			}
		}
		const texture = new THREE.CanvasTexture(canvas);
		texture.colorSpace = THREE.SRGBColorSpace;
		texture.needsUpdate = true;
		return texture;
	};

	return paint();
}

let iconMount: { el: HTMLDivElement; root: Root } | undefined;

function lucideSvgMarkup(
	Icon: LucideIcon,
	color: string,
	fill?: string,
) {
	if (!iconMount) {
		const el = document.createElement("div");
		el.style.position = "fixed";
		el.style.left = "-9999px";
		el.style.top = "0";
		el.style.width = "0";
		el.style.height = "0";
		el.style.overflow = "hidden";
		el.setAttribute("aria-hidden", "true");
		document.body.appendChild(el);
		iconMount = { el, root: createRoot(el) };
	}
	flushSync(() => {
		iconMount!.root.render(
			createElement(Icon, {
				color,
				size: 24,
				strokeWidth: 2,
				...(fill ? { fill } : {}),
				"aria-hidden": true,
			}),
		);
	});
	const svg = iconMount.el.querySelector("svg");
	if (!svg) return "";
	if (!svg.getAttribute("xmlns")) {
		svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
	}
	return svg.outerHTML;
}

function loadSvgImage(svg: string) {
	return new Promise<HTMLImageElement>((resolve, reject) => {
		const url = URL.createObjectURL(
			new Blob([svg], { type: "image/svg+xml" }),
		);
		const img = new Image();
		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve(img);
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("Failed to load Lucide icon"));
		};
		img.src = url;
	});
}
