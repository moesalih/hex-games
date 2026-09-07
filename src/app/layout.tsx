import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: {
		default: "Hex Games",
		template: "%s · Hex Games",
	},
	description: "Games on a hex grid",
	icons: {
		icon: "/hexagon-icon.png",
		apple: "/hexagon-icon.png",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			className={`${geistSans.variable} ${geistMono.variable} ${geistSans.className}`}
		>
			<body className="antialiased">{children}</body>
		</html>
	);
}
