export type GameState = 'WALL_TRAVEL' | 'MINING' | 'COMBAT' | 'UPGRADE' | 'RUN_END';

export type ResourceType = 'scrap' | 'circuit' | 'alloy';

export type Inventory = Record<ResourceType, number>;

export type Direction = 'up' | 'down' | 'left' | 'right';

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

export interface MineEntranceModel {
  id: string;
  label: string;
  wallY: number;
  biome: 'starter' | 'electronics' | 'industrial';
  difficulty: number;
}

export interface MineModel {
  id: string;
  biome: MineEntranceModel['biome'];
  difficulty: number;
  width: number;
  height: number;
  entrance: { x: number; y: number };
  tiles: TileModel[][];
  clearedRatio: number;
}

export interface BaseVehicleModel {
  hp: number;
  maxHp: number;
  wallY: number;
  moveSpeed: number;
  turretDamage: number;
  turretFireRateMs: number;
  isDocked: boolean;
}

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

export type EnemyType = 'crawler' | 'flyer' | 'bomber';

export interface EnemyModel {
  id: string;
  type: EnemyType;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  x: number;
  y: number;
  attackRange: number;
  attackCooldownMs: number;
  behavior: 'contact' | 'ranged' | 'suicide';
}

export interface ProjectileModel {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  owner: 'player' | 'enemy';
  ttlMs: number;
}

export interface ResourceDropModel {
  id: string;
  type: ResourceType;
  amount: number;
  x: number;
  y: number;
}

export interface UpgradeLevels {
  drillPower: number;
  moveSpeed: number;
  cargoCapacity: number;
  turretDamage: number;
  baseHp: number;
}

export interface GameModel {
  state: GameState;
  waveIndex: number;
  waveTimerMs: number;
  currentMineId: string | null;
  base: BaseVehicleModel;
  player: PlayerSuitModel;
  inventory: Inventory;
  mines: MineEntranceModel[];
  upgradeLevels: UpgradeLevels;
}
