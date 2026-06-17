Original prompt: docs에 md파일보고 개발진행해줘

# Progress

## 2026-06-18

- Read `docs/phaser2d_scrap_wall_prototype_dev_spec_kr.md`.
- Project was empty except for the design document, so a new Phaser 3 + TypeScript + Vite prototype is being created.
- Target scope is the MVP loop from the spec: wall travel, mine entry, mining, resource return, wave combat, upgrades, game over, restart.
- Created Vite + TypeScript + Phaser project files.
- Implemented the MVP loop in `src/game/scenes/GameScene.ts` with separated constants, types, data, and grid/math helpers.
- Added `window.render_game_to_text()` and `window.advanceTime(ms)` for deterministic browser checks.
- Added README with run instructions and controls.
- Added favicon so browser verification has no 404 console error.
- Build passed with `npm run build`.
- Ran the required web-game Playwright client:
  - `output/web-game/` verifies entry into the mine and nonblank canvas screenshots.
  - `output/web-game-mining/` verifies rightward drilling and `cargo.scrap=1`.
- Ran an additional Playwright CLI full-loop check:
  - Entered mine, mined 7 cargo, returned/deposited cargo, triggered combat, cleared wave 1, bought drill upgrade, continued to wave 2 wall travel.
  - Final screenshot: `output/playwright/full-loop-final.png`.

## TODO

- Tune combat/mining balance after hands-on playtesting.
- Consider splitting `GameScene` into the system/entity files listed in the design doc once behavior stabilizes.
- Add sprites, sound, persistence, and second-phase systems only after MVP feel is approved.

## 2026-06-18 Pixel Asset Pass

- User asked to replace placeholder graphics for tiles, items, vehicle, and units with low-resolution pixel 2D images.
- Generated deterministic temporary PNG assets in `public/assets/pixel/` with `scripts/generate-pixel-assets.mjs`.
- Added `npm run assets:pixel`.
- Replaced mine tiles, resource drops, entrance, wall chunks, vehicle, turret barrel, worker suit, enemies, and projectiles with Phaser image sprites.
- Enabled Phaser `pixelArt` and disabled antialiasing so scaled assets stay sharp.
- Verification:
  - `npm run build` passed.
  - Required web-game client passed and screenshot `output/web-game-pixel/shot-0.png` shows pixel mine assets.
  - Playwright combat screenshot `output/playwright/pixel-combat.png` shows pixel vehicle/enemies.
  - Full loop Playwright check passed after the visual replacement.
  - Browser console errors: 0.

## TODO After Pixel Asset Pass

- Add proper animation frames later; current assets are static temporary sprites.
- Replace deterministic placeholder PNGs with art-directed production sprites once the gameplay feel is approved.

## 2026-06-18 Asset Reload Fix

- User reported changed assets were not reflected after browser force reload.
- Found port confusion: `5173` belonged to another Vite project and another project was also listening around `5174`.
- Moved this project's dev server to fixed `http://127.0.0.1:5175` with `--strictPort`.
- User requested a much larger port jump instead of small increments; moved dev to `http://127.0.0.1:35175` and preview to `45175`.
- Added `PIXEL_ASSET_VERSION` query cache-busting to all Phaser image loads; the token changes on each page load.

## 2026-06-18 Generated Sheet Integration Fix

- User pointed out the generated sprite sheet image was not actually being used.
- Added `scripts/extract-generated-sheet-assets.sh` to crop the generated sprite sheet into `public/assets/pixel/*.png`.
- Updated `npm run assets:pixel` to extract from the generated sheet instead of creating separate placeholder art.
- Re-extracted assets and inspected `public/assets/pixel/_extracted_preview.png`.
- Verification:
  - `npm run build` passed.
  - Mine screenshot `output/web-game-generated-sheet/shot-0.png` shows generated sheet tiles, worker, and entrance-derived marker.
  - Combat screenshot `output/web-game-generated-combat/shot-0.png` shows generated sheet vehicle, enemies, and wall chunks.

## 2026-06-18 Mobile Landscape Fill

- User requested mobile landscape ratio support and full-screen landscape usage.
- Changed Phaser scale mode from `FIT` to `RESIZE`.
- Updated CSS so `#game` and `canvas` occupy `100vw x 100dvh` with touch scrolling disabled.
- Added camera resize handling in `GameScene`:
  - Canvas fills the viewport.
  - The 960x540 game world keeps its aspect ratio.
  - The camera centers and scales the world for the current viewport.
  - Background rendering fills the visible world bounds so wide mobile landscape screens do not show browser letterboxing.
- Updated pointer aiming/drilling to use world coordinates after camera scaling.
- Verification:
  - `npm run build` passed.
  - Playwright viewport `844x390`: canvas CSS and buffer both exactly `844x390`; screenshot `output/playwright/mobile-landscape-844x390.png`.
  - Playwright viewport `932x430`: canvas CSS and buffer both exactly `932x430`; screenshot `output/playwright/mobile-landscape-932x430.png`.
  - Required web-game client passed after resize changes; screenshot `output/web-game-responsive/shot-0.png`.
  - Browser console errors: 0.

## 2026-06-18 Mobile Touch Controls And Push Mining

- User requested that every action work on mobile touch and that blocks break by pushing into them, without requiring the attack/drill button.
- Added multi-pointer touch handling in `GameScene`:
  - Left virtual joystick for wall travel and mining movement.
  - Right action button for mine entry, manual drill, and combat fire.
  - Mining return button that exits near the entrance.
  - Tappable upgrade rows, continue area, and run-end restart area.
  - Field touch in mining/combat acts as aim + action.
- Changed mining collision behavior so failed movement into a solid tile calls the drill logic in the pushed direction, respecting the existing drill cooldown and drill power.
- Verification:
  - `npm run build` passed.
  - Required web-game client passed after the change; `output/web-game-touch-push-final/state-0.json` shows movement-only mining reached tile `tx=5` and collected `cargo.scrap=3`.
  - Mobile landscape Playwright flow at `844x390` verified touch mine entry, joystick push mining, touch exit near entrance, and combat field touch fire.
  - Screenshots: `output/playwright/mobile-touch-mining.png`, `output/playwright/mobile-touch-combat.png`, `output/playwright/mobile-touch-exit.png`.
  - Browser console errors: 0.
