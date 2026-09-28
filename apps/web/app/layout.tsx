import type { Metadata, Viewport } from "next";
import { BottomNavigation } from "@/components/BottomNavigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getMessages } from "@/lib/i18n";
import { getLanguage } from "@/lib/i18n/server";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#075985",
};

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = getMessages(language);
  return {
    title: t.appName,
    description: t.appDescription,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const language = await getLanguage();
  const t = getMessages(language);

  return (
    <html lang={language}>
      <body>
        <div className="app-shell">
          <div className="app-shell__content">{children}</div>
          <footer className="app-shell__footer">
            <LanguageSwitcher language={language} messages={t.language} />
            <BottomNavigation messages={t.navigation} />
          </footer>
        </div>
      </body>
    </html>
  );
}
