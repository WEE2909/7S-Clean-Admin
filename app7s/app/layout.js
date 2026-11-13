import "./globals.css";
import { Noto_Sans_Thai_Looped } from "next/font/google";
import Register from "./register";

const font = Noto_Sans_Thai_Looped({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata = {
  title: "แบบประเมินความสะอาด 7ส.",
  description: "ตรวจ 7ส ประจำวัน ติดตามคะแนนแต่ละพื้นที่",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Clean Check", statusBarStyle: "default" },
  icons: { apple: "/apple-touch-icon.png", icon: "/icon-192.png" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1B6A93",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body className={font.className}>
        <Register />
        {children}
      </body>
    </html>
  );
}
