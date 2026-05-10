import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { AuthProvider } from "@/hooks/useAuth";
import { LoginGate } from "@/components/LoginGate";

export const metadata: Metadata = {
  title: "RecebeFlow",
  description: "Controle de recebíveis multicanal para lojas."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <LoginGate>
            <AppShell>{children}</AppShell>
          </LoginGate>
        </AuthProvider>
      </body>
    </html>
  );
}
