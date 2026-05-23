# @gaud_erp/meta-ads-performance-node

Paperclip plugin for Meta Ads (Marketing API): metrics cache, agent tools, and human-in-the-loop campaign actions.

## Features

- **Read-only by default** — agents read metrics; writes go through an approval queue
- **Agent tools** — `ads:get_campaign_metrics`, `ads:identify_fatigue`, `ads:suggest_pause`, `ads:suggest_budget_change`
- **UI** — Overview, Action Inbox, Audit Logs, Settings (Ad Account ID + token secret ref)
- **Crons** — hourly metrics sync; minute-level execution of approved actions

## Requirements

- [Paperclip](https://github.com/paperclipai/paperclip) instance with plugin runtime
- Meta Marketing API access token (stored as a Paperclip secret reference)
- Ad Account ID

## Install

### From npm (production)

```bash
paperclipai plugin install @gaud_erp/meta-ads-performance-node
```

### From local path (development)

```bash
git clone https://github.com/gauderp/meta-ads-performance-node.git
cd meta-ads-performance-node
npm install
npm run build
paperclipai plugin install "$(pwd)"
```

## Configuration

1. Open **Meta Ads Settings** in the Paperclip plugin UI.
2. Set **Ad Account ID** (numeric, without `act_` prefix).
3. Set **Access Token** as a secret reference (e.g. `secret://meta-ads-token`).

## Verify

```bash
npm run typecheck
npm test
npm run build
paperclipai plugin list
```

See [SMOKE.md](./SMOKE.md) for manual acceptance steps.

## License

MIT — see [LICENSE](./LICENSE).
