# RecebeFlow - AI Agent Guidelines

**RecebeFlow** é um sistema ERP multi-canal para gestão de pedidos e recebíveis, integrando plataformas como iFood, Supabase para dados, Google Gemini para OCR, e Tesseract.js para fallback local.

## Quick Start

```bash
npm install                    # Install dependencies
npm run dev                    # Start dev server (localhost:3000)
npm run build && npm start     # Production build & run
npm run lint                   # Check code quality
```

### Environment Setup
Create `.env.local` in the project root:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
# Optional: Google Gemini for receipt parsing
GEMINI_API_KEY=your_gemini_key
```

See [README.md](README.md) for full setup and database migration steps.

---

## Architecture & Key Patterns

### Directory Organization
```
app/                    # Next.js App Router (pages + API routes)
├── api/                # Route handlers (iFood, Gemini, auth callbacks)
├── [pages]/            # App pages (pedidos, conciliacao, financeiro, etc.)
components/            # React components (UI + modals)
├── erp/               # ERP-specific modal/form components
hooks/                 # Custom hooks (useAuth, useAsyncData)
lib/                   # Business logic (services, integrations, utils)
├── services.ts        # Data layer (orderService, platformService, etc.)
├── geminiVisionParser.ts  # AI receipt parsing
├── ifood/             # iFood API client
supabase/              # Migrations and schema SQL files
types/                 # TypeScript definitions (auto-generated from DB)
```

### Services Layer Pattern ⭐ 

**All database operations go through service objects**, not direct queries:

```typescript
import { orderService, platformService } from '@/lib/services';

// ✅ Good - use service
const orders = await orderService.getOrders(userId, filters);
const platforms = await platformService.getPlatforms(userId);

// ❌ Bad - never query Supabase directly in components
// const { data } = await supabase.from('orders').select('*');
```

**Why:** Services encapsulate error handling, RLS policies, and business logic. All errors are normalized via `describeSupabaseError()`.

### Portuguese (PT-BR) Convention 🇧🇷

**All code uses Portuguese naming:**
- Database: `pedido`, `item_pedido`, `valor_liquido`, `data_entrega`
- Types: `Pedido`, `StatusPedido`, `Plataforma`
- UI text: Always PT-BR
- Formatting: `currency()` and `percent()` utils format for BR locale

**Example:**
```typescript
interface Pedido {
  id: string;
  numero_pedido: string;
  valor_total: number;
  status: StatusPedido;
  data_criacao: string;
}
```

### Order Status Pipeline 

Status enum (always uppercase, Portuguese):
```
Novo → Separando → Pronto → Finalizado → Recebido
                            ↘ Pendente / Divergente / Cancelado
```

---

## Key Integrations & Modules

### 1. **Supabase (Auth + Data Storage)**
- Row-Level Security (RLS) policies on all tables
- Auth via Email/Password
- Tables: `orders`, `order_items`, `platforms`, `financial_entries`, `users_profiles`, etc.
- Client: `@supabase/supabase-js` with role-based queries

**File:** `lib/supabase.ts`, `lib/serverSupabase.ts`, `lib/services.ts`

### 2. **iFood API Integration**
- Fetch orders from iFood merchant platform
- Routes: `app/api/ifood/[auth|orders|status]/*`
- Order import stored in `orders` table

**File:** `lib/ifood/server.ts`, `app/api/ifood/`

### 3. **Google Gemini Vision (Receipt Parsing)**
- Parse receipt images → structured financial data
- Route: `app/api/ai/receipt-parse`
- Fallback: Tesseract.js (browser-side OCR)

**File:** `lib/geminiVisionParser.ts`, `app/api/ai/receipt-parse/route.ts`

### 4. **Client-Side OCR (Tesseract.js)**
- Local browser-based OCR for receipts
- No external API calls, privacy-first
- Used in document scanner modal

**File:** `types/tesseract-js.d.ts`, components with "Scanner" in name

---

## Component Patterns & Conventions

### Client vs Server Components
```typescript
'use client'          // Client components (interactivity, hooks)
// OR
// Default is server component (no directive needed)
```

### Modal & Form Components
- Located in `components/erp/` for ERP-specific modals
- Modal naming: `[Purpose]Modal.tsx` (e.g., `OrderDetailModal.tsx`, `DocumentScannerModal.tsx`)
- Form inputs use `FormattedInputs.tsx` for currency/date formatting

### Auth Context
```typescript
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user, isLoading } = useAuth();
  if (!user) return <LoginGate />;
  // ...
}
```

---

## Common Development Tasks

### Add a New API Route
1. Create `app/api/[feature]/route.ts`
2. Use `serverSupabase()` for authenticated server context
3. Normalize errors with `describeSupabaseError()`
4. Return JSON with consistent error shape

### Query Orders
```typescript
// Use service (always recommended)
const orders = await orderService.getOrders(userId, { status: 'Novo' });

// Or direct query with auth check
const { data, error } = await serverSupabase()
  .from('orders')
  .select('*')
  .eq('user_id', userId);
```

### Format Currency/Dates
```typescript
import { currency, percent } from '@/lib/utils';

const formatted = currency(1234.56);    // "R$ 1.234,56"
const pctFmt = percent(0.15);            // "15%"
```

### Upload Files
- Use Supabase Storage via API route
- Metadata stored in `uploaded_files` table
- Support: drag-and-drop upload in `app/upload/`

---

## Potential Pitfalls & Tips

⚠️ **Never use `service_role` key in frontend** — Only use `anon/public` key in `NEXT_PUBLIC_*` variables.

⚠️ **Migrations are idempotent** — All SQL in `supabase/migrations/` uses `IF NOT EXISTS` to prevent errors on re-run.

⚠️ **RLS policies are permissive** — Current policies allow any authenticated user full CRUD access. Consider tightening by role for production.

⚠️ **Gemini API required for receipt parsing** — If `GEMINI_API_KEY` is missing, parsing will fail. Tesseract.js fallback is browser-side only.

⚠️ **PT-BR formatting everywhere** — Currency and dates always format in Brazilian locale (R$, dd/mm/yyyy).

---

## File Structure Reference

| Module | Purpose | Key Files |
|--------|---------|-----------|
| **Pages** | User-facing screens | `app/[pedidos\|conciliacao\|financeiro\|upload]/*.tsx` |
| **API Routes** | Backend endpoints | `app/api/[feature]/*` |
| **Services** | Data layer | `lib/services.ts` |
| **UI Components** | Reusable elements | `components/*.tsx`, `components/erp/*.tsx` |
| **Hooks** | Custom React logic | `hooks/[useAuth\|useAsyncData].tsx` |
| **Integrations** | External APIs | `lib/ifood/*`, `lib/geminiVisionParser.ts` |
| **Database** | Schema + migrations | `supabase/migrations/*.sql` |
| **Types** | TypeScript definitions | `types/*`, `lib/database.types.ts` |

---

## Useful Commands for Agents

```bash
# Development
npm run dev                 # Start dev server with hot reload
npm run lint               # ESLint check

# Building
npm run build              # Production build
npm start                  # Start production server

# Type Checking
npx tsc --noEmit          # Check TypeScript errors

# Database
# Migrations run via Supabase CLI or dashboard
# See README.md for migration steps
```

---

## Next Steps for Customization

- **Database Policies**: Review/tighten RLS policies in `supabase/migrations/` for role-based access
- **Error Messages**: Standardize user-facing errors for all operations
- **API Documentation**: Document iFood and Gemini integration endpoints
- **Testing**: Add test utilities for services and components

