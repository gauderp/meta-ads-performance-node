# Release checklist

## GitHub (done)

- Repository: https://github.com/gauderp/meta-ads-performance-node
- Visibility: public (org `gauderp`)
- Default branch: `main`
- CI: `.github/workflows/ci.yml`

## npm (pending credentials)

Package: `@gauderp/meta-ads-performance-node@1.0.0`

```bash
npm login   # or export NPM_TOKEN with publish access to @gauderp
npm publish --access public
npm view @gauderp/meta-ads-performance-node version
```

Verify install:

```bash
npm install @gauderp/meta-ads-performance-node
paperclipai plugin install node_modules/@gauderp/meta-ads-performance-node
```
