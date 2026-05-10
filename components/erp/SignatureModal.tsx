"use client";

import { useRef, useState } from "react";
import { ErpButton } from "@/components/erp/ErpButton";
import { ErpModal } from "@/components/erp/ErpModal";
import { useAuth } from "@/hooks/useAuth";
import { uploadService } from "@/lib/services";
import type { OrderRow } from "@/lib/database.types";

export function SignatureModal({ order, onClose, onSaved }: { order: OrderRow; onClose: () => void; onSaved?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const { session } = useAuth();
  const [message, setMessage] = useState("");

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(event.pointerId);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const p = point(event);
    drawing.current = true;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#071124";
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = point(event);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  async function save() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Assinatura vazia.");
      const file = new File([blob], `assinatura-${order.order_number}.png`, { type: "image/png" });
      await uploadService.upload(file, session?.user.id, { orderId: order.id, category: "assinatura", ocrStatus: "anexo" });
      onSaved?.();
      onClose();
    } catch (err) {
      console.error("[ERP Pedidos] Falha ao salvar assinatura", err);
      setMessage(err instanceof Error ? err.message : "Não foi possível salvar a assinatura.");
    }
  }

  return (
    <ErpModal title="Assinatura" onClose={onClose} footer={<div className="flex gap-2"><ErpButton variant="outline" onClick={clear}>Limpar</ErpButton><ErpButton className="flex-1" onClick={save}>Salvar assinatura</ErpButton></div>}>
      <p className="mb-3 text-sm text-[#667085]">Assine no campo abaixo usando mouse, dedo ou caneta.</p>
      <canvas
        ref={canvasRef}
        width={900}
        height={360}
        className="h-64 w-full touch-none rounded-2xl border border-[#dfe3ee] bg-white"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={() => { drawing.current = false; }}
        onPointerLeave={() => { drawing.current = false; }}
      />
      {message && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{message}</p>}
    </ErpModal>
  );
}
