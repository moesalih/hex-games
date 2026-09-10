import { HexTest } from "@/components/hex-test";
import { BackToMenu } from "@/components/scene-hud";

export const metadata = {
	title: "Test",
};

export default function TestPage() {
	return (
		<>
			<BackToMenu />
			<HexTest />
		</>
	);
}
