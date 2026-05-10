# Copilot Instructions - RecebeFlow

Copilot: use this file to understand RecebeFlow project conventions and best practices.

## 🎯 Project Context

**RecebeFlow** is a multi-channel order management and receivables control ERP system. It tracks orders, finances, and reconciliation across platforms like iFood. Built with Next.js 15, React 19, TypeScript, and Supabase.

**Key Features**: Kanban operations board, order cards grid, financial dashboard, reconciliation, iFood integration, receipt OCR parsing (Google Gemini + Tesseract.js local fallback).

---

## 🔧 Development Setup

```bash
npm install && npm run dev      # Start dev server (localhost:3000)
npm run build && npm start      # Production
npm run lint                    # ESLint check
npx tsc --noEmit               # TypeScript validation
```

**Environment (`.env.local`):**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
GEMINI_API_KEY=your_gemini_key  # Optional, required for receipt parsing
```

---

## 📋 Architecture Principles

### 1️⃣ Services Layer (Data Gateway)
**Never query Supabase directly.** Use service objects in `lib/services.ts`:

```typescript
import { orderService, platformService } from '@/lib/services';

// ✅ DO THIS
const orders = await orderService.getOrders(userId, { status: 'Novo' });

// ❌ DON'T DO THIS
// const { data } = await supabase.from('orders').select('*');
```

**Why:** Services encapsulate error handling, RLS policies, and business logic. All errors normalized via `describeSupabaseError()`.

### 2️⃣ Portuguese (PT-BR) Convention 🇧🇷
**All code, types, and UI use Portuguese:**
- Database fields: `pedido`, `item_pedido`, `valor_liquido`, `data_entrega`
- Types: `Pedido`, `StatusPedido`, `Plataforma`
- UI text: Always Portuguese
- Formatting: `currency()` and `percent()` for Brazilian locale (R$, dd/mm/yyyy)

### 3️⃣ Component Organization
- **Client Components**: Marked with `'use client'` (interactivity, hooks)
- **Server Components**: Default (data fetching, API calls)
- **Modals**: Located in `components/erp/` with `[Name]Modal.tsx` pattern
- **Forms**: Use `FormattedInputs.tsx` for currency/date formatting

### 4️⃣ API Routes
- Located in `app/api/[feature]/route.ts`
- Use `serverSupabase()` for authenticated context
- Normalize errors with `describeSupabaseError()`
- Return consistent JSON error shape

---

## 🔌 Key Integrations

| Integration | Purpose | Location |
|---|---|---|
| **Supabase** | Auth (Email/Password), PostgreSQL with RLS | `lib/supabase.ts`, `lib/services.ts` |
| **iFood API** | Fetch/sync orders from merchant platform | `lib/ifood/server.ts`, `app/api/ifood/*` |
| **Google Gemini** | Parse receipt images → financial data | `lib/geminiVisionParser.ts`, `app/api/ai/receipt-parse` |
| **Tesseract.js** | Local OCR fallback (browser-side, no API) | `types/tesseract-js.d.ts`, scanner modals |

---

## ⚠️ Common Pitfalls

- **Never use `service_role` in frontend** — Only `NEXT_PUBLIC_*` vars use anon/public key
- **Migrations are idempotent** — `CREATE TABLE IF NOT EXISTS` pattern prevents re-run errors
- **RLS policies are permissive** — Current policies allow full CRUD for any authenticated user (tighten for production)
- **Gemini API required** — Receipt parsing fails if `GEMINI_API_KEY` not set; Tesseract.js fallback is browser-only
- **PT-BR formatting mandatory** — Currency and dates always use Brazilian locale

---

## 📁 File Structure

```
app/                        # Next.js App Router
├── api/                    # API routes (iFood, Gemini, auth)
├── [pages]/                # Pages (pedidos, conciliacao, financeiro, etc.)
components/erp/            # ERP-specific modals and forms
lib/
├── services.ts            # Data layer (orderService, platformService, etc.)
├── geminiVisionParser.ts  # AI receipt parsing
├── ifood/                 # iFood API client
supabase/migrations/       # SQL migrations (idempotent)
types/                     # TypeScript definitions
```

---

## ✅ Quick Reference

**Add new order functionality:**
```typescript
// Define or extend method in lib/services.ts
export const orderService = {
  getOrders: async (userId: string, filters?: Filters) => { ... },
  updateOrder: async (id: string, data: Partial<Pedido>) => { ... },
  // Add your method here
};
```

**Format currency:**
```typescript
import { currency } from '@/lib/utils';
console.log(currency(1234.56)); // "R$ 1.234,56"
```

**Check auth in component:**
```typescript
import { useAuth } from '@/hooks/useAuth';

const { user, isLoading } = useAuth();
if (!user) return <LoginGate />;
```

---

## 📖 See Also

- [AGENTS.md](../AGENTS.md) — Detailed architecture guide
- [README.md](../README.md) — Local setup and migrations
- `.copilot/skills/` — Domain-specific automation skills

