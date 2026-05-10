# Skill: ERP Components & Modals

This skill guides you through creating and modifying RecebeFlow UI components, modals, and forms.

## When to Use

- Creating new modal components
- Modifying form inputs and layouts
- Adding new pages or screens
- Implementing ERP-specific UI patterns

---

## Modal Component Pattern

**All ERP-specific modals are located in `components/erp/` with standard structure:**

### Basic Modal Template

```typescript
'use client';

import React, { useState } from 'react';
import { ErpModal } from './ErpModal';
import { ErpButton } from './ErpButton';

interface YourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: any) => Promise<void>;
}

export function YourModal({ isOpen, onClose, onSubmit }: YourModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    setError(null);
    try {
      if (onSubmit) {
        await onSubmit(Object.fromEntries(formData));
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ErpModal title="Título do Modal" isOpen={isOpen} onClose={onClose}>
      <form onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(new FormData(e.currentTarget));
      }} className="space-y-4">
        {error && <div className="text-red-600">{error}</div>}
        
        {/* Form fields here */}
        
        <div className="flex gap-2 justify-end">
          <ErpButton variant="outline" onClick={onClose}>Cancelar</ErpButton>
          <ErpButton type="submit" isLoading={isLoading}>Salvar</ErpButton>
        </div>
      </form>
    </ErpModal>
  );
}
```

---

## Form Input Components

### Currency Input (BR Format)

```typescript
import { FormattedInputs } from './FormattedInputs';

<FormattedInputs
  type="currency"
  name="valor_total"
  label="Valor Total"
  defaultValue={1234.56}
  onChange={(value: number) => console.log(value)}
/>
// Input displays: R$ 1.234,56
// Returns: 1234.56
```

### Date Input (BR Format)

```typescript
<FormattedInputs
  type="date"
  name="data_entrega"
  label="Data de Entrega"
  defaultValue={new Date('2026-05-10')}
/>
// Input displays: 10/05/2026
// Returns: ISO string
```

### Text Input

```typescript
<FormattedInputs
  type="text"
  name="numero_pedido"
  label="Número do Pedido"
  placeholder="Digite o número"
/>
```

### Dropdown/Select

```typescript
<FormattedInputs
  type="select"
  name="status"
  label="Status"
  options={[
    { value: 'Novo', label: 'Novo' },
    { value: 'Separando', label: 'Separando' },
    { value: 'Pronto', label: 'Pronto' },
  ]}
  defaultValue="Novo"
/>
```

---

## Common ERP Modal Examples

### Order Detail Modal

```typescript
'use client';

import { OrderDetailModal } from '@/components/erp/OrderDetailModal';
import { useState } from 'react';

export default function OrdersPage() {
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  return (
    <div>
      {/* Your content */}
      <OrderDetailModal
        orderId={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
}
```

### New Order Modal

```typescript
import { NewOrderModal } from '@/components/erp/NewOrderModal';

<NewOrderModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onSubmit={async (orderData) => {
    await orderService.createOrder(userId, orderData);
    // Refresh list...
  }}
/>
```

### Document Scanner Modal (Receipt OCR)

```typescript
import { DocumentScannerModal } from '@/components/erp/DocumentScannerModal';

<DocumentScannerModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onExtractedData={(data: OCRData) => {
    // Use extracted receipt data (Tesseract.js or Gemini)
    console.log(data);
  }}
/>
```

---

## Page Component Structure

### Standard Page Layout

```typescript
// app/pedidos/page.tsx
'use client';

import { SectionHeader } from '@/components/SectionHeader';
import { Toolbar } from '@/components/Toolbar';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { useAsyncData } from '@/hooks/useAsyncData';
import { orderService } from '@/lib/services';
import { useState } from 'react';

export default function PedidosPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({ status: 'Novo' });
  
  const { data: orders, isLoading, error } = useAsyncData(
    () => orderService.getOrders(user?.id || '', filters),
    [user?.id, filters]
  );

  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <SectionHeader title="Pedidos" />
      
      <Toolbar
        onSearch={(query) => setFilters({ ...filters, search: query })}
        onFilter={(newFilters) => setFilters(newFilters)}
      />

      <div className="grid grid-cols-1 gap-4">
        {orders?.map((order) => (
          <div key={order.id} className="p-4 border rounded-lg">
            <div className="flex justify-between items-center">
              <span>{order.numero_pedido}</span>
              <StatusBadge status={order.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Component Base Classes (Tailwind)

### Container & Layout
```typescript
// Full-width container
<div className="w-full max-w-7xl mx-auto px-4">

// Grid layouts
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

// Flex with gap
<div className="flex items-center justify-between gap-4">
```

### Spacing & Sizing
```typescript
// Padding: p-2, p-4, p-6, p-8
// Margin: m-2, m-4, space-y-4 (vertical), space-x-4 (horizontal)
<div className="p-6 space-y-4">

// Borders & Radius
<div className="border border-gray-200 rounded-lg shadow">
```

### Typography & Colors
```typescript
// Text styles
<h1 className="text-2xl font-bold text-gray-900">Título</h1>
<p className="text-sm text-gray-600">Descrição</p>

// Status colors (use StatusBadge component for consistency)
<span className="px-3 py-1 rounded-full bg-green-100 text-green-800">Ativo</span>
```

---

## Status Badge Component

```typescript
import { StatusBadge } from '@/components/StatusBadge';

<StatusBadge status="Novo" />          // Blue
<StatusBadge status="Pronto" />        // Green
<StatusBadge status="Cancelado" />     // Red
<StatusBadge status="Pendente" />      // Yellow
```

---

## Auth Context in Components

```typescript
'use client';

import { useAuth } from '@/hooks/useAuth';

export function MyProtectedComponent() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div>Carregando...</div>;
  if (!user) return <LoginGate />; // From components/LoginGate.tsx

  return (
    <div>
      Bem-vindo, {user.email}!
    </div>
  );
}
```

---

## Formatting Utilities

```typescript
import { currency, percent, cn } from '@/lib/utils';

// Currency formatting (PT-BR)
const formatted = currency(1234.56);    // "R$ 1.234,56"
const percentFmt = percent(0.15);       // "15%"

// Class name utility (clsx wrapper)
const buttonClass = cn(
  'px-4 py-2 rounded-lg',
  isActive && 'bg-blue-600 text-white',
  !isActive && 'bg-gray-100 text-gray-900'
);
```

---

## File Upload Component

```typescript
// app/upload/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function UploadPage() {
  const [uploading, setUploading] = useState(false);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    
    for (const file of files) {
      setUploading(true);
      const { error } = await supabase.storage
        .from('receipts')
        .upload(`${Date.now()}-${file.name}`, file);
      
      if (error) console.error(error);
      setUploading(false);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed p-8 rounded-lg"
    >
      Arraste arquivos aqui...
    </div>
  );
}
```

---

## Portuguese (PT-BR) UI Convention

**All UI text must be in Portuguese:**

```typescript
// ✅ CORRECT
<label>Valor Total</label>
<button>Salvar Pedido</button>
<p>Nenhum pedido encontrado</p>

// ❌ INCORRECT
<label>Total Amount</label>
<button>Save Order</button>
<p>No orders found</p>
```

---

## Common Patterns

### Loading State
```typescript
{isLoading && <div className="text-center py-4">Carregando...</div>}
```

### Error Message
```typescript
{error && (
  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
    {error}
  </div>
)}
```

### Empty State
```typescript
{!orders || orders.length === 0 && (
  <div className="text-center py-8 text-gray-500">
    Nenhum pedido encontrado
  </div>
)}
```

### Success Toast/Notification
```typescript
// Use browser native or integrate a toast library
alert('Pedido salvo com sucesso!');
```

---

## See Also

- [AGENTS.md](../../AGENTS.md#component-patterns--conventions) — Component conventions
- `components/erp/*.tsx` — Available modal components
- `components/FormattedInputs.tsx` — Form input patterns
- `lib/utils.ts` — Utility functions (currency, percent, cn)

