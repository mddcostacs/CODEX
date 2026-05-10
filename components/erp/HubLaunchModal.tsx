"use client";

import { Camera, UploadCloud } from "lucide-react";
import { useMemo, useState } from "react";
import { DocumentScannerModal } from "@/components/erp/DocumentScannerModal";
import { ErpButton } from "@/components/erp/ErpButton";
import { ErpModal } from "@/components/erp/ErpModal";
import { MoneyInput } from "@/components/erp/FormattedInputs";
import { useAuth } from "@/hooks/useAuth";
import type { PlatformRow, UploadedFileRow } from "@/lib/database.types";
import { cleanDecimal, decimalToInput, parseIfoodReceipt } from "@/lib/parsers/ifoodReceiptParser";
import { orderService, uploadService } from "@/lib/services";

type ParsedOrder = {
  order_number: string;
  platform_id: string;
  customer_name: string;
  products_description: string;
  customer_notes: string;
  gross_amount: string;
  fees_amount: string;
  discount_amount: string;
  other_deductions: string;
  net_amount: string;
};

type AiReceiptResult = {
  pedido?: string;
  plataforma?: string;
  cliente?: string;
  produtos?: string;
  observacoes?: string;
  valor_bruto?: number | null;
  taxas?: number | null;
  desconto?: number | null;
  valor_liquido?: number | null;
};

const emptyParsed: ParsedOrder = {
  order_number: "",
  platform_id: "",
  customer_name: "",
  products_description: "",
  customer_notes: "",
  gross_amount: "",
  fees_amount: "",
  discount_amount: "",
  other_deductions: "",
  net_amount: ""
};

export function HubLaunchModal({
  platforms,
  title = "Lançar HUB",
  onClose,
  onSaved
}: {
  platforms: PlatformRow[];
  title?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { session } = useAuth();
  const [fileName, setFileName] = useState("");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [uploaded, setUploaded] = useState<UploadedFileRow | null>(null);
  const [status, setStatus] = useState("Aguardando imagem");
  const [progress, setProgress] = useState(0);
  const [text, setText] = useState("");
  const [form, setForm] = useState<ParsedOrder>(emptyParsed);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [aiUsed, setAiUsed] = useState(false);
  const [aiAutoUsed, setAiAutoUsed] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const canSave = useMemo(() => form.order_number.trim() && form.customer_name.trim(), [form.order_number, form.customer_name]);

  async function handleFile(file?: File) {
    if (!file) return;
    setSourceFile(file);
    setFileName(file.name);
    setPreview(URL.createObjectURL(file));
    setText("");
    setMessage("");
    setProgress(0);
    setOcrConfidence(null);
    setAiUsed(false);
    setAiAutoUsed(false);
    setStatus("Salvando imagem...");

    try {
      const upload = await uploadService.upload(file, session?.user.id, { category: "hub-ocr", ocrStatus: "pendente de leitura" });
      setUploaded(upload);
      await runOcr(file, upload);
    } catch (err) {
      console.error("[ERP Pedidos] OCR/upload falhou", err);
      setStatus("OCR não encontrou dados suficientes. Preencha manualmente.");
      setForm((current) => ({ ...emptyParsed, ...current }));
      setMessage(err instanceof Error ? err.message : "Não foi possível processar a imagem.");
    }
  }

  async function runOcr(file: File, uploadRow = uploaded) {
    setStatus("Processando OCR...");
    setProgress(0);
    const Tesseract = await import("tesseract.js");
    const result = await Tesseract.recognize(file, "por+eng", {
      logger: (log) => {
        if (typeof log.progress === "number") setProgress(Math.round(log.progress * 100));
        if (log.status) setStatus(`Processando OCR... ${log.status}`);
      }
    });
    const extracted = result.data.text || "";
    const confidence = Number(result.data.confidence ?? 0);
    const parsed = parseReceiptText(extracted, platforms);
    setText(extracted);
    setOcrConfidence(Number.isFinite(confidence) ? confidence : 0);

    if (shouldUseAiFallback(parsed, confidence)) {
      await processWithAi(file, extracted, parsed, uploadRow, true, confidence);
      return;
    }

    setForm(parsed);
    setAiUsed(false);
    setAiAutoUsed(false);
    setStatus("OCR Local concluído. Revise os dados antes de salvar.");
    if (uploadRow) {
      await uploadService.update(uploadRow.id, { ocr_status: "lido", ocr_confidence: confidence, ai_processed: false, extracted_text: extracted, parsed_payload: parsed });
    }
  }

  async function reprocessOcr() {
    if (!sourceFile) {
      setMessage("Selecione uma imagem antes de reprocessar.");
      return;
    }
    try {
      await runOcr(sourceFile);
    } catch (err) {
      console.error("[ERP Pedidos] Reprocessamento OCR falhou", err);
      setMessage(err instanceof Error ? err.message : "Não foi possível reprocessar o OCR.");
    }
  }

  async function applyTextAgain() {
    const parsed = parseReceiptText(text, platforms);
    setForm(parsed);
    setAiUsed(false);
    setAiAutoUsed(false);
    setStatus("Leitura aplicada novamente. Revise os dados antes de salvar.");
    if (uploaded) {
      await uploadService.update(uploaded.id, { extracted_text: text, parsed_payload: parsed, ocr_status: "lido", ai_processed: false });
    }
  }

  async function reprocessWithAi() {
    if (!sourceFile && !text.trim()) {
      setMessage("Selecione uma imagem ou mantenha o texto extraído para usar IA.");
      return;
    }
    await processWithAi(sourceFile, text, form, uploaded, false, ocrConfidence ?? 0);
  }

  async function processWithAi(file: File | null, extractedText: string, fallbackParsed: ParsedOrder, uploadRow: UploadedFileRow | null, automatic: boolean, confidence: number) {
    setAiProcessing(true);
    setMessage("");
    setStatus(automatic ? "OCR com baixa confiança. Corrigindo com IA..." : "Reprocessando com IA...");
    try {
      const imageBase64 = file ? await fileToBase64(file) : "";
      const response = await fetch("/api/ai/receipt-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mimeType: file?.type, text: extractedText })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Não foi possível processar com IA.");
      const parsed = mapAiToParsedOrder(result.parsed, platforms, fallbackParsed);
      setForm(parsed);
      setAiUsed(true);
      setAiAutoUsed(automatic);
      setStatus(automatic ? "IA utilizada automaticamente. Revise os dados corrigidos." : "Reprocessamento com IA concluído. Revise os dados.");
      if (uploadRow) {
        await uploadService.update(uploadRow.id, {
          ocr_status: "lido",
          ocr_confidence: confidence,
          ai_processed: true,
          ai_raw_response: result.raw ?? {},
          extracted_text: extractedText,
          parsed_payload: parsed
        });
      }
    } catch (err) {
      console.error("[ERP Pedidos] IA OCR falhou", err);
      setForm(fallbackParsed);
      setStatus("OCR Local concluído. IA indisponível; revise manualmente.");
      setMessage(err instanceof Error ? err.message : "Não foi possível processar com IA.");
      if (uploadRow) {
        await uploadService.update(uploadRow.id, { ocr_status: "lido", ocr_confidence: confidence, ai_processed: false, extracted_text: extractedText, parsed_payload: fallbackParsed });
      }
    } finally {
      setAiProcessing(false);
    }
  }

  async function saveOrder() {
    setMessage("");
    if (!canSave) {
      setMessage("Informe pelo menos o número do pedido e o cliente para salvar.");
      return;
    }

    setSaving(true);
    try {
      const gross = Number(cleanDecimal(form.gross_amount || form.net_amount || 0));
      const fees = Number(cleanDecimal(form.fees_amount || 0));
      const discount = Number(cleanDecimal(form.discount_amount || 0));
      const other = Number(cleanDecimal(form.other_deductions || 0));
      const net = Number(cleanDecimal(form.net_amount || 0)) || gross - fees - discount - other;
      const created = await orderService.create({
        platform_id: form.platform_id || null,
        order_number: form.order_number.replace(/[^\dA-Za-z-]/g, ""),
        customer_name: form.customer_name.trim(),
        gross_amount: gross,
        fees_amount: fees,
        net_amount: Math.abs(net),
        status: "Novo",
        operation_stage: "Novo",
        products_description: form.products_description.trim(),
        discount_amount: discount,
        other_deductions: other,
        installments: 1,
        delivery_method: "",
        deadline_days: 3,
        notes: form.customer_notes.trim() || (text ? "Criado a partir de OCR." : "Criado manualmente a partir de imagem."),
        ordered_at: new Date().toISOString()
      }, form.products_description.trim() ? [{ name: form.products_description.trim(), quantity: 1, unit_price: gross }] : []);

      if (uploaded) {
        await uploadService.update(uploaded.id, { order_id: created.id, category: "hub-ocr", ocr_status: text ? "lido" : "pendente de leitura" });
      }
      setStatus("Pedido criado e imagem vinculada.");
      onSaved();
      onClose();
    } catch (err) {
      console.error("[ERP Pedidos] Falha ao criar pedido via OCR", err);
      setMessage(err instanceof Error ? err.message : "Não foi possível salvar o pedido.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ErpModal title={title} wide onClose={onClose} footer={<ErpButton className="w-full" onClick={saveOrder}>{saving ? "Salvando..." : "Salvar pedido"}</ErpButton>}>
      <div className="space-y-5">
        {!preview && (
          <div className="grid gap-4 sm:grid-cols-2">
            <button type="button" className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#d8deea] p-6 text-center hover:bg-[#f6f7fb]" onClick={() => setScannerOpen(true)}>
              <Camera className="mb-3 text-[#4f5df5]" size={30} />
              <span className="font-black">Tirar foto com scanner</span>
              <span className="mt-1 text-sm text-[#667085]">Recorte e melhora a papeleta</span>
            </button>
            <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#d8deea] p-6 text-center hover:bg-[#f6f7fb]">
              <UploadCloud className="mb-3 text-[#4f5df5]" size={30} />
              <span className="font-black">Anexar print/foto</span>
              <input className="sr-only" type="file" accept="image/*" onChange={(event) => handleFile(event.target.files?.[0])} />
            </label>
          </div>
        )}

        {preview && (
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="space-y-3">
              <img src={preview} alt="Preview da imagem enviada" className="max-h-[360px] w-full rounded-2xl border border-[#dfe3ee] object-contain" />
              <div className="rounded-xl bg-[#f6f7fb] p-3 text-sm text-[#5b6475]">
                <p className="font-bold text-[#071124]">{fileName}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusPill>OCR Local</StatusPill>
                  {typeof ocrConfidence === "number" && <StatusPill>Confiança {Math.round(ocrConfidence)}%</StatusPill>}
                  {aiUsed && <StatusPill tone="purple">{aiAutoUsed ? "IA utilizada automaticamente" : "IA utilizada"}</StatusPill>}
                  {aiUsed && <StatusPill tone="green">Corrigido por IA</StatusPill>}
                </div>
                <p className="mt-2">{status}</p>
                {status.startsWith("Processando") && <div className="mt-2 h-2 rounded-full bg-white"><div className="h-2 rounded-full bg-[#4f5df5]" style={{ width: `${progress}%` }} /></div>}
              </div>
              <div className="flex flex-wrap gap-2">
                <ErpButton variant="outline" onClick={reprocessOcr}>Reprocessar OCR</ErpButton>
                <ErpButton variant="outline" onClick={applyTextAgain}>Aplicar leitura novamente</ErpButton>
                <ErpButton variant="outline" onClick={reprocessWithAi}>{aiProcessing ? "Lendo com IA..." : "Reprocessar com IA"}</ErpButton>
              </div>
              <textarea className="min-h-36 w-full rounded-xl border border-[#dfe3ee] p-3 text-sm" value={text} onChange={(event) => setText(event.target.value)} placeholder="Texto extraído aparecerá aqui após o OCR." />
            </section>

            <section className="grid gap-3 md:grid-cols-2 [&_input]:h-11 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-[#dfe3ee] [&_input]:px-3 [&_select]:h-11 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-[#dfe3ee] [&_select]:px-3 [&_textarea]:min-h-24 [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-[#dfe3ee] [&_textarea]:p-3">
              <Field label="Nº Pedido"><input value={form.order_number} onChange={(e) => setForm({ ...form, order_number: e.target.value })} /></Field>
              <Field label="Plataforma"><select value={form.platform_id} onChange={(e) => setForm({ ...form, platform_id: e.target.value })}><option value="">Selecione</option>{platforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
              <Field label="Cliente"><input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></Field>
              <Field label="Valor bruto"><MoneyInput value={form.gross_amount} onChange={(value) => setForm({ ...form, gross_amount: value })} /></Field>
              <Field label="Taxa"><MoneyInput value={form.fees_amount} onChange={(value) => setForm({ ...form, fees_amount: value })} /></Field>
              <Field label="Desconto"><MoneyInput value={form.discount_amount} onChange={(value) => setForm({ ...form, discount_amount: value })} /></Field>
              <Field label="Valor líquido"><MoneyInput value={form.net_amount} onChange={(value) => setForm({ ...form, net_amount: value })} /></Field>
              <Field label="Produtos" full><textarea value={form.products_description} onChange={(e) => setForm({ ...form, products_description: e.target.value })} /></Field>
              <Field label="Observações do cliente" full><textarea value={form.customer_notes} onChange={(e) => setForm({ ...form, customer_notes: e.target.value })} /></Field>
            </section>
          </div>
        )}
        {message && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{message}</p>}
      </div>
      {scannerOpen && <DocumentScannerModal title={title} onClose={() => setScannerOpen(false)} onUseImage={(file) => handleFile(file)} />}
    </ErpModal>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <label className={`space-y-1 text-sm font-semibold text-[#071124] ${full ? "md:col-span-2" : ""}`}><span>{label}</span>{children}</label>;
}

function StatusPill({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "purple" | "green" }) {
  const tones = {
    slate: "bg-white text-[#5b6475]",
    purple: "bg-[#efe9ff] text-[#6d28d9]",
    green: "bg-[#dff9ed] text-[#087a4a]"
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tones[tone]}`}>{children}</span>;
}

function parseReceiptText(text: string, platforms: PlatformRow[]): ParsedOrder {
  if (/ifood/i.test(text)) {
    const ifood = parseIfoodReceipt(text);
    const platform = platforms.find((item) => /ifood/i.test(item.name));
    return {
      order_number: ifood.order_number,
      platform_id: platform?.id ?? "",
      customer_name: ifood.customer_name,
      products_description: ifood.products_text,
      customer_notes: ifood.customer_notes,
      gross_amount: decimalToInput(ifood.gross_amount),
      fees_amount: decimalToInput(ifood.fees_amount),
      discount_amount: decimalToInput(ifood.discount_amount),
      other_deductions: "",
      net_amount: decimalToInput(ifood.net_amount)
    };
  }

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const joined = lines.join(" ");
  const orderMatch = joined.match(/(?:pedido|ordem|order|#)\s*[:#-]?\s*([A-Z0-9-]{4,})/i) || joined.match(/\b([A-Z]{2,4}-?\d{4,})\b/i) || joined.match(/#\s?(\d{3,})/);
  const platform = platforms.find((item) => joined.toLowerCase().includes(item.name.toLowerCase()));

  return {
    order_number: orderMatch?.[1] ?? "",
    platform_id: platform?.id ?? "",
    customer_name: "",
    products_description: lines.slice(0, 8).join("\n"),
    customer_notes: "",
    gross_amount: "",
    fees_amount: "",
    discount_amount: "",
    other_deductions: "",
    net_amount: ""
  };
}

function shouldUseAiFallback(parsed: ParsedOrder, confidence: number) {
  const net = Number(cleanDecimal(parsed.net_amount || 0));
  return (
    confidence < 75 ||
    parsed.net_amount.includes("-") ||
    net < 0 ||
    !parsed.order_number.trim() ||
    !parsed.customer_name.trim() ||
    !parsed.products_description.trim()
  );
}

function mapAiToParsedOrder(ai: AiReceiptResult, platforms: PlatformRow[], fallback: ParsedOrder): ParsedOrder {
  const platform = platforms.find((item) => ai.plataforma && item.name.toLowerCase().includes(ai.plataforma.toLowerCase()));
  return {
    order_number: ai.pedido?.trim() || fallback.order_number,
    platform_id: platform?.id ?? fallback.platform_id,
    customer_name: ai.cliente?.trim() || fallback.customer_name,
    products_description: ai.produtos?.trim() || fallback.products_description,
    customer_notes: ai.observacoes?.trim() || fallback.customer_notes,
    gross_amount: decimalToInput(ai.valor_bruto ?? null) || fallback.gross_amount,
    fees_amount: decimalToInput(ai.taxas ?? null) || fallback.fees_amount,
    discount_amount: decimalToInput(ai.desconto ?? null) || fallback.discount_amount,
    other_deductions: fallback.other_deductions,
    net_amount: decimalToInput(ai.valor_liquido ?? null) || fallback.net_amount
  };
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? "").split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
