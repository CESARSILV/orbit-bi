import "./globals.css";

export const metadata = {
  title: "Orbit BI | Copiloto Executivo de Mídia Paga",
  description: "Plataforma SaaS de Business Intelligence com IA para análise executiva de mídia paga em Google Ads e Meta Ads.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
