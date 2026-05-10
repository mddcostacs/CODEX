"use client";

import { Camera, UploadCloud } from "lucide-react";
import { useState } from "react";
import { DocumentScannerModal } from "@/components/erp/DocumentScannerModal";
import { ErpModal } from "@/components/erp/ErpModal";
import { useAuth } from "@/hooks/useAuth";
import { uploadService } from "@/lib/services";
import type { OrderRow } from "@/lib/database.types";

export function AttachmentModal({
  order,
  category,
  title,
  onClose,
  onUploaded
}: {
  order?: OrderRow | null;
  category: string;
  title: string;
  onClose: () => void;
  onUploaded?: () => void;
}) {
  const { session } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);

  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      await uploadService.upload(file, session?.user.id, {
        orderId: order?.id,
        category,
        ocrStatus: "pendente de leitura"
      });
      onUploaded?.();
      setMessage("Arquivo salvo com sucesso.");
      onClose();
    } catch (err) {
      console.error("[ERP Pedidos] Falha ao anexar arquivo", err);
      setMessage(err instanceof Error ? err.message : "Não foi possível salvar o arquivo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ErpModal title={title} onClose={onClose}>
      <div className="grid gap-4 sm:grid-cols-2">
        <button type="button" className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#d8deea] p-5 text-center hover:bg-[#f6f7fb]" onClick={() => setScannerOpen(true)}>
          <Camera className="mb-3 text-[#4f5df5]" size={30} />
          <span className="font-black">Tirar foto com scanner</span>
          <span className="mt-1 text-sm text-[#667085]">Recorte central e melhora contraste</span>
        </button>
        <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#d8deea] p-5 text-center hover:bg-[#f6f7fb]">
          <UploadCloud className="mb-3 text-[#4f5df5]" size={30} />
          <span className="font-black">Escolher arquivo da galeria</span>
          <span className="mt-1 text-sm text-[#667085]">Imagem, PDF ou evidência</span>
          <input className="sr-only" type="file" accept="image/*,application/pdf" onChange={(event) => upload(event.target.files?.[0])} />
        </label>
      </div>
      {busy && <p className="mt-4 text-sm text-[#667085]">Salvando arquivo...</p>}
      {message && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{message}</p>}
      {scannerOpen && <DocumentScannerModal title={title} accept="image/*" onClose={() => setScannerOpen(false)} onUseImage={(file) => upload(file)} />}
    </ErpModal>
  );
}
