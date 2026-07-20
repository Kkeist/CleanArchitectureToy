# Clean Architecture Demo

React + TypeScript toy. See `FILE_LOOKUP.md`.

```bash
npm install
npm run dev
npm run check
npm run build
```

## Cloudflare Pages

GitHub 连 Cloudflare 时：

| 项 | 值 |
|----|----|
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | `22`（仓库根目录 `.node-version`） |

本地直接发布：

```bash
npm run deploy
```

首次需 `npx wrangler login`，并确认 Cloudflare 账号里已有或允许创建项目 `clean-architecture-toy`。
