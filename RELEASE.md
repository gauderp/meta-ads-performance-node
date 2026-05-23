# Release checklist

## GitHub (done)

- Repository: https://github.com/gauderp/meta-ads-performance-node
- Visibility: public (org `gauderp`)
- Default branch: `main`
- CI: `.github/workflows/ci.yml`

## npm (pending credentials)

Package: `@gaud_erp/meta-ads-performance-node@1.0.0`

Escopo npm alinhado aos demais plugins da org (`@gaud_erp/*`).

```bash
# Requer secret NPM_TOKEN no repo (mesmo valor de gauderp/github-manager)
gh workflow run publish.yml -R gauderp/meta-ads-performance-node
npm view @gaud_erp/meta-ads-performance-node version
```

Verify install:

```bash
paperclipai plugin install @gaud_erp/meta-ads-performance-node
```
