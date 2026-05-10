# ERP Pedidos / RecebeFlow

Sistema ERP de pedidos e recebiveis com operacao em kanban, pedidos em cards, financeiro, conciliacao, plataformas, importacao OCR, usuarios e Supabase Auth.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Variaveis de ambiente

Crie `.env.local` na raiz do projeto, ao lado do `package.json`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLIC
```

Use somente a chave `anon/public` no frontend. Nao use `service_role` no Next.js.

## Supabase

Para um banco novo:

1. Execute `supabase/migrations/20260508_fix_all_erp_schema.sql`.
2. Execute `supabase/migrations/20260508_order_attachments_and_ocr.sql`.
3. Em Authentication, habilite Email/Password.
4. Crie o primeiro acesso pela tela inicial.

Para um banco que ja tinha o RecebeFlow:

1. Execute `supabase/migrations/20260508_fix_all_erp_schema.sql`.
2. Execute `supabase/migrations/20260508_order_attachments_and_ocr.sql`.
3. As migrations sao idempotentes e podem rodar mais de uma vez sem apagar dados.

## O que mudou no layout

- Sidebar fixa com grupos: Principal, Financeiro e Gestao.
- Tela Operacao em kanban com colunas Novo, Separando e Pronto.
- Tela Pedidos em grade de cards com filtros, busca e modal de novo pedido.
- Modal de detalhe com checklist, acoes de separacao, registros e timeline.
- Financeiro redesenhado com aviso, cards e abas.
- Conciliacao com seletor de mes, confronto com extrato e lista de recebiveis.
- Plataformas com estado vazio e modal completo de taxas.
- Importar OCR com upload drag and drop para Supabase Storage.
- Lançar HUB com OCR local no navegador usando Tesseract.js.
- Anexos por pedido: foto da sacola, assinatura, papeleta e evidencias.

## Dados reais

O sistema continua usando Supabase real para:

- Login e sessao com Supabase Auth.
- Pedidos em `orders` e `order_items`.
- Plataformas em `platforms`.
- Financeiro calculado a partir dos pedidos finalizados.
- Conciliação calculada a partir dos pedidos recebiveis.
- Uploads em Supabase Storage e metadados em `uploaded_files`.
- Usuarios em `users_profiles`.

## Publicar na Vercel

1. Suba o projeto para um repositorio Git.
2. Importe o repositorio na Vercel.
3. Configure as variaveis:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. No Supabase Auth, adicione a URL da Vercel em Authentication > URL Configuration.
5. Faça o deploy.
