"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, Building2, ClipboardCheck, FileUp, Grid2X2, LogOut, Menu, PackageCheck, Users, WalletCards, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const navGroups = [
  { title: "PRINCIPAL", items: [{ href: "/", label: "Operação", icon: Grid2X2 }, { href: "/orders", label: "Pedidos", icon: PackageCheck }] },
  { title: "FINANCEIRO", items: [{ href: "/financeiro", label: "Financeiro", icon: WalletCards }, { href: "/conciliacao", label: "Conciliação", icon: ClipboardCheck }] },
  { title: "GESTÃO", items: [{ href: "/platforms", label: "Plataformas", icon: Building2 }, { href: "/upload", label: "Importar OCR", icon: FileUp }, { href: "/usuarios", label: "Usuários", icon: Users }] }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const mobileItems = navGroups.flatMap((group) => group.items);

  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden border-r border-[#dfe3ee] bg-white md:flex md:w-[84px] md:flex-col xl:w-[280px]">
        <Brand compactClass="xl:hidden" fullClass="hidden xl:block" />
        <nav className="flex-1 space-y-7 px-3 py-6">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="mb-2 hidden px-4 text-xs font-bold tracking-[0.14em] text-[#98a2b3] xl:block">{group.title}</p>
              <div className="space-y-1">
                {group.items.map((item) => <NavLink key={item.href} item={item} active={pathname === item.href} compact onClick={() => setOpen(false)} />)}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-[#eef1f6] px-3 py-4 text-center text-xs text-[#667085]">
          <button className="mb-3 inline-flex items-center gap-2 text-[#667085] hover:text-[#071124]" onClick={signOut} aria-label="Sair">
            <LogOut size={18} /><span className="hidden xl:inline">Sair</span>
          </button>
          <div className="hidden xl:block">ERP Pedidos v2.0</div>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={() => setOpen(false)}>
          <aside className="h-full w-[82vw] max-w-[320px] bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex h-16 items-center justify-between border-b border-[#eef1f6] px-5">
              <Brand inline />
              <button className="rounded-xl p-2 text-[#667085]" onClick={() => setOpen(false)} aria-label="Fechar menu"><X size={20} /></button>
            </div>
            <nav className="space-y-6 px-3 py-5">
              {navGroups.map((group) => (
                <div key={group.title}>
                  <p className="mb-2 px-4 text-xs font-bold tracking-[0.14em] text-[#98a2b3]">{group.title}</p>
                  <div className="space-y-1">{group.items.map((item) => <NavLink key={item.href} item={item} active={pathname === item.href} onClick={() => setOpen(false)} />)}</div>
                </div>
              ))}
            </nav>
          </aside>
        </div>
      )}

      <div className="md:pl-[84px] xl:pl-[280px]">
        <header className="sticky top-0 z-20 border-b border-[#eef1f6] bg-white/95 backdrop-blur md:hidden">
          <div className="flex min-h-16 items-center justify-between px-4">
            <button className="rounded-xl p-2 text-[#071124]" onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu size={22} /></button>
            <p className="text-lg font-black">ERP Pedidos</p>
            <button className="rounded-lg p-2 text-[#667085]" onClick={signOut} aria-label="Sair"><LogOut size={18} /></button>
          </div>
          <nav className="table-scroll flex gap-1 overflow-x-auto px-3 pb-3">
            {mobileItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return <Link key={item.href} href={item.href} className={cn("flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[#5b6475]", active && "bg-[#4f5df5] text-white")}><Icon size={17} />{item.label}</Link>;
            })}
          </nav>
        </header>
        <main className="min-h-screen px-3 py-4 sm:px-5 sm:py-6 lg:px-7">{children}</main>
      </div>
    </div>
  );
}

function Brand({ compactClass = "", fullClass = "", inline = false }: { compactClass?: string; fullClass?: string; inline?: boolean }) {
  const body = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#4f5df5] text-white"><Boxes size={20} /></span>
      <span className={cn("text-base font-black text-[#071124]", fullClass, inline && "block")}>ERP Pedidos</span>
      {!inline && <span className={cn(compactClass, "sr-only")}>ERP</span>}
    </>
  );
  if (inline) return <div className="flex items-center gap-3">{body}</div>;
  return <Link href="/" className="flex h-[68px] items-center justify-center gap-3 border-b border-[#eef1f6] px-4 xl:justify-start xl:px-7">{body}</Link>;
}

function NavLink({ item, active, compact, onClick }: { item: { href: string; label: string; icon: typeof Grid2X2 }; active: boolean; compact?: boolean; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={item.label}
      className={cn(
        "flex items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold text-[#5b6475] transition",
        compact && "justify-center xl:justify-start",
        active && "bg-[#4f5df5] text-white",
        !active && "hover:bg-[#f6f7fb] hover:text-[#071124]"
      )}
    >
      <Icon size={18} />
      <span className={cn(compact && "hidden xl:inline")}>{item.label}</span>
    </Link>
  );
}
