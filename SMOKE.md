# Meta Ads Performance Node — smoke manual

## Pré-requisitos

- Paperclip local em execução (`http://127.0.0.1:3100`)
- Secret ref com token Meta Marketing API
- Ad Account ID da conta de anúncios

## Instalação local

```bash
cd meta-ads-performance-node
npm install
npm run build
paperclipai plugin install "$(pwd)"
paperclipai plugin list
paperclipai plugin inspect meta-ads-performance-node
```

## Checklist

1. Plugin aparece como `ready` em `plugin list`.
2. UI **Meta Ads** abre Overview, Action Inbox e Audit Logs.
3. Settings salva `adAccountId` + `accessTokenSecretRef` por company.
4. Tool `ads:get_campaign_metrics` retorna métricas (live ou cache).
5. Tool `ads:suggest_pause` cria item `pending` na fila (sem escrita na Meta).
6. Aprovar na UI → cron `execute_approved_actions` executa na Meta (ambiente com credenciais reais).
