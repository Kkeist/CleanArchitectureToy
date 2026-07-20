# FILE LOOKUP

Clean Architecture demo (React + TS). Control-flow toy from CSC207 notes.

## Entry

| Path | Role |
|------|------|
| `index.html` | HTML shell, fonts |
| `src/main.tsx` | Composition root → builds CA engine, mounts View |
| `src/frameworks/main/buildCaEngine.ts` | Wires gateway, interactors, presenter, controller |
| `src/index.css` | Pixel-game UI theme |
| `pics-original-restore/*.PNG` | Untouched 1024 originals — never overwrite |
| `public/pics/*.PNG` | Alpha-trimmed board art (URL-safe names, transparent canvas) |
| `pics/*.PNG` | Same trimmed set as public |
| `pics-drop-originals/IMG_*.PNG` | Phone-export originals before rename |
| `pics-rename-map.txt` | IMG_* → correct name mapping |
| `picOrder.txt` | Asset name list |
| `wrangler.toml` | Cloudflare Pages：静态产物目录 `dist` |
| `public/_headers` | Cloudflare 缓存头（HTML / assets / pics） |
| `.node-version` | Cloudflare / 本地约定 Node 22 |

## Domain (Entities)

| Path | Role |
|------|------|
| `src/domain/entities/PieceKind.ts` | Piece / slot ids, board slot list |
| `src/domain/entities/Arrangement.ts` | Complete + correct-order + path-check return rules |

## Application (Use Cases + Ports)

| Path | Role |
|------|------|
| `src/application/dto/ArrangementDtos.ts` | Input / validation output data |
| `src/application/ports/CorrectOrderGateway.ts` | Data access interface for correct order |
| `src/application/ports/ValidateArrangementPorts.ts` | UC1 input/output boundaries |
| `src/application/ports/PlayAnimationPorts.ts` | UC2 boundaries + frame type |
| `src/application/usecases/ValidateArrangementInteractor.ts` | UC1: compare arrangement |
| `src/application/usecases/PlayFlowAnimationInteractor.ts` | UC2: emit control-flow frames |

## Adapters

| Path | Role |
|------|------|
| `src/adapters/gateways/InMemoryCorrectOrderGateway.ts` | Local correct slot→piece map |
| `src/adapters/controllers/AssemblyController.ts` | View events → use cases |
| `src/adapters/presenters/AssemblyPresenter.ts` | Use-case output → ViewModel |

## Frameworks / UI

| Path | Role |
|------|------|
| `src/frameworks/ui/AssemblyViewModel.ts` | ViewModel the View subscribes to |
| `src/frameworks/ui/AssemblyView.tsx` | Place parts, click View to test path, then process animation |
| `src/frameworks/ui/assets.ts` | Idle images, `CELL_OF_BOARD`, ring radius/nudges, pile layout |
| `src/frameworks/ui/centerNotes.ts` | Assemble guidance + CSC207 §11.4 steps synced to frames |
| `scripts/trim-pics.mts` | Alpha-only shared-family crop; promotes 1024 drops from `pics/` into restore first |

## Checks

| Path | Role |
|------|------|
| `scripts/check-ca.mts` | Local automated checks for UC1/UC2 + entity rules + path-check helpers |
| `scripts/check-process-steps.mts` | Asserts arrow/box exclusive beats + step numbers never jump back |
| `scripts/check-drag.mts` | Click-carry, shared face size, View test + Complete skip |
| `scripts/trim-pics.mts` | Alpha crop only; aborts if opaque/black-ink counts change |

## Run

```bash
npm install
npm run dev
npx tsx scripts/check-ca.mts
npm run build
npm run deploy
```

Cloudflare Pages（连 GitHub）：Build `npm run build`，Output `dist`，Node 见 `.node-version`。
