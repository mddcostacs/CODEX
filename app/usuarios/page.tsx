"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { ErpButton } from "@/components/erp/ErpButton";
import { ErpModal } from "@/components/erp/ErpModal";
import { SmallBadge } from "@/components/erp/OrderUi";
import { useAuth } from "@/hooks/useAuth";
import { useAsyncData } from "@/hooks/useAsyncData";
import { userProfileService } from "@/lib/services";
import type { UserProfileRow, UserRole } from "@/lib/database.types";

export default function UsuariosPage() {
  const { session } = useAuth();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserProfileRow | null>(null);
  const [message, setMessage] = useState("");
  const { data: items = [], loading, error, reload } = useAsyncData(() => userProfileService.list(search), [search]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#071124]">Usuários</h1>
          <p className="mt-1 text-[#5b6475]">Gerencie acessos e permissões sem interromper a sessão atual.</p>
        </div>
        <ErpButton icon={Plus} onClick={() => setOpen(true)}>Novo Usuário</ErpButton>
      </div>

      <input className="h-12 w-full rounded-xl border border-[#dfe3ee] bg-white px-4 shadow-sm outline-none focus:border-[#4f5df5]" placeholder="Buscar usuário" value={search} onChange={(event) => setSearch(event.target.value)} />
      {loading && <p className="rounded-xl bg-white p-4 text-sm text-[#667085]">Carregando usuários...</p>}
      {error && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{error}</p>}
      {message && <p className="rounded-xl bg-white p-4 text-sm font-semibold text-[#4f5df5]">{message}</p>}

      <section className="rounded-2xl bg-white shadow-sm">
        <div className="table-scroll overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="text-xs uppercase text-[#667085]">
              <tr className="border-b border-[#edf0f5]">
                <th className="p-4">Nome</th>
                <th>E-mail</th>
                <th>Permissão</th>
                <th>Status</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((user) => {
                const isCurrent = user.id === session?.user.id;
                return (
                  <tr key={user.id} className="border-b border-[#edf0f5] last:border-0">
                    <td className="p-4 font-black">{user.name}</td>
                    <td>{user.email}</td>
                    <td><SmallBadge tone={user.role === "admin" ? "purple" : user.role === "financeiro" ? "green" : "slate"}>{user.role}</SmallBadge></td>
                    <td>{user.active ? "Ativo" : "Inativo"}{isCurrent ? " · sessão atual" : ""}</td>
                    <td className="space-x-2 text-right">
                      <button className="rounded-lg px-3 py-2 text-xs font-bold text-[#4f5df5] hover:bg-[#eef0ff]" onClick={() => setEditing(user)}>Editar</button>
                      <button
                        className="rounded-lg px-3 py-2 text-xs font-bold text-[#d66b00] hover:bg-[#fff4e5] disabled:opacity-40"
                        disabled={isCurrent}
                        onClick={async () => {
                          if (isCurrent) return;
                          await userProfileService.update(user.id, { active: !user.active });
                          reload();
                        }}
                      >
                        {user.active ? "Desativar" : "Ativar"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && items.length === 0 && (
                <tr><td colSpan={5} className="p-12 text-center text-[#667085]">Nenhum usuário encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {open && <UserModal onClose={() => setOpen(false)} onSaved={() => { setOpen(false); reload(); }} />}
      {editing && <UserModal user={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </div>
  );
}

function UserModal({ user, onClose, onSaved }: { user?: UserProfileRow; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    password: "",
    role: user?.role ?? "operador" as UserRole,
    active: user?.active ?? true
  });

  async function save() {
    setError("");
    try {
      if (user) {
        await userProfileService.update(user.id, { name: form.name, role: form.role, active: form.active });
      } else {
        await userProfileService.invite({ name: form.name, email: form.email, password: form.password, role: form.role });
      }
      onSaved();
    } catch (err) {
      console.error("[ERP Pedidos] Falha ao salvar usuário", err);
      setError(err instanceof Error ? err.message : "Não foi possível salvar o usuário.");
    }
  }

  return (
    <ErpModal title={user ? "Editar Usuário" : "Novo Usuário"} onClose={onClose} footer={<ErpButton className="w-full" onClick={save}>Salvar usuário</ErpButton>}>
      <div className="space-y-4 [&_input]:h-11 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-[#dfe3ee] [&_input]:px-4 [&_select]:h-11 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-[#dfe3ee] [&_select]:px-4">
        <label className="block space-y-2 text-sm font-medium">Nome<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        {!user && <label className="block space-y-2 text-sm font-medium">E-mail<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>}
        {!user && <label className="block space-y-2 text-sm font-medium">Senha inicial<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>}
        <label className="block space-y-2 text-sm font-medium">Permissão<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}><option value="admin">admin</option><option value="financeiro">financeiro</option><option value="operador">operador</option></select></label>
        <label className="flex items-center gap-2 text-sm font-medium"><input className="!h-4 !w-4" type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Usuário ativo</label>
        {error && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{error}</p>}
      </div>
    </ErpModal>
  );
}
