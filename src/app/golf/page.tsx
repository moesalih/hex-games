import { HexGolf } from "@/components/hex-golf";
import { BackToMenu } from "@/components/scene-hud";

export const metadata = {
	title: "Hex Golf",
};

export default function GolfPage() {
	return (
		<>
			<BackToMenu title="Hex Golf" />
			<HexGolf />
		</>
	);
}
