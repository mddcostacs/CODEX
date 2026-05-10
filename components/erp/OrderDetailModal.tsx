"use client";

import { useState } from "react";
import { Bike, Camera, CheckSquare, FileImage, FileText, PenLine, Package, Timer } from "lucide-react";
import { ErpModal } from "@/components/erp/ErpModal";
import { ErpButton } from "@/components/erp/ErpButton";
import { SmallBadge, Timeline, orderProducts, platformName, stageFor } from "@/components/erp/OrderUi";
import { AttachmentModal } from "@/components/erp/AttachmentModal";
import { SignatureModal } from "@/components/erp/SignatureModal";
import { PapeletaModal } from "@/components/erp/PapeletaModal";
import { useAsyncData } from "@/hooks/useAsyncData";
import type { OrderRow, OperationStage } from "@/lib/database.types";
import { orderService, uploadService } from "@/lib/services";
import { currency } from "@/lib/utils";

type DetailAction = "foto-sacola" | "assinatura" | "papeleta" | "evidencias" | null;

export function OrderDetailModal({ order, onClose, onChanged }: { order: OrderRow; onClose: () => void; onChanged: () => void }) {
  const [action, setAction] = useState<DetailAction>(null);
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { data: attachments = [], reload: reloadAttachments } = useAsyncData(() => uploadService.listByOrder(order.id), [order.id]);

  async function setStage(stage: OperationStage | "Finalizado") {
    try {
      await orderService.update(order.id, {
        operation_stage: stage === "Finalizado" ? "Pronto" : stage,
        status: stage
      });
      onChanged();
      setMessage(`Pedido atualizado para ${stage}.`);
      onClose();
    } catch (err) {
      console.error("[ERP Pedidos] Falha ao alterar status do pedido", err);
      setMessage(err instanceof Error ? err.message : "Não foi possível alterar o status.");
    }
  }

  const stage = stageFor(order);

  return (
    <>
      <ErpModal title="" onClose={onClose}>
        <div className="-mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <Bike size={16} className="text-[#4f5df5]" />
            <h2 className="text-xl font-black text-[#071124]">{order.order_number}</h2>
            <SmallBadge>{platformName(order)}</SmallBadge>
            <SmallBadge tone="yellow"><Timer size={13} /> Atrasado</SmallBadge>
          </div>
          <p className="mt-2 text-[#667085]">{order.customer_name}</p>

          <div className="mt-5 grid grid-cols-3 gap-4 border-y border-[#edf0f5] py-5">
            <div><p className="text-xs text-[#667085]">Bruto</p><p className="font-black">{currency(Number(order.gross_amount))}</p></div>
            <div><p className="text-xs text-[#667085]">Líquido</p><p className="font-black text-[#4f5df5]">{currency(Number(order.net_amount))}</p></div>
            <div className="text-right"><p className="text-xs text-[#667085]">Prazo</p><p className="font-black text-[#ef6c00]">{order.deadline_days ?? 3}d</p></div>
          </div>

          <Block icon={Package} title="ITENS DO PEDIDO">
            <p className="text-sm text-[#071124]">{orderProducts(order)}</p>
          </Block>
          <Block icon={CheckSquare} title="CHECKLIST">
            <button onClick={() => setAction("foto-sacola")} className="flex w-full items-center gap-2 rounded-xl border border-[#ffb4b4] bg-[#fff6f6] px-3 py-3 text-left text-sm text-[#c62828]">
              <Camera size={16} /> Foto da sacola — clique para tirar
            </button>
          </Block>
          <Block icon={Timer} title="AÇÕES">
            <div className="grid gap-2">
              <ErpButton onClick={() => setStage("Separando")}>Iniciar Separação →</ErpButton>
              <ErpButton onClick={() => setStage("Pronto")} variant="outline">Marcar como Pronto</ErpButton>
              <ErpButton onClick={() => setStage("Finalizado")} variant="outline">Finalizar</ErpButton>
            </div>
            {message && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{message}</p>}
          </Block>
          <Block icon={FileImage} title="ARQUIVOS E REGISTROS">
            <div className="grid gap-2 sm:grid-cols-2">
              <ErpButton variant="outline" icon={Camera} onClick={() => setAction("foto-sacola")}>Foto sacola</ErpButton>
              <ErpButton variant="outline" icon={PenLine} onClick={() => setAction("assinatura")}>Assinatura</ErpButton>
              <ErpButton variant="outline" icon={Package} onClick={() => setAction("papeleta")}>Papeleta</ErpButton>
              <ErpButton variant="outline" icon={FileText} onClick={() => setAction("evidencias")}>Evidências</ErpButton>
            </div>
            <AttachmentsList attachments={attachments} onOpen={setPreviewUrl} />
          </Block>
          <Block icon={Timer} title="TIMELINE">
            <Timeline stage={stage} />
          </Block>
        </div>
      </ErpModal>

      {action === "foto-sacola" && <AttachmentModal order={order} category="foto-sacola" title="Foto da sacola" onClose={() => setAction(null)} onUploaded={() => { reloadAttachments(); onChanged(); }} />}
      {action === "evidencias" && <AttachmentModal order={order} category="evidencia" title="Evidências" onClose={() => setAction(null)} onUploaded={() => { reloadAttachments(); onChanged(); }} />}
      {action === "assinatura" && <SignatureModal order={order} onClose={() => setAction(null)} onSaved={() => { reloadAttachments(); onChanged(); }} />}
      {action === "papeleta" && <PapeletaModal order={order} onClose={() => setAction(null)} />}
      {previewUrl && (
        <ErpModal title="Preview do anexo" onClose={() => setPreviewUrl(null)} wide>
          <img src={previewUrl} alt="Preview do anexo" className="max-h-[78vh] w-full rounded-2xl object-contain" />
        </ErpModal>
      )}
    </>
  );
}

function AttachmentsList({ attachments, onOpen }: { attachments: Awaited<ReturnType<typeof uploadService.listByOrder>>; onOpen: (url: string) => void }) {
  if (!attachments.length) {
    return <p className="mt-3 text-sm text-[#98a2b3]">Nenhum anexo vinculado a este pedido.</p>;
  }

  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {attachments.map((file) => (
        <button
          key={file.id}
          className="rounded-xl border border-[#edf0f5] bg-[#f8fafc] p-3 text-left text-sm hover:border-[#4f5df5]"
          onClick={async () => onOpen(await uploadService.signedUrl(file))}
        >
          <span className="block font-bold text-[#071124]">{file.file_name}</span>
          <span className="text-xs text-[#667085]">{file.category || "anexo"} · {file.ocr_status}</span>
        </button>
      ))}
    </div>
  );
}

function Block({ icon: Icon, title, children }: { icon: typeof Package; title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-[#edf0f5] py-4 last:border-0">
      <div className="mb-3 flex items-center gap-2 text-xs font-black text-[#7a8495]">
        <Icon size={14} />
        {title}
      </div>
      {children}
    </section>
  );
}
