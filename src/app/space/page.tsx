import { HexSpace } from "@/components/hex-space";
import { BackToMenu } from "@/components/scene-hud";

export const metadata = {
	title: "Space",
};

export default function SpacePage() {
	return (
		<>
			<BackToMenu />
			<HexSpace />
		</>
	);
}
