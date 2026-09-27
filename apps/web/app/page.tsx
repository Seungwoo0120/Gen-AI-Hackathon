import { strings } from "@/lib/strings";

export default function Home() {
  return (
    <main>
      <h1>{strings.appName}</h1>
      <p>{strings.homeTagline}</p>
    </main>
  );
}
