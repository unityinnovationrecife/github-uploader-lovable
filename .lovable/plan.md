
## Diagnóstico do Problema

Os logs da Edge Function mostram que as últimas chamadas após a atualização do secret `EVOLUTION_INSTANCE` para `G&S salgados` retornaram apenas `booted` e `shutdown` — **sem nenhuma linha de log de sucesso nem de erro da Evolution API**. Isso indica que a função está sendo invocada mas **silenciosamente falhando** antes de chegar no fetch.

### Causa Raiz: Formato do corpo da requisição

Comparando o código atual com a documentação oficial da Evolution API v1:

**Código atual (incorreto):**
```json
{
  "number": "558199...",
  "text": "mensagem"
}
```

**Documentação da Evolution API (correto):**
```json
{
  "number": "558199...",
  "textMessage": {
    "text": "mensagem"
  }
}
```

O campo `text` precisa estar aninhado dentro de um objeto `textMessage`. Esse erro faz com que a API receba um payload inválido — o número é enviado mas a mensagem em si nunca chega.

### Mudanças no Plano

**1. Corrigir `supabase/functions/send-whatsapp/index.ts`**

Alterar o body do `fetch` de:
```ts
body: JSON.stringify({
  number: EVOLUTION_PHONE,
  text: message,
})
```

Para:
```ts
body: JSON.stringify({
  number: EVOLUTION_PHONE,
  textMessage: {
    text: message,
  },
})
```

**2. Melhorar logs de diagnóstico**

Adicionar `console.log` com o status da resposta e o body de sucesso, para facilitar debug futuro.

Nenhuma alteração em outros arquivos é necessária.
