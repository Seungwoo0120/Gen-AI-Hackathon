import { getMessages } from "@/lib/i18n";

export default function Home() {
  const t = getMessages();
  return (
    <main>
      <h1>{t.appName}</h1>
      <p>{t.homeTagline}</p>
    </main>
  );
}
