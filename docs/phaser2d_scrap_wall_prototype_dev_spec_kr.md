# Phaser 2D Wall World식 고철 수집 프로토타입 개발상세기획서

**문서 목적:** Codex가 Phaser 기반 2D 프로토타입을 구현할 수 있도록 기능 범위, 파일 구조, 데이터 구조, 구현 순서, 검수 기준을 명확히 정의한다.  
**기획 기반:** Wall World 시스템 분석 기획서  
**중요 원칙:** Wall World의 고유 명칭, 세계관, 로보스파이더 디자인, UI, 아트, 레벨 구성을 복제하지 않는다. 본 프로토타입은 “채굴-귀환-방어-업그레이드”라는 구조만 참고한 고철 수집 게임이다.

---

## 1. 프로젝트 목표

Phaser 3 + TypeScript + Vite 기반으로, 브라우저에서 실행되는 2D 타일형 고철 수집 프로토타입을 만든다. 플레이어는 이동식 수거차를 고철더미 표면에 정박시키고, 작업자 슈트로 고철더미 내부를 파고 들어가 자원을 수집한다. 일정 시간이 지나면 경쟁 수거단/드론 웨이브가 수거차를 공격하므로, 플레이어는 수거차로 돌아와 방어해야 한다. 수집한 자원은 드릴, 이동속도, 적재량, 무기, 수거차 체력을 업그레이드하는 데 사용한다.

### 1.1 검증하고 싶은 핵심 재미

1. 타일을 뚫고 자원을 수집하는 기본 손맛
2. 더 깊이 들어갈수록 보상이 커지지만 귀환 위험도 커지는 구조
3. 웨이브 타이머로 생기는 “조금만 더 파기 vs 돌아가기” 판단
4. 채굴과 방어가 교대되며 반복 피로를 줄이는 리듬
5. 업그레이드가 다음 채굴/전투 효율을 분명히 바꾸는 성장감

---

## 2. 기술 스택

| 항목 | 선택 |
|---|---|
| 엔진 | Phaser 3 |
| 언어 | TypeScript |
| 빌드 | Vite |
| 렌더링 | Phaser WebGL/Canvas 자동 선택 |
| 아트 | 초기에는 도형/색상/텍스트 플레이스홀더 |
| 사운드 | 1차에서는 제외 또는 간단한 beep만 |
| 저장 | 1차에서는 메모리 상태만 사용. 2차에서 localStorage |
| 배포 | 정적 웹 빌드 가능 구조 |

### 2.1 개발 명령 예시

```bash
npm create vite@latest scrap-wall-prototype -- --template vanilla-ts
cd scrap-wall-prototype
npm install phaser
npm install -D vite typescript
npm run dev
```

기존 프로젝트가 있다면 위 명령을 새로 실행하지 말고 현재 구조에 Phaser 3와 TypeScript를 추가한다.

---

## 3. 프로토타입 범위

### 3.1 MVP 필수 구현

| 분류 | 기능 |
|---|---|
| 외부 이동 | 수거차가 고철더미 표면을 위/아래로 이동 |
| 입구 선택 | 여러 고철더미 진입 지점 중 하나 선택 |
| 채굴 | 작업자 슈트가 내부 타일을 드릴로 파괴 |
| 자원 | 일반 고철, 회로 부품, 특수 합금 수집 |
| 반납 | 수거차로 돌아오면 cargo가 inventory로 전환 |
| 타이머 | 웨이브 타이머가 채굴 중에도 감소 |
| 방어전 | 적 웨이브가 수거차를 공격하고 플레이어가 사격 |
| 업그레이드 | 드릴, 이동속도, 적재량, 터렛 공격력, 수거차 체력 강화 |
| 종료 | 수거차 HP가 0이면 게임오버, 재시작 가능 |

### 3.2 1차에서 제외

| 제외 기능 | 이유 |
|---|---|
| 보스전 | 핵심 루프 검증 전에는 구현 부담이 큼 |
| 영구 성장 | 밸런스와 저장 구조가 필요하므로 2차로 미룸 |
| 청사진/건물 | 자동 터렛, 수리소 등은 2차 확장 |
| 복잡한 바이옴 | 1차는 3개 구역만 사용 |
| 정교한 아트/애니메이션 | 프로토타입에서는 시스템 검증이 우선 |
| 멀티플레이 | 범위 초과 |

---

## 4. 게임 컨셉

### 4.1 가칭

**Scrap Rain: Wall Salvage Prototype**

### 4.2 배경

고철비가 쏟아진 뒤, 도시 외곽에는 거대한 고철더미 장벽이 형성된다. 플레이어는 이동식 고철 수거차와 작업자 슈트를 조종해 고철더미 내부를 파고 들어가 가치 있는 부품을 회수한다. 하지만 경쟁 수거단과 경비 드론도 같은 자원을 노리고 접근한다. 제한 시간 안에 수거차로 돌아와 방어하지 못하면 수거차가 파괴된다.

### 4.3 화면 방향

- 외부 화면: 수거차가 고철더미 벽의 왼쪽에 붙어 위/아래로 이동한다.
- 내부 화면: 수거차/입구가 왼쪽에 있고, 고철더미 내부는 오른쪽으로 확장된다.
- 사용자가 언급한 “로봇에서 나와 우측으로 벽을 뚫고 들어가는” 구도를 반영한다.

---

## 5. 핵심 게임 루프

```text
WALL_TRAVEL
  ↓ 광산 입구에서 E
MINING
  ↓ 웨이브 타이머 0 또는 수동 귀환
COMBAT
  ↓ 모든 적 처치
UPGRADE
  ↓ 업그레이드 종료
WALL_TRAVEL
```

### 5.1 상세 흐름

1. 플레이어는 외부 화면에서 수거차를 위/아래로 이동한다.
2. 고철더미 입구에 접근하면 `E` 키로 진입할 수 있다.
3. 내부 화면으로 전환되고 작업자 슈트가 입구에서 시작한다.
4. 플레이어는 방향키/WASD로 이동하고, 방향키/마우스 방향의 타일을 드릴로 파괴한다.
5. 타일 파괴 시 자원이 떨어지고, 플레이어가 접근하면 cargo에 들어간다.
6. cargo가 가득 차면 더 이상 자원을 담을 수 없다.
7. 수거차 입구로 돌아오면 cargo가 base inventory로 반납된다.
8. 웨이브 타이머가 0이 되면 적 웨이브가 시작된다.
9. 플레이어가 아직 내부에 있으면 수거차가 자동 피해를 입기 시작한다.
10. 수거차로 복귀하면 방어전 조작으로 전환된다.
11. 적을 모두 처치하면 업그레이드 패널을 열 수 있다.
12. 업그레이드 후 다음 입구를 선택해 반복한다.
13. 수거차 HP가 0이면 RUN_END 상태가 된다.

---

## 6. 조작 설계

| 상황 | 입력 | 동작 |
|---|---|---|
| 외부 이동 | W/S 또는 ↑/↓ | 수거차 위/아래 이동 |
| 입구 상호작용 | E | 고철더미 진입 |
| 내부 이동 | WASD 또는 방향키 | 작업자 이동 |
| 드릴 | Space 또는 마우스 좌클릭 | 바라보는 방향/마우스 방향 타일 채굴 |
| 자원 흡입 | 자동 | 일정 반경 내 자원 자동 수집 |
| 수동 귀환 | R | 입구 근처일 때 수거차로 복귀 |
| 방어 조준 | 마우스 | 터렛 방향 조준 |
| 방어 사격 | 마우스 좌클릭 또는 Space | 탄 발사 |
| 업그레이드 | 숫자 1~5 또는 클릭 | 업그레이드 구매 |
| 디버그 | F1 | 디버그 정보 토글 |
| 재시작 | Enter | 게임오버 후 재시작 |

---

## 7. 화면 레이아웃

### 7.1 기준 해상도

- 기본 해상도: `960 x 540`
- 타일 크기: `24px` 또는 `32px`
- MVP 추천: `24px`, 내부 광산 `32 x 18` 타일

### 7.2 외부 화면

```text
┌──────────────────────────────────────────────┐
│ HP 100/100 | Wave 48s | Scrap 12 Circuit 2  │
│                                              │
│      수거차                                  │
│        █                                   고철벽│
│        █──── 입구 A                         ███│
│        █                                   ███│
│        █──── 입구 B                         ███│
│        █                                   ███│
│        █──── 입구 C                         ███│
└──────────────────────────────────────────────┘
```

### 7.3 내부 채굴 화면

```text
┌──────────────────────────────────────────────┐
│ HP 100/100 | Wave 35s | Cargo 4/10          │
│                                              │
│ 입구  P  □  ■  ■  ◇  ■  ■  ■               │
│      □  □  ■  ■  ■  ◆  ■  ■               │
│      □  ■  ■  ◇  ■  ■  ■  ■               │
│                                              │
│ [R] 입구로 복귀 가능                         │
└──────────────────────────────────────────────┘
```

### 7.4 방어 화면

```text
┌──────────────────────────────────────────────┐
│ HP 78/100 | Enemies 8 | Wave 2              │
│                                              │
│ 적 →       적 →      수거차/터렛             │
│ 적 →                 █████                   │
│ 폭탄병 →             █████                   │
│                                              │
└──────────────────────────────────────────────┘
```

---

## 8. 프로젝트 파일 구조

Codex는 아래 구조를 기준으로 구현한다.

```text
scrap-wall-prototype/
  package.json
  index.html
  vite.config.ts
  tsconfig.json
  src/
    main.ts
    game/
      config.ts
      constants.ts
      types.ts
      scenes/
        BootScene.ts
        GameScene.ts
      entities/
        BaseVehicle.ts
        PlayerSuit.ts
        Enemy.ts
        Projectile.ts
        ResourceDrop.ts
      systems/
        WallTravelSystem.ts
        MineSystem.ts
        MiningSystem.ts
        WaveSystem.ts
        CombatSystem.ts
        UpgradeSystem.ts
        HUDSystem.ts
      data/
        upgrades.ts
        mines.ts
        enemies.ts
      utils/
        grid.ts
        math.ts
```

복잡도를 줄이기 위해 1차에서는 `GameScene` 하나에서 모든 상태를 관리해도 된다. 단, 파일은 위처럼 분리해 유지보수 가능하게 만든다.

---

## 9. 상태 머신 설계

### 9.1 GameState

```ts
export type GameState =
  | 'WALL_TRAVEL'
  | 'MINING'
  | 'COMBAT'
  | 'UPGRADE'
  | 'RUN_END';
```

### 9.2 상태 전환 규칙

| 현재 상태 | 다음 상태 | 조건 |
|---|---|---|
| WALL_TRAVEL | MINING | 입구 근처에서 E 입력 |
| MINING | COMBAT | waveTimer <= 0, 또는 플레이어가 복귀 후 웨이브 시작 |
| COMBAT | UPGRADE | 모든 적 처치 |
| UPGRADE | WALL_TRAVEL | 업그레이드 창 닫기 |
| 아무 상태 | RUN_END | baseVehicle.hp <= 0 |

### 9.3 update 루프 의사코드

```ts
update(time: number, delta: number) {
  if (state !== 'RUN_END' && state !== 'UPGRADE') {
    waveSystem.update(delta);
  }

  switch (state) {
    case 'WALL_TRAVEL':
      wallTravelSystem.update(delta);
      break;
    case 'MINING':
      miningSystem.update(delta);
      break;
    case 'COMBAT':
      combatSystem.update(delta);
      break;
    case 'UPGRADE':
      upgradeSystem.update(delta);
      break;
    case 'RUN_END':
      handleRestartInput();
      break;
  }

  hudSystem.update(gameModel);
}
```

---

## 10. 데이터 모델

### 10.1 GameModel

```ts
export interface GameModel {
  state: GameState;
  waveIndex: number;
  waveTimerMs: number;
  currentMineId: string | null;
  base: BaseVehicleModel;
  player: PlayerSuitModel;
  inventory: Inventory;
  mines: MineEntranceModel[];
}
```

### 10.2 BaseVehicleModel

```ts
export interface BaseVehicleModel {
  hp: number;
  maxHp: number;
  wallY: number;
  moveSpeed: number;
  turretDamage: number;
  turretFireRateMs: number;
  isDocked: boolean;
}
```

### 10.3 PlayerSuitModel

```ts
export interface PlayerSuitModel {
  x: number;
  y: number;
  moveSpeed: number;
  drillPower: number;
  drillCooldownMs: number;
  vacuumRange: number;
  cargo: Inventory;
  cargoCapacity: number;
  facing: Direction;
}
```

### 10.4 Inventory

```ts
export type ResourceType = 'scrap' | 'circuit' | 'alloy';

export type Inventory = Record<ResourceType, number>;
```

### 10.5 TileModel

```ts
export type TileType =
  | 'empty'
  | 'scrap'
  | 'denseScrap'
  | 'circuitWaste'
  | 'alloyChunk'
  | 'hardJunk';

export interface TileModel {
  type: TileType;
  hp: number;
  maxHp: number;
  solid: boolean;
  resourceType?: ResourceType;
  resourceAmount?: number;
  revealed: boolean;
}
```

### 10.6 MineModel

```ts
export interface MineModel {
  id: string;
  biome: 'starter' | 'electronics' | 'industrial';
  difficulty: number;
  width: number;
  height: number;
  entrance: { x: number; y: number };
  tiles: TileModel[][];
  clearedRatio: number;
}
```

### 10.7 EnemyModel

```ts
export type EnemyType = 'crawler' | 'flyer' | 'bomber';

export interface EnemyModel {
  id: string;
  type: EnemyType;
  hp: number;
  speed: number;
  damage: number;
  x: number;
  y: number;
  attackRange: number;
  behavior: 'contact' | 'ranged' | 'suicide';
}
```

---

## 11. 시스템 상세 설계

## 11.1 WallTravelSystem

### 책임

- 외부 화면에서 수거차의 수직 이동 처리
- 광산 입구와의 거리 계산
- 입구 진입 가능 UI 표시
- 선택한 입구의 MineModel 생성 또는 로드

### 구현 규칙

- `base.wallY`는 0~1000 사이 값으로 관리한다.
- 화면에서는 `wallY`를 카메라 위치 또는 입구 상대 위치로 변환한다.
- MVP에서는 카메라 스크롤 대신 수거차를 화면 중앙에 두고 입구 오브젝트를 상대 이동시켜도 된다.
- 입구와 `abs(base.wallY - entrance.wallY) < 30`이면 진입 가능하다.

### 입구 데이터 예시

```ts
export const MINE_ENTRANCES = [
  { id: 'mine-1', wallY: 200, biome: 'starter', difficulty: 1 },
  { id: 'mine-2', wallY: 420, biome: 'electronics', difficulty: 2 },
  { id: 'mine-3', wallY: 680, biome: 'industrial', difficulty: 3 },
];
```

---

## 11.2 MineSystem

### 책임

- 광산 타일 그리드 생성
- 타일 타입과 자원 배치
- 타일 파괴 처리
- 채굴 후 빈칸 반영
- 렌더링용 Graphics 갱신

### MVP 광산 생성 규칙

- 기본 크기: `32 x 18`
- 입구 위치: `(0, 9)`
- 입구 주변 2~3칸은 empty
- 깊이가 깊을수록 희귀 자원 확률 증가
- 난이도에 따라 hardJunk 비율 증가

### 타일 배치 의사코드

```ts
for y in 0..height:
  for x in 0..width:
    if x < 2 and abs(y - entranceY) <= 1:
      tile = empty
    else:
      depthFactor = x / width
      roll = random()
      if roll < rareChance(depthFactor, difficulty): alloyChunk
      else if roll < circuitChance(depthFactor, biome): circuitWaste
      else if roll < hardChance(difficulty): hardJunk
      else if roll < denseChance: denseScrap
      else scrap
```

### 렌더링 방식

Phaser Tilemap을 처음부터 쓰지 말고, `Graphics`로 타일 사각형을 그리는 방식을 권장한다. 이유는 다음과 같다.

- 타일 파괴 시 색상/상태 갱신이 쉽다.
- 외부 타일셋 이미지가 없어도 된다.
- 프로토타입 검증에 충분하다.

2차에서 아트가 생기면 Tilemap 또는 Sprite 기반으로 교체한다.

---

## 11.3 MiningSystem

### 책임

- 작업자 이동
- 충돌 처리
- 드릴 대상 타일 계산
- 타일 HP 감소
- 자원 드롭 생성
- 자원 자동 흡입
- 입구 복귀 처리

### 이동 규칙

- 플레이어는 empty 타일 위에서만 이동 가능하다.
- solid 타일과 충돌하면 이동하지 않는다.
- 이동은 픽셀 단위로 처리하되, 충돌 판정은 타일 좌표 기준으로 한다.

### 드릴 규칙

- 드릴 대상은 플레이어가 바라보는 방향의 인접 타일이다.
- 마우스 입력을 사용할 경우 플레이어 위치에서 마우스 방향을 계산해 상/하/좌/우 중 하나로 정규화한다.
- 드릴 쿨다운이 지나야 다음 채굴 가능하다.
- `tile.hp -= player.drillPower`
- hp가 0 이하가 되면 empty로 바뀌고 자원이 생성된다.

### 자원 수집 규칙

- ResourceDrop과 플레이어 거리가 `vacuumRange` 이하면 자동으로 플레이어에게 이동한다.
- cargo 총량이 capacity보다 작을 때만 획득된다.
- capacity를 초과하는 자원은 줍지 않는다.
- 수거차 입구에 닿으면 cargo를 base inventory로 전부 반납한다.

---

## 11.4 WaveSystem

### 책임

- 웨이브 타이머 감소
- 경고 단계 계산
- 웨이브 시작 이벤트 발행
- 웨이브 난이도 증가

### 기본 값

```ts
export const WAVE_CONFIG = {
  initialTimerMs: 60000,
  timerDecreasePerWaveMs: 3000,
  minTimerMs: 30000,
  warningMs: 15000,
};
```

### 동작 규칙

- `WALL_TRAVEL`, `MINING` 상태에서 타이머가 감소한다.
- `UPGRADE` 상태에서는 MVP 기준 타이머를 멈춘다.
- 타이머가 0이 되면 `COMBAT` 상태로 전환한다.
- 플레이어가 광산 내부에 있으면 수거차가 초당 피해를 받는다.
- 웨이브가 끝나면 다음 웨이브 타이머를 리셋한다.

### 늦은 귀환 페널티

```ts
if (state === 'COMBAT' && playerIsInMine) {
  base.hp -= lateReturnDamagePerSecond * deltaSeconds;
}
```

---

## 11.5 CombatSystem

### 책임

- 적 웨이브 생성
- 적 이동/공격 처리
- 터렛 조준/사격 처리
- 탄환 충돌 처리
- 웨이브 종료 판정

### 적 스폰 규칙

- 웨이브마다 적 수 증가
- 난이도에 따라 flyer와 bomber 비율 증가
- 적은 화면 왼쪽/위/아래 가장자리에서 생성되어 수거차를 향해 이동한다.

```ts
const enemyCount = 5 + waveIndex * 2;
```

### 적 유형

| 타입 | HP | 속도 | 피해 | 행동 |
|---|---:|---:|---:|---|
| crawler | 2 | 보통 | 5 | 수거차 접촉 |
| flyer | 1 | 빠름 | 3 | 일정 거리에서 탄 발사 |
| bomber | 1 | 매우 빠름 | 15 | 접촉 시 자폭 |

### 터렛

- 마우스 방향으로 조준한다.
- 좌클릭 또는 Space 입력으로 발사한다.
- fireRate 제한을 둔다.
- projectile은 직선 이동한다.
- 적과 충돌하면 damage만큼 HP 감소.

---

## 11.6 UpgradeSystem

### 책임

- 업그레이드 목록 표시
- 비용 체크
- 인벤토리 차감
- 능력치 반영
- 업그레이드 레벨 관리

### 업그레이드 데이터 예시

```ts
export interface UpgradeDefinition {
  id: string;
  name: string;
  maxLevel: number;
  getCost: (level: number) => Partial<Inventory>;
  apply: (model: GameModel) => void;
}
```

### 업그레이드 5종

| ID | 이름 | 효과 | 비용 예시 |
|---|---|---|---|
| drillPower | 드릴 출력 | drillPower +1 | scrap |
| moveSpeed | 슈트 기동성 | player.moveSpeed +10% | scrap + circuit |
| cargoCapacity | 적재 모듈 | cargoCapacity +5 | scrap |
| turretDamage | 터렛 화력 | turretDamage +1 | scrap + circuit |
| baseHp | 수거차 보강 | maxHp +20, hp +20 | scrap + alloy |

### UI 방식

- 방어전 종료 후 간단한 패널 표시
- 숫자 1~5로 구매 가능
- 비용 부족 시 빨간 텍스트 표시
- `Continue` 버튼 또는 `Esc`로 닫기

---

## 11.7 HUDSystem

### 표시 항목

| 항목 | 표시 예시 |
|---|---|
| 상태 | MODE: MINING |
| 수거차 체력 | HP 85/100 |
| 웨이브 타이머 | WAVE IN 32s |
| 자원 | Scrap 25 / Circuit 4 / Alloy 1 |
| cargo | Cargo 6/10 |
| 현재 광산 | Mine: Electronics-2 |
| 조작 힌트 | E: Enter, R: Return, Space: Drill |

### 경고 연출

- 웨이브 15초 이하: 타이머 텍스트 깜박임
- 웨이브 5초 이하: 화면 가장자리 빨간 테두리 또는 텍스트 경고
- 수거차 HP 30% 이하: HP 텍스트 경고

---

## 12. 밸런스 초기값

```ts
export const BALANCE = {
  screenWidth: 960,
  screenHeight: 540,
  tileSize: 24,
  mineWidth: 32,
  mineHeight: 18,

  baseMaxHp: 100,
  baseMoveSpeed: 160,
  baseTurretDamage: 1,
  baseTurretFireRateMs: 250,

  playerMoveSpeed: 130,
  playerDrillPower: 1,
  playerDrillCooldownMs: 220,
  playerVacuumRange: 48,
  playerCargoCapacity: 10,

  initialWaveTimerMs: 60000,
  lateReturnDamagePerSecond: 6,

  projectileSpeed: 420,
  resourceAttractSpeed: 180,
};
```

이 값은 프로토타입 기준이다. 첫 플레이가 답답하지 않아야 하므로 드릴 쿨다운과 이동속도는 너무 낮게 잡지 않는다.

---

## 13. 그래픽/아트 임시 규칙

1차에서는 모든 오브젝트를 도형으로 표현한다.

| 대상 | 표현 |
|---|---|
| 수거차 | 큰 사각형 + 바퀴/다리 느낌의 작은 사각형 |
| 작업자 | 작은 원 또는 사각형 |
| 일반 고철 타일 | 회색 사각형 |
| 회로 부품 타일 | 초록/청록 계열 사각형 |
| 특수 합금 타일 | 보라/금색 계열 사각형 |
| 적 | 빨간 도형, 타입별 모양 구분 |
| 탄환 | 작은 원 |
| 자원 드롭 | 작은 점/마름모 |

색상은 코드 상수로 관리한다. 나중에 스프라이트로 교체하기 쉽게 렌더링 코드를 시스템별로 분리한다.

---

## 14. 구현 단계

Codex는 아래 순서대로 구현한다. 한 번에 모든 기능을 만들지 말고, 각 단계가 동작하는지 확인한 뒤 다음 단계로 넘어간다.

### Step 1. 프로젝트 셋업

- Vite + TypeScript 프로젝트 구성
- Phaser 설치
- `GameScene` 표시
- 960x540 화면 생성
- 기본 배경과 HUD 텍스트 출력

**완료 기준:** 브라우저에서 Phaser 캔버스가 뜨고 FPS가 안정적으로 유지된다.

### Step 2. 상태 머신과 외부 이동

- `GameState` 정의
- `WALL_TRAVEL` 상태 구현
- 수거차 위/아래 이동
- 광산 입구 3개 표시
- 입구 근처에서 `E` 입력 시 `MINING` 전환

**완료 기준:** 수거차가 이동하고, 입구에서 채굴 화면으로 들어간다.

### Step 3. 광산 생성과 렌더링

- `MineModel`, `TileModel` 정의
- 32x18 타일 그리드 생성
- 입구 주변 empty 처리
- 타일 타입별 색상 렌더링

**완료 기준:** 내부 화면에서 고철더미 타일맵이 보인다.

### Step 4. 작업자 이동과 충돌

- `PlayerSuit` 구현
- WASD/방향키 이동
- empty 타일만 이동 가능
- solid 타일 충돌 처리

**완료 기준:** 작업자가 빈 공간을 이동하고 고철 타일을 통과하지 못한다.

### Step 5. 드릴 채굴

- Space/마우스 클릭으로 인접 타일 채굴
- 타일 HP 감소
- HP 0이면 empty로 변경
- 파괴 이펙트는 간단한 텍스트/깜박임으로 대체 가능

**완료 기준:** 플레이어가 우측/상하 방향으로 타일을 뚫으며 이동 공간을 만든다.

### Step 6. 자원 드롭/수집/반납

- 타일 파괴 시 ResourceDrop 생성
- 플레이어 반경 내 자동 흡입
- cargo capacity 적용
- 입구로 돌아오면 base inventory에 반납

**완료 기준:** 자원을 줍고 수거차에 반납하면 HUD 자원이 증가한다.

### Step 7. 웨이브 타이머

- HUD에 타이머 표시
- MINING 중에도 감소
- 15초 이하 경고 표시
- 0초가 되면 COMBAT 상태로 전환

**완료 기준:** 채굴 중 타이머가 압박을 만든다.

### Step 8. 방어전 기본 구현

- 적 스폰
- 적이 수거차로 이동
- 접촉 시 수거차 HP 감소
- 마우스 조준/사격
- 탄환 충돌로 적 제거

**완료 기준:** 적 웨이브를 막을 수 있고, 실패하면 HP가 줄어든다.

### Step 9. 웨이브 종료와 업그레이드

- 모든 적 제거 시 UPGRADE 상태
- 업그레이드 패널 표시
- 자원으로 5종 업그레이드 구매
- Continue 후 WALL_TRAVEL 복귀

**완료 기준:** 한 사이클이 완성된다.

### Step 10. 게임오버/재시작

- 수거차 HP 0이면 RUN_END
- 결과 텍스트 표시
- Enter로 새 게임 시작

**완료 기준:** 실패와 재시작 루프가 동작한다.

---

## 15. Codex 작업 지시 원칙

Codex에게 전달할 때는 다음 원칙을 강조한다.

1. **원작 복제 금지:** Wall World의 명칭, 로보스파이더, 아트, UI를 복제하지 말 것.
2. **MVP 우선:** 보스, 청사진, 영구 성장, 복잡한 바이옴은 구현하지 말 것.
3. **플레이 가능한 루프 우선:** 예쁜 코드보다 한 사이클이 실제로 돌아가는 것이 우선.
4. **타입 안정성:** TypeScript interface를 먼저 정의하고 시스템에서 사용.
5. **하드코딩 허용 범위:** 밸런스 수치는 `constants.ts`에 모으고, 임시 값 사용 가능.
6. **외부 에셋 금지:** 초기에는 도형과 텍스트만 사용.
7. **단계별 커밋:** 각 Step 완료 후 커밋 가능한 상태 유지.
8. **디버그 편의성:** F1로 현재 상태, 타이머, 적 수, cargo를 볼 수 있게 한다.

---

## 16. 테스트/검수 기준

### 16.1 기능 검수

| 항목 | 확인 방법 | 통과 기준 |
|---|---|---|
| 외부 이동 | W/S 입력 | 수거차가 위/아래로 이동 |
| 입구 진입 | 입구 근처 E | 내부 채굴 화면 전환 |
| 타일 충돌 | solid 타일로 이동 | 통과하지 못함 |
| 채굴 | Space/클릭 | 타일 HP 감소 후 empty 전환 |
| 자원 수집 | 자원 근처 이동 | cargo 증가 |
| 반납 | 입구 복귀 | inventory 증가, cargo 0 |
| 타이머 | 채굴 중 대기 | 시간이 줄어듦 |
| 웨이브 시작 | 타이머 0 | COMBAT 상태 전환 |
| 적 공격 | 적이 수거차 도달 | HP 감소 |
| 사격 | 마우스 조준/클릭 | 탄환 생성, 적 제거 |
| 업그레이드 | 자원 보유 후 구매 | 능력치 증가 |
| 게임오버 | HP 0 | RUN_END 표시 |

### 16.2 플레이 감각 검수

- 첫 1분 안에 최소 1회 채굴-자원수집-반납을 경험해야 한다.
- 웨이브 타이머 15초 이하에서 귀환 판단이 필요해야 한다.
- 첫 웨이브는 초보자도 막을 수 있어야 한다.
- 두 번째 웨이브부터는 업그레이드 선택이 체감되어야 한다.
- 드릴 기본 속도가 너무 느려 답답하지 않아야 한다.

---

## 17. 2차 확장 후보

MVP가 동작한 뒤에만 아래 기능을 추가한다.

| 기능 | 설명 |
|---|---|
| 영구 성장 | 런 종료 후 남는 장비 개조 |
| 청사진 | 광산 깊은 곳에서 새 장비 해금 |
| 자동 터렛 | 수거차 주변 자동 방어 |
| 수리 스테이션 | 웨이브 후 HP 회복 |
| 자원 수확기 | 정박한 광산에서 시간당 자원 획득 |
| 보스/엘리트 웨이브 | 장기 타이머 압박 |
| 바이옴 확장 | 전자폐기물, 산업잔해, 독성폐기물 등 |
| 경쟁자 AI | 고철을 먼저 훔쳐가는 라이벌 |
| 이벤트 | 고철더미 붕괴, 폭발성 배터리, 희귀 부품 신호 |
| 세이브 | localStorage 기반 진행 저장 |

---

## 18. 개발 리스크와 대응

| 리스크 | 문제 | 대응 |
|---|---|---|
| 범위 과다 | 보스/청사진까지 넣으면 미완성 위험 | MVP 범위 엄격히 제한 |
| 원작 유사성 과다 | IP/차별성 문제 | 소재, 명칭, UI, 아트 전부 고철 게임화 |
| 채굴 답답함 | 초반 이탈 | 기본 드릴/이동속도 높게 시작 |
| 전투 단조로움 | 방어전 반복 피로 | 적 3종으로 우선순위 제공 |
| 타일 렌더링 복잡 | Tilemap 업데이트 부담 | Graphics 기반 그리드로 시작 |
| 밸런스 불안정 | 너무 쉽거나 어려움 | constants.ts에 수치 집중, 빠른 조정 가능하게 함 |

---

## 19. Codex에게 줄 1차 작업 요청문 예시

아래 문구를 Codex 첫 지시로 사용할 수 있다.

```text
Phaser 3 + TypeScript + Vite 기반으로 2D 고철 수집 프로토타입을 구현해줘.
첨부한 개발상세기획서의 MVP 범위만 구현한다.
Wall World의 고유 명칭/아트/세계관/UI를 복제하지 말고, 고철 수거차와 고철더미 내부 채굴이라는 독자 소재로 구현한다.
우선 Step 1~Step 5까지 구현해서 외부 이동, 입구 진입, 광산 타일 생성, 작업자 이동, 드릴 채굴이 동작하게 만들어라.
외부 에셋은 사용하지 말고 Phaser Graphics 도형과 텍스트로만 표현한다.
TypeScript 타입을 먼저 정의하고, constants.ts에 밸런스 수치를 모아라.
구현 후 실행 방법과 현재 구현된 기능, 남은 기능을 README에 정리해라.
```

Step 1~5가 안정적으로 동작하면 다음 지시로 Step 6~10을 요청한다.

---

## 20. 최종 완료 기준

MVP 완료 상태는 다음을 모두 만족해야 한다.

1. 브라우저에서 실행 가능하다.
2. 외부 이동 → 채굴 진입 → 타일 채굴 → 자원 수집 → 반납 → 웨이브 방어 → 업그레이드 → 다음 이동의 한 사이클이 가능하다.
3. 수거차 HP가 0이 되면 게임오버가 발생한다.
4. 자원 3종과 업그레이드 5종이 동작한다.
5. 적 3종이 구분되어 등장한다.
6. 웨이브 타이머가 채굴 중 계속 감소한다.
7. 코드가 TypeScript 타입 오류 없이 빌드된다.
8. README에 실행 방법과 조작법이 포함된다.

---

## 21. 첨부 권장 문서

Codex에게는 이 개발상세기획서를 반드시 첨부한다. 또한 기획 의도나 Wall World식 루프의 근거가 필요하면 **Wall World 시스템 분석 기획서**도 함께 첨부한다. 특히 Codex가 범위를 과하게 넓히거나 원작 형태를 너무 그대로 따라가려 할 경우, 분석기획서의 “고철 수집 게임으로의 치환 설계”, “MVP 범위”, “장점과 위험 요소” 섹션을 같이 참조시키는 것이 좋다.
