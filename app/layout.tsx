import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Koloverse",
  description:
    "Modern digital Ajo and Esusu platform for trusted contribution groups.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${manrope.className} bg-[#f8f4ec] text-[#07161d] antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}