
## Plan: Envio automático de pedidos via Evolution API

### Context
- The `CheckoutModal.tsx` currently uses `window.open(wa.me/...)` on line 110, requiring manual user action in WhatsApp.
- No edge functions exist yet. Secrets for the Evolution API have not been stored.
- The new instance token is: `A9CB03290FE6-4BDF-B6DE-7FBD6546B200`

### What needs to be done

**1. Store 4 secrets**
- `EVOLUTION_API_URL` = `https://evolution-api-production-5667.up.railway.app`
- `EVOLUTION_API_KEY` = `fb1af768cfa05089546e3b7b0780e3ed4024ec87130f39daf0b78676f5f95060`
- `EVOLUTION_INSTANCE` = `A9CB03290FE6-4BDF-B6DE-7FBD6546B200` (updated token)
- `EVOLUTION_PHONE` = `5581992429014` (destination number)

**2. Create edge function `supabase/functions/send-whatsapp/index.ts`**
- Accepts `POST { message: string }`
- Calls Evolution API: `POST /message/sendText/{instance}`
- Body: `{ number: EVOLUTION_PHONE, text: message }`
- Header: `{ apikey: EVOLUTION_API_KEY }`
- Returns `{ success: true }` or error JSON

**3. Update `supabase/config.toml`**
```toml
[functions.send-whatsapp]
verify_jwt = false
```

**4. Update `CheckoutModal.tsx` → `handleSubmit` (line 110)**
- Replace `window.open(wa.me...)` with `supabase.functions.invoke('send-whatsapp', { body: { message } })`
- Add toast feedback on success/error
- Keep `wa.me` as fallback if the edge function call fails (so no order is ever lost)
- Navigation to order tracking page stays unchanged

### Flow diagram
```text
Cliente finaliza pedido
        │
        ▼
Edge Function: send-whatsapp
        │
        ├─ POST /message/sendText/{instance}  ──▶  Evolution API (Railway)
        │                                                   │
        │                                                   ▼
        │                                        WhatsApp do lojista ✅
        │
        └─ (se falhar) fallback: abre wa.me link
```

### Files to change
| File | Action |
|------|--------|
| `supabase/functions/send-whatsapp/index.ts` | Create (new) |
| `supabase/config.toml` | Add function config |
| `src/components/CheckoutModal.tsx` | Replace `window.open(wa.me)` with `functions.invoke` |
