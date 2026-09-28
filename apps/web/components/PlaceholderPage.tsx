import { MedicalDisclaimer } from "./MedicalDisclaimer";

export function PlaceholderPage({
  title,
  comingSoon,
  showDisclaimer = false,
}: {
  title: string;
  comingSoon: string;
  showDisclaimer?: boolean;
}) {
  return (
    <main className="page-content">
      <section className="page-heading">
        <h1>{title}</h1>
        <p>{comingSoon}</p>
      </section>
      {showDisclaimer ? <MedicalDisclaimer /> : null}
    </main>
  );
}
