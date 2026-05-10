"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { isSupabaseConfigured, useAuth } from "@/hooks/useAuth";

export function LoginGate({ children }: { children: React.ReactNode }) {
  const { session, loading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface p-4">
        <div className="max-w-md rounded-lg border border-line bg-white p-6 shadow-soft">
          <h1 className="text-xl font-semibold">Configure o Supabase</h1>
          <p className="mt-2 text-sm text-muted">Crie o arquivo .env.local com NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para ativar o sistema.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-surface text-muted">Carregando sessão...</div>;
  }

  if (session) return <>{children}</>;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      if (mode === "login") await signIn(form.email, form.password);
      else await signUp(form.name, form.email, form.password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível autenticar.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-soft">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-600 text-white"><BarChart3 size={22} /></span>
          <div>
            <h1 className="text-xl font-semibold">RecebeFlow</h1>
            <p className="text-sm text-muted">Entre para acessar o financeiro</p>
          </div>
        </div>
        {mode === "signup" && (
          <input className="mb-3 h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand-500" placeholder="Nome" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        )}
        <input className="mb-3 h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand-500" placeholder="E-mail" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <input className="mb-3 h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand-500" placeholder="Senha" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
        {error && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button className="h-11 w-full rounded-lg bg-brand-600 font-semibold text-white hover:bg-brand-700">{mode === "login" ? "Entrar" : "Criar conta"}</button>
        <button type="button" className="mt-4 w-full text-sm font-medium text-brand-700" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "Criar primeiro acesso" : "Já tenho conta"}
        </button>
      </form>
    </div>
  );
}
