import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import ReactQueryProvider from "@/components/providers/ReactQueryProvider";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { ToastProvider } from "@/components/ui/Toast";
const playfairDisplay = Playfair_Display({ 
  subsets: ["latin"],
  variable: "--font-playfair-display",
  weight: ["400", "600", "700"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "FAFICS — Expertise Pool Application",
  description: "Federation of Associations of Former International Civil Servants - Expertise Pool Application Form",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfairDisplay.variable} ${dmSans.variable}`}>
      <body className="antialiased font-sans bg-off-white text-text min-h-screen flex flex-col">
        <div id="toast-container"></div>
        <ReactQueryProvider>
          <ToastProvider>
            <SiteChrome>{children}</SiteChrome>
          </ToastProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
