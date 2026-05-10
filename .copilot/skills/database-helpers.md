# Skill: Database Helpers & Patterns

This skill guides you through RecebeFlow database operations, migrations, and RLS policies.

## When to Use

- Adding/modifying database operations
- Troubleshooting Supabase errors
- Writing migrations or RLS policies
- Optimizing queries

---

## Service Layer Pattern (Required)

**All database operations must go through `lib/services.ts` service objects.**

### Basic Service Structure

```typescript
// lib/services.ts
export const orderService = {
  // Query operations
  getOrders: async (userId: string, filters?: Partial<Pedido>) => {
    const { data, error } = await serverSupabase()
      .from('orders')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw new Error(describeSupabaseError(error));
    return data;
  },

  // Create operations
  createOrder: async (userId: string, order: Omit<Pedido, 'id' | 'user_id'>) => {
    const { data, error } = await serverSupabase()
      .from('orders')
      .insert([{ ...order, user_id: userId }])
      .select();
    
    if (error) throw new Error(describeSupabaseError(error));
    return data[0];
  },

  // Update operations
  updateOrder: async (id: string, updates: Partial<Pedido>) => {
    const { data, error } = await serverSupabase()
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(describeSupabaseError(error));
    return data;
  },
};
```

### Use Service in Components/API Routes

```typescript
// ✅ CORRECT - Use service
import { orderService } from '@/lib/services';

const orders = await orderService.getOrders(userId, { status: 'Novo' });

// ❌ INCORRECT - Direct query
const { data } = await supabase.from('orders').select('*');
```

---

## Error Handling Pattern

**Always normalize errors via `describeSupabaseError()`:**

```typescript
import { describeSupabaseError } from '@/lib/utils';

try {
  const { data, error } = await serverSupabase()
    .from('orders')
    .select('*');
  
  if (error) {
    throw new Error(describeSupabaseError(error));
  }
  return data;
} catch (err) {
  console.error(err); // Safe, human-readable message
}
```

---

## Writing Migrations

**All migrations in `supabase/migrations/` must be idempotent:**

```sql
-- ✅ CORRECT - Use IF NOT EXISTS
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  numero_pedido TEXT NOT NULL,
  valor_total DECIMAL(10, 2),
  status TEXT DEFAULT 'Novo',
  data_criacao TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- ❌ INCORRECT - Will fail on re-run
CREATE TABLE orders (
  ...
);
```

**Naming convention:**
- Timestamp: `YYYYMMDD_description.sql`
- Example: `20260510_add_order_attachments.sql`

---

## RLS (Row-Level Security) Policies

**Current policies allow full CRUD for authenticated users. Update for production:**

```sql
-- Enable RLS on table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/write their own records
CREATE POLICY orders_select_own ON orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY orders_insert_own ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY orders_update_own ON orders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY orders_delete_own ON orders
  FOR DELETE USING (auth.uid() = user_id);

-- Or role-based access:
CREATE POLICY orders_read_operador ON orders
  FOR SELECT USING (
    auth.uid() = user_id 
    AND (SELECT role FROM users_profiles WHERE id = auth.uid()) IN ('admin', 'operador')
  );
```

---

## Common Query Patterns

### Filter by Multiple Conditions
```typescript
export const orderService = {
  getOrdersFiltered: async (userId: string, filters: {
    status?: string;
    dataInicio?: string;
    dataFim?: string;
  }) => {
    let query = serverSupabase()
      .from('orders')
      .select('*')
      .eq('user_id', userId);

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.dataInicio) query = query.gte('data_criacao', filters.dataInicio);
    if (filters.dataFim) query = query.lte('data_criacao', filters.dataFim);

    const { data, error } = await query;
    if (error) throw new Error(describeSupabaseError(error));
    return data;
  },
};
```

### Aggregation / Count
```typescript
export const orderService = {
  countOrdersByStatus: async (userId: string) => {
    const { data, error } = await serverSupabase()
      .from('orders')
      .select('status, count(*)', { count: 'exact' })
      .eq('user_id', userId)
      .group('status');
    
    if (error) throw new Error(describeSupabaseError(error));
    return data;
  },
};
```

### Join with Related Data
```typescript
export const orderService = {
  getOrdersWithItems: async (userId: string) => {
    const { data, error } = await serverSupabase()
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', userId);
    
    if (error) throw new Error(describeSupabaseError(error));
    return data;
  },
};
```

---

## Supabase Client Setup

### Server-Side (API Routes, Server Components)
```typescript
// lib/serverSupabase.ts
import { createClient } from '@supabase/supabase-js';

export const serverSupabase = () => {
  // Use service_role key on server-side only
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY  // ⚠️ Server only!
  );
};
```

### Client-Side (Browser, use anon key)
```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY  // ✅ Public key only
);
```

---

## Debugging Tips

**RLS Policy Errors:**
- Error: `new row violates row-level security policy`
- Solution: Check that RLS policy filters match your user context (`auth.uid()`)

**Null Results Despite Data:**
- Cause: RLS policy may be filtering out rows
- Check: Verify the policy SELECT condition matches your user

**Rate Limiting:**
- If getting 429 errors, add pagination/limits
- Use `.limit(100).offset(page * 100)` for large datasets

**Missing Data on Update:**
- After `.update()`, remember `.select()` to return updated rows
- Use `.select().single()` for single-row updates

---

## See Also

- [AGENTS.md](../../AGENTS.md#key-integrations--modules) — Architecture overview
- [services.ts](../../lib/services.ts) — Main service implementations
- [database.types.ts](../../lib/database.types.ts) — Auto-generated types

