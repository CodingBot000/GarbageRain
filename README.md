# Scrap Rain Prototype

Phaser 3 + TypeScript + Vite 기반 2D 고철 수집 프로토타입입니다. `docs/phaser2d_scrap_wall_prototype_dev_spec_kr.md`의 MVP 범위를 구현합니다.

## 실행

```bash
npm install
npm run assets:pixel
npm run dev
```

브라우저에서 Vite가 출력한 로컬 주소를 엽니다. 이 프로젝트의 고정 개발 주소는 `http://127.0.0.1:35175`입니다.

## 조작

| 상황 | 입력 | 동작 |
|---|---|---|
| 외부 이동 | `W/S` 또는 `↑/↓` | 수거차 상하 이동 |
| 입구 진입 | `E` | 가까운 광산 입구로 진입 |
| 채굴 이동 | `WASD` 또는 방향키 | 작업자 슈트 이동 |
| 드릴 | `Space` 또는 마우스 좌클릭 | 바라보는 방향/마우스 방향 타일 채굴 |
| 반납/복귀 | 입구 근처 자동 반납, `R` | cargo 반납 후 외부 이동으로 복귀 |
| 방어 조준 | 마우스 | 터렛 조준 |
| 방어 사격 | 마우스 좌클릭 또는 `Space` | 탄 발사 |
| 업그레이드 | `1`~`5` | 업그레이드 구매 |
| 계속 진행 | `Enter`, `Esc`, `C` | 업그레이드 종료 후 외부 이동 |
| 디버그 | `F1` | 디버그 정보 표시 |
| 전체화면 | `F` | 전체화면 토글 |
| 재시작 | `Enter` | 게임오버 후 새 런 시작 |

## 현재 구현

- 외부 벽 이동 및 광산 입구 3개 표시
- 저해상도 픽셀 PNG 기반 타일, 아이템, 수거차, 작업자, 적, 탄환 표시
- 32 x 18 광산 타일 생성
- 작업자 슈트 이동, 충돌, 드릴 채굴
- 일반 고철, 회로 부품, 특수 합금 드롭/흡입/반납
- 웨이브 타이머와 지연 귀환 피해
- crawler, flyer, bomber 3종 방어전
- 터렛 조준/사격, 탄환 충돌
- 5종 업그레이드와 비용 체크
- 수거차 HP 0 게임오버 및 재시작
- `window.render_game_to_text()`와 `window.advanceTime(ms)` 검증 훅

## 임시 픽셀 에셋

에셋 원본은 `public/assets/pixel/`에 있습니다. `scripts/extract-generated-sheet-assets.sh`가 `assets/source/generated-image-1.png`에서 실제 사용 PNG들을 crop해서 재생성합니다.

## 남은 확장 후보

- 스프라이트/사운드 추가
- 영구 성장과 저장
- 광산 이벤트, 보스, 자동 터렛 같은 2차 콘텐츠
