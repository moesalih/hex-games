export type GameDef = {
	id: string;
	title: string;
	path: string;
	q: number;
	r: number;
	boardRadiusMin: number;
	boardRadiusMax: number;
};

/** Main menu hex radius: center + one ring. */
export const MENU_RADIUS = 1;

/** Menu branding on the center tile. Not a game. */
export const MENU_TITLE = {
	q: 0,
	r: 0,
	title: "Hex Games",
} as const;

export const GAMES: GameDef[] = [
	{
		id: "golf",
		title: "Golf",
		path: "/golf",
		q: 0,
		r: 1,
		boardRadiusMin: 8,
		boardRadiusMax: 12,
	},
];

export function gameAt(q: number, r: number): GameDef | undefined {
	return GAMES.find((game) => game.q === q && game.r === r);
}

export function gameById(id: string): GameDef | undefined {
	return GAMES.find((game) => game.id === id);
}
