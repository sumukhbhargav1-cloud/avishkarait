import "./globals.css";

export const metadata = {
  title: "AVISHKAR Portal",
  description: "AVISHKAR Event Registration Portal",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
