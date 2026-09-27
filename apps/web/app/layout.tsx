import type { Metadata } from "next";
import { defaultLanguage, getMessages } from "@/lib/i18n";
import "./globals.css";

const t = getMessages();

export const metadata: Metadata = {
  title: t.appName,
  description: t.notMedicalAdvice,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={defaultLanguage}>
      <body>{children}</body>
    </html>
  );
}
