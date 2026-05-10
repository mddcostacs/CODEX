export type GeminiReceiptParseResult = {
  pedido: string;
  cliente: string;
  produtos: string;
  observacoes: string;
  valor_bruto: number | null;
  taxas: number | null;
  desconto: number | null;
  valor_liquido: number | null;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

const receiptSchema = {
  type: "object",
  properties: {
    pedido: { type: "string" },
    cliente: { type: "string" },
    produtos: { type: "string" },
    observacoes: { type: "string" },
    valor_bruto: { type: "number", nullable: true },
    taxas: { type: "number", nullable: true },
    desconto: { type: "number", nullable: true },
    valor_liquido: { type: "number", nullable: true }
  },
  required: ["pedido", "cliente", "produtos", "observacoes", "valor_bruto", "taxas", "desconto", "valor_liquido"]
};

const receiptInstruction = [
  "Você é um parser de papeletas iFood para um ERP de pedidos.",
  "Retorne somente JSON válido com os campos: pedido, cliente, produtos, observacoes, valor_bruto, taxas, desconto, valor_liquido.",
  "Produtos deve conter apenas quantidade + nome do produto. Não inclua observações no campo produtos.",
  "Observações do cliente, bilhete e instruções como não mandar nota fiscal devem ir em observacoes.",
  "Valores devem ser números decimais positivos, sem R$, sem %, sem texto e sem sinal negativo.",
  "Nunca use CEP, CPF, telefone, ID interno, código de coleta ou número de pedido como valor financeiro."
].join("\n");

export async function parseReceiptWithGemini(imageBase64: string, mimeType = "image/jpeg") {
  return callGemini([
    {
      inline_data: {
        mime_type: mimeType,
        data: stripDataUrl(imageBase64)
      }
    },
    { text: `${receiptInstruction}\nAnalise a imagem e gere o JSON estruturado.` }
  ]);
}

export async function parseReceiptTextWithGemini(text: string) {
  return callGemini([
    { text: `${receiptInstruction}\nTexto OCR local:\n${text}` }
  ]);
}

async function callGemini(parts: unknown[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Configure GEMINI_API_KEY no .env.local para usar o fallback com IA.");

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: receiptSchema
      }
    })
  });

  const raw = await response.json().catch(async () => ({ error: await response.text() })) as GeminiResponse & { error?: unknown };
  if (!response.ok) {
    throw new Error(`Gemini retornou ${response.status}: ${JSON.stringify(raw.error ?? raw)}`);
  }

  const outputText = raw.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
  if (!outputText) throw new Error("O Gemini não retornou JSON para o recibo.");

  return {
    parsed: normalizeGeminiResult(JSON.parse(outputText)),
    raw
  };
}

function normalizeGeminiResult(value: GeminiReceiptParseResult): GeminiReceiptParseResult {
  return {
    pedido: String(value.pedido ?? "").trim(),
    cliente: String(value.cliente ?? "").trim(),
    produtos: String(value.produtos ?? "").trim(),
    observacoes: String(value.observacoes ?? "").trim(),
    valor_bruto: normalizeMoney(value.valor_bruto),
    taxas: normalizeMoney(value.taxas),
    desconto: normalizeMoney(value.desconto),
    valor_liquido: normalizeMoney(value.valor_liquido)
  };
}

function normalizeMoney(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.abs(Number(numeric.toFixed(2))) : null;
}

function stripDataUrl(imageBase64: string) {
  return imageBase64.includes(",") ? imageBase64.split(",").pop() ?? "" : imageBase64;
}
