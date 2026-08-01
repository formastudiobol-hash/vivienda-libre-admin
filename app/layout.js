import "./globals.css";

export const metadata = {
  title: "Vivienda Libre — Panel de Administración",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
