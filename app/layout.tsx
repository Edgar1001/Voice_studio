import "./globals.css";
import { Rubik_Spray_Paint } from "next/font/google";

export const spray = Rubik_Spray_Paint({
  subsets: ["latin"],
  weight: "400",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
