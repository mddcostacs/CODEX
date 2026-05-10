"use client";

import { useState } from "react";
import { UploadCloud } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAsyncData } from "@/hooks/useAsyncData";
import { uploadService } from "@/lib/services";

export default function UploadPage() {
  const { session } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const { data: files = [], error, reload } = useAsyncData(() => uploadService.list(), []);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setBusy(true);
    setMessage("");
    try {
      for (const file of Array.from(fileList)) await uploadService.upload(file, session?.user.id);
      setMessage("Arquivo enviado. OCR salvo como pendente de leitura.");
      reload();
    } catch (err) {
      console.error("[ERP Pedidos] Falha no upload OCR", err);
      setMessage(err instanceof Error ? err.message : "Falha ao enviar arquivo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <div>
        <h1 className="text-3xl font-black text-[#071124]">Importar Vendas</h1>
        <p className="mt-1 text-[#5b6475]">Envie um print da tela de vendas e a IA extrai automaticamente</p>
      </div>

      <label className="flex min-h-60 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#d8deea] bg-white/30 p-8 text-center transition hover:bg-white">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e8ebff] text-[#4f5df5]">
          <UploadCloud size={30} />
        </span>
        <span className="mt-5 text-lg font-black">Arraste o print do pedido aqui</span>
        <span className="mt-2 text-sm text-[#5b6475]">ou clique para selecionar — iFood, Keeta, Mercado Livre...</span>
        <input className="sr-only" type="file" multiple accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(event) => handleFiles(event.target.files)} />
      </label>

      {message && <p className="rounded-xl bg-white p-4 text-sm font-semibold text-[#4f5df5]">{message}</p>}
      {error && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{error}</p>}
      {busy && <p className="text-sm text-[#667085]">Enviando arquivo...</p>}

      <section className="rounded-2xl border border-[#dfe3ee] bg-white p-6 shadow-sm">
        <h2 className="font-black">Como funciona?</h2>
        <div className="mt-5 space-y-3 text-[#5b6475]">
          {[
            "Tire um print da tela de vendas da sua plataforma",
            "Arraste ou selecione a imagem aqui",
            "A IA identifica e separa cada pedido automaticamente",
            "Edite valores, taxas e parcelas nos cards de pedidos"
          ].map((step, index) => (
            <p key={step} className="flex items-center gap-3"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e8ebff] text-sm font-black text-[#4f5df5]">{index + 1}</span>{step}</p>
          ))}
        </div>
      </section>

      {files.length > 0 && (
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-black">Uploads recentes</h2>
          <div className="mt-4 space-y-2">
            {files.slice(0, 5).map((file) => <div key={file.id} className="rounded-xl border border-[#edf0f5] p-3 text-sm text-[#5b6475]">{file.file_name} · OCR: {file.ocr_status}</div>)}
          </div>
        </section>
      )}
    </div>
  );
}
