export type IfoodReceiptParseResult = {
  order_number: string;
  platform: "IFOOD" | "";
  customer_name: string;
  gross_amount: number | null;
  fees_amount: number | null;
  discount_amount: number | null;
  net_amount: number | null;
  products_text: string;
  customer_notes: string;
  customer_charge_amount: number | null;
};

const forbiddenCustomerParts = [
  "cobrar do cliente",
  "cobrar do:",
  "cpf na nota",
  "endereco",
  "itens do pedido",
  "pedido:",
  "expedicao"
];

export function parseIfoodReceipt(rawText: string): IfoodReceiptParseResult {
  const text = normalizeOcrText(rawText);
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const joined = lines.join("\n");
  const productsAndNotes = parseProductsAndNotes(extractOrderContent(joined));

  return {
    order_number: extractOrderNumber(joined),
    platform: /ifood/i.test(joined) ? "IFOOD" : "",
    customer_name: extractCustomer(lines),
    gross_amount: extractMoneyAfterLabel(joined, /valor\s+total\s+do\s+pedido/i),
    fees_amount: sumNullable([
      extractMoneyAfterLabel(joined, /taxa\s+de\s+servi[cç]o/i),
      extractMoneyAfterLabel(joined, /taxa\s+de\s+entrega/i)
    ]),
    discount_amount: absMoney(extractMoneyAfterLabel(joined, /incentivos\s+ifood/i)),
    net_amount: absMoney(extractMoneyAfterLabel(joined, /pagamento\s+via\s+ifood/i)),
    products_text: productsAndNotes.products_text,
    customer_notes: productsAndNotes.customer_notes,
    customer_charge_amount: extractMoneyAfterLabel(joined, /cobrar\s+do\s+cliente|cobrar\s+do:/i)
  };
}

export function debugParseIfoodReceipt(text: string) {
  return parseIfoodReceipt(text);
}

export function decimalToInput(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "";
}

export function cleanDecimal(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? value.toFixed(2) : "";
  const cleaned = value
    .replace(/[R$\s%]/g, "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const numeric = Number(cleaned);
  return Number.isFinite(numeric) ? Math.abs(numeric).toFixed(2) : "";
}

function normalizeOcrText(text: string) {
  return text
    .replace(/\r/g, "\n")
    .replace(/[“”]/g, "\"")
    .replace(/[–—]/g, "-")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function foldText(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function extractOrderNumber(text: string) {
  return text.match(/pedido\s*:\s*#?\s*([0-9]+)/i)?.[1] ?? "";
}

function extractCustomer(lines: string[]) {
  const markerIndex = lines.findIndex((line) => /primeiro\s+pedido/i.test(foldText(line)));
  const candidates = markerIndex >= 0 ? lines.slice(markerIndex + 1) : lines;
  const line = candidates.find((candidate) => {
    const lower = foldText(candidate);
    if (forbiddenCustomerParts.some((part) => lower.includes(part))) return false;
    if (/r\$\s*\d/i.test(lower)) return false;
    if (/^\d/.test(candidate)) return false;
    return /^[A-ZÀ-Ú][A-Za-zÀ-ú' -]{5,}$/.test(candidate);
  });
  return line ?? "";
}

function extractOrderContent(text: string) {
  const start = foldText(text).search(/itens\s+do\s+pedido/i);
  if (start < 0) return "";
  const afterStart = text.slice(start).replace(/^.*itens\s+do\s+pedido\s*/i, "");
  const end = foldText(afterStart).search(/\*?\s*pagamento\s+realizado\s*\*?|valor\s+total/i);
  return (end >= 0 ? afterStart.slice(0, end) : afterStart).trim();
}

function parseProductsAndNotes(block: string) {
  const productLines: string[] = [];
  const noteLines: string[] = [];
  let readingNotes = false;

  for (const rawLine of block.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (isFinancialOrHeaderLine(line)) continue;

    const noteSplit = splitProductNote(line);
    if (noteSplit.note) {
      readingNotes = true;
      const product = cleanProductLine(noteSplit.product);
      if (product) productLines.push(product);
      noteLines.push(cleanNoteLine(noteSplit.note));
      continue;
    }

    if (readingNotes || isNoteLine(line)) {
      readingNotes = true;
      noteLines.push(cleanNoteLine(line));
      continue;
    }

    const product = cleanProductLine(line);
    if (product) productLines.push(product);
  }

  return {
    products_text: productLines.filter(Boolean).join("\n"),
    customer_notes: noteLines.filter(Boolean).join("\n")
  };
}

function splitProductNote(line: string) {
  const match = foldText(line).match(/\b(obs(?:ervacao)?|colocar\s+bilhete|nao\s+mandar\s+nota)\s*:?\s*/i);
  if (!match || match.index === undefined) return { product: line, note: "" };
  return {
    product: line.slice(0, match.index).trim(),
    note: line.slice(match.index).trim()
  };
}

function isNoteLine(line: string) {
  return /\b(obs(?:ervacao)?|colocar\s+bilhete|nao\s+mandar\s+nota)\b/i.test(foldText(line));
}

function isFinancialOrHeaderLine(line: string) {
  const lower = foldText(line);
  return (
    /valor|pagamento|taxa|incentivo|cobrar|cpf|endereco|cep|telefone/i.test(lower) ||
    /pedido:|expedicao|codigo de coleta/i.test(lower)
  );
}

function cleanProductLine(line: string) {
  return line
    .replace(/^\(\d+\)\s*/, "")
    .replace(/\s+-?\s*R?\$?\s*\d{1,6}(?:[.,]\d{2})\s*/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function cleanNoteLine(line: string) {
  const cleaned = line
    .replace(/^obs(?:ervacao)?\s*:?\s*/i, "")
    .replace(/\s+e\s+(n[aã]o\s+mandar\s+nota)/i, "\n$1")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned
    .split("\n")
    .map((note) => note.charAt(0).toUpperCase() + note.slice(1))
    .join("\n");
}

function extractMoneyAfterLabel(text: string, label: RegExp) {
  const lines = text.split("\n");
  const line = lines.find((candidate) => label.test(candidate));
  if (!line) return null;
  const match = line.match(/-?\s*R?\$?\s*(\d{1,6}(?:[.,]\d{2}))/i);
  if (!match) return null;
  const hasNegative = /-/.test(line.slice(Math.max(0, match.index ?? 0) - 3, (match.index ?? 0) + match[0].length));
  const numeric = Number(match[1].replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(numeric)) return null;
  return hasNegative ? -numeric : numeric;
}

function absMoney(value: number | null) {
  return typeof value === "number" ? Math.abs(value) : null;
}

function sumNullable(values: Array<number | null>) {
  const present = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!present.length) return null;
  return Number(present.reduce((sum, value) => sum + value, 0).toFixed(2));
}
