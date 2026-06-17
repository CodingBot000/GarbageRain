import Phaser from 'phaser';
import { ASSET_KEYS, dropTextureKey, enemyTextureKey, preloadPixelAssets, tileTextureKey } from '../assets';
import { BALANCE, COLORS } from '../constants';
import { ENEMY_TEMPLATES } from '../data/enemies';
import { MINE_ENTRANCES } from '../data/mines';
import { UPGRADE_DEFINITIONS } from '../data/upgrades';
import type {
  Direction,
  EnemyModel,
  GameModel,
  GameState,
  Inventory,
  MineEntranceModel,
  MineModel,
  ProjectileModel,
  ResourceDropModel,
  ResourceType,
  TileModel,
  TileType,
  UpgradeLevels,
} from '../types';
import { tileToWorld, worldToTile } from '../utils/grid';
import { clamp, distance, normalize } from '../utils/math';

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => void;
  }
}

type KeyMap = Record<
  | 'w'
  | 'a'
  | 's'
  | 'd'
  | 'e'
  | 'r'
  | 'space'
  | 'one'
  | 'two'
  | 'three'
  | 'four'
  | 'five'
  | 'esc'
  | 'enter'
  | 'c'
  | 'f'
  | 'f1',
  Phaser.Input.Keyboard.Key
>;

const RESOURCE_ORDER: ResourceType[] = ['scrap', 'circuit', 'alloy'];
const MAX_DROPS = 80;
const MAX_ENEMIES = 80;
const MAX_PROJECTILES = 120;
const WALL_CHUNK_COUNT = 64;

export class GameScene extends Phaser.Scene {
  private model!: GameModel;
  private graphics!: Phaser.GameObjects.Graphics;
  private overlayGraphics!: Phaser.GameObjects.Graphics;
  private hudText!: Phaser.GameObjects.Text;
  private helpText!: Phaser.GameObjects.Text;
  private panelText!: Phaser.GameObjects.Text;
  private debugText!: Phaser.GameObjects.Text;
  private tileImages: Phaser.GameObjects.Image[] = [];
  private wallChunkImages: Phaser.GameObjects.Image[] = [];
  private entranceImages: Phaser.GameObjects.Image[] = [];
  private dropImages: Phaser.GameObjects.Image[] = [];
  private enemyImages: Phaser.GameObjects.Image[] = [];
  private projectileImages: Phaser.GameObjects.Image[] = [];
  private playerImage!: Phaser.GameObjects.Image;
  private travelTruckImage!: Phaser.GameObjects.Image;
  private combatTruckImage!: Phaser.GameObjects.Image;
  private turretBarrelImage!: Phaser.GameObjects.Image;
  private keys!: KeyMap;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private currentMine: MineModel | null = null;
  private mineCache = new Map<string, MineModel>();
  private resourceDrops: ResourceDropModel[] = [];
  private enemies: EnemyModel[] = [];
  private projectiles: ProjectileModel[] = [];
  private drillCooldownMs = 0;
  private turretCooldownMs = 0;
  private lateReturnMs = 0;
  private debugVisible = false;
  private upgradeMessage = '';
  private upgradeMessageMs = 0;
  private dropSeq = 0;
  private enemySeq = 0;
  private projectileSeq = 0;

  constructor() {
    super('GameScene');
  }

  preload(): void {
    preloadPixelAssets(this);
  }

  create(): void {
    this.graphics = this.add.graphics();
    this.graphics.setDepth(0);
    this.overlayGraphics = this.add.graphics();
    this.overlayGraphics.setDepth(12);
    this.hudText = this.add.text(14, 12, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: COLORS.text,
    });
    this.helpText = this.add.text(14, BALANCE.screenHeight - 26, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: COLORS.mutedText,
    });
    this.panelText = this.add.text(0, 0, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: COLORS.text,
      lineSpacing: 6,
    });
    this.debugText = this.add.text(14, 82, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#b6d7ff',
    });
    this.hudText.setDepth(20);
    this.helpText.setDepth(20);
    this.panelText.setDepth(20);
    this.debugText.setDepth(20);
    this.createPixelSpriteLayers();

    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is required for this prototype.');
    }

    this.cursors = keyboard.createCursorKeys();
    this.keys = {
      w: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      e: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      r: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R),
      space: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      one: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      two: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      three: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
      four: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR),
      five: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FIVE),
      esc: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
      enter: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
      c: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C),
      f: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F),
      f1: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F1),
    };
    keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
    ]);

    this.resetRun();
    window.render_game_to_text = () => this.renderGameToText();
    window.advanceTime = (ms: number) => {
      this.stepTime(ms);
      this.renderScene();
    };
    this.scale.on('resize', this.resizeGameView, this);
    this.resizeGameView();
    this.renderScene();
  }

  update(_time: number, delta: number): void {
    this.stepTime(Math.min(delta, 100));
    this.renderScene();
  }

  private resetRun(): void {
    this.model = {
      state: 'WALL_TRAVEL',
      waveIndex: 1,
      waveTimerMs: BALANCE.initialWaveTimerMs,
      currentMineId: null,
      base: {
        hp: BALANCE.baseMaxHp,
        maxHp: BALANCE.baseMaxHp,
        wallY: MINE_ENTRANCES[0].wallY,
        moveSpeed: BALANCE.baseMoveSpeed,
        turretDamage: BALANCE.baseTurretDamage,
        turretFireRateMs: BALANCE.baseTurretFireRateMs,
        isDocked: false,
      },
      player: {
        x: 0,
        y: 0,
        moveSpeed: BALANCE.playerMoveSpeed,
        drillPower: BALANCE.playerDrillPower,
        drillCooldownMs: BALANCE.playerDrillCooldownMs,
        vacuumRange: BALANCE.playerVacuumRange,
        cargo: emptyInventory(),
        cargoCapacity: BALANCE.playerCargoCapacity,
        facing: 'right',
      },
      inventory: emptyInventory(),
      mines: MINE_ENTRANCES,
      upgradeLevels: {
        drillPower: 0,
        moveSpeed: 0,
        cargoCapacity: 0,
        turretDamage: 0,
        baseHp: 0,
      },
    };
    this.currentMine = null;
    this.resourceDrops = [];
    this.enemies = [];
    this.projectiles = [];
    this.drillCooldownMs = 0;
    this.turretCooldownMs = 0;
    this.lateReturnMs = 0;
    this.upgradeMessage = '';
    this.upgradeMessageMs = 0;
    this.dropSeq = 0;
    this.enemySeq = 0;
    this.projectileSeq = 0;
  }

  private stepTime(ms: number): void {
    const steps = Math.max(1, Math.ceil(ms / (1000 / 60)));
    const dtMs = ms / steps;

    for (let i = 0; i < steps; i += 1) {
      this.updateOneStep(dtMs);
    }
  }

  private updateOneStep(dtMs: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.keys.f1)) {
      this.debugVisible = !this.debugVisible;
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.f)) {
      this.toggleFullscreen();
    }

    if (this.model.state === 'RUN_END') {
      if (Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
        this.resetRun();
      }
      return;
    }

    if (this.model.state !== 'UPGRADE') {
      this.model.base.hp = clamp(this.model.base.hp, 0, this.model.base.maxHp);
      if (this.model.base.hp <= 0) {
        this.enterRunEnd();
        return;
      }
    }

    if (this.model.state === 'WALL_TRAVEL' || this.model.state === 'MINING') {
      this.model.waveTimerMs -= dtMs;
      if (this.model.waveTimerMs <= 0) {
        this.startCombat();
      }
    }

    this.drillCooldownMs = Math.max(0, this.drillCooldownMs - dtMs);
    this.turretCooldownMs = Math.max(0, this.turretCooldownMs - dtMs);
    this.upgradeMessageMs = Math.max(0, this.upgradeMessageMs - dtMs);

    switch (this.model.state) {
      case 'WALL_TRAVEL':
        this.updateWallTravel(dtMs);
        break;
      case 'MINING':
        this.updateMining(dtMs);
        break;
      case 'COMBAT':
        this.updateCombat(dtMs);
        break;
      case 'UPGRADE':
        this.updateUpgrade();
        break;
    }

    if (this.model.base.hp <= 0) {
      this.enterRunEnd();
    }
  }

  private updateWallTravel(dtMs: number): void {
    const dir = boolToAxis(this.keys.s.isDown || this.cursors.down.isDown, this.keys.w.isDown || this.cursors.up.isDown);
    this.model.base.wallY = clamp(
      this.model.base.wallY + dir * this.model.base.moveSpeed * (dtMs / 1000),
      80,
      780,
    );

    const entrance = this.getNearestEntrance();
    const confirmsEntry = Phaser.Input.Keyboard.JustDown(this.keys.e) || Phaser.Input.Keyboard.JustDown(this.keys.space);
    if (entrance && Math.abs(this.model.base.wallY - entrance.wallY) < 30 && confirmsEntry) {
      this.enterMine(entrance);
    }
  }

  private updateMining(dtMs: number): void {
    if (!this.currentMine) {
      this.model.state = 'WALL_TRAVEL';
      return;
    }

    const horizontal = boolToAxis(this.keys.d.isDown || this.cursors.right.isDown, this.keys.a.isDown || this.cursors.left.isDown);
    const vertical = boolToAxis(this.keys.s.isDown || this.cursors.down.isDown, this.keys.w.isDown || this.cursors.up.isDown);
    const move = normalize(horizontal, vertical);
    const wantsMove = horizontal !== 0 || vertical !== 0;
    if (wantsMove) {
      if (Math.abs(horizontal) > Math.abs(vertical)) {
        this.model.player.facing = horizontal > 0 ? 'right' : 'left';
      } else {
        this.model.player.facing = vertical > 0 ? 'down' : 'up';
      }
      const amount = this.model.player.moveSpeed * (dtMs / 1000);
      this.movePlayer(move.x * amount, 0);
      this.movePlayer(0, move.y * amount);
    }

    if ((this.keys.space.isDown || this.input.activePointer.isDown) && this.drillCooldownMs <= 0) {
      this.drill();
    }

    this.updateDrops(dtMs);
    this.depositCargoIfAtEntrance();

    const entrance = tileToWorld(this.currentMine.entrance.x, this.currentMine.entrance.y);
    if (distance(this.model.player.x, this.model.player.y, entrance.x, entrance.y) < 34 && Phaser.Input.Keyboard.JustDown(this.keys.r)) {
      this.depositCargo();
      this.model.state = 'WALL_TRAVEL';
      this.model.currentMineId = null;
      this.currentMine = null;
      this.resourceDrops = [];
      this.model.base.isDocked = false;
    }
  }

  private updateCombat(dtMs: number): void {
    const dt = dtMs / 1000;

    if (this.lateReturnMs > 0) {
      this.lateReturnMs = Math.max(0, this.lateReturnMs - dtMs);
      this.model.base.hp -= BALANCE.lateReturnDamagePerSecond * dt;
      if (this.lateReturnMs <= 0) {
        this.depositCargo();
      }
    }

    if (this.lateReturnMs <= 0 && (this.input.activePointer.isDown || this.keys.space.isDown) && this.turretCooldownMs <= 0) {
      this.fireTurret();
    }

    for (const enemy of this.enemies) {
      enemy.attackCooldownMs = Math.max(0, enemy.attackCooldownMs - dtMs);
      const targetX = BALANCE.combatTruckX;
      const targetY = BALANCE.combatTruckY;
      const toBase = normalize(targetX - enemy.x, targetY - enemy.y);
      const dist = distance(enemy.x, enemy.y, targetX, targetY);

      if (enemy.behavior === 'ranged' && dist <= enemy.attackRange) {
        if (enemy.attackCooldownMs <= 0) {
          this.fireEnemyProjectile(enemy);
          enemy.attackCooldownMs = 1150;
        }
      } else if (dist <= enemy.attackRange) {
        if (enemy.behavior === 'suicide') {
          this.model.base.hp -= enemy.damage;
          enemy.hp = 0;
        } else if (enemy.attackCooldownMs <= 0) {
          this.model.base.hp -= enemy.damage;
          enemy.attackCooldownMs = 850;
        }
      } else {
        enemy.x += toBase.x * enemy.speed * dt;
        enemy.y += toBase.y * enemy.speed * dt;
      }
    }

    this.updateProjectiles(dtMs);
    this.enemies = this.enemies.filter((enemy) => enemy.hp > 0);

    if (this.enemies.length === 0 && this.model.state === 'COMBAT') {
      this.model.state = 'UPGRADE';
      this.model.waveIndex += 1;
      this.projectiles = this.projectiles.filter((projectile) => projectile.owner === 'player');
      this.upgradeMessage = 'Wave cleared. Buy upgrades or continue.';
      this.upgradeMessageMs = 2500;
    }
  }

  private updateUpgrade(): void {
    const numberKeys = [this.keys.one, this.keys.two, this.keys.three, this.keys.four, this.keys.five];
    for (let i = 0; i < numberKeys.length; i += 1) {
      if (Phaser.Input.Keyboard.JustDown(numberKeys[i])) {
        this.tryBuyUpgrade(i);
      }
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.keys.enter) ||
      Phaser.Input.Keyboard.JustDown(this.keys.esc) ||
      Phaser.Input.Keyboard.JustDown(this.keys.c)
    ) {
      this.model.state = 'WALL_TRAVEL';
      this.model.currentMineId = null;
      this.currentMine = null;
      this.model.base.isDocked = false;
      this.resourceDrops = [];
      this.projectiles = [];
      this.lateReturnMs = 0;
      this.model.waveTimerMs = Math.max(
        BALANCE.minWaveTimerMs,
        BALANCE.initialWaveTimerMs - (this.model.waveIndex - 1) * BALANCE.timerDecreasePerWaveMs,
      );
    }
  }

  private enterMine(entrance: MineEntranceModel): void {
    let mine = this.mineCache.get(entrance.id);
    if (!mine) {
      mine = this.generateMine(entrance);
      this.mineCache.set(entrance.id, mine);
    }

    this.currentMine = mine;
    this.model.currentMineId = entrance.id;
    this.model.state = 'MINING';
    this.model.base.isDocked = true;
    this.resourceDrops = [];
    this.projectiles = [];

    const start = tileToWorld(mine.entrance.x + 1, mine.entrance.y);
    this.model.player.x = start.x;
    this.model.player.y = start.y;
    this.model.player.facing = 'right';
  }

  private startCombat(): void {
    if (this.model.state === 'COMBAT' || this.model.state === 'UPGRADE' || this.model.state === 'RUN_END') {
      return;
    }

    if (this.model.state === 'MINING' && this.currentMine) {
      const entrance = tileToWorld(this.currentMine.entrance.x, this.currentMine.entrance.y);
      const runBackDistance = distance(this.model.player.x, this.model.player.y, entrance.x, entrance.y);
      this.lateReturnMs = runBackDistance < 50 ? 0 : clamp(900 + runBackDistance * 14, 900, 9000);
      if (this.lateReturnMs <= 0) {
        this.depositCargo();
      }
    } else {
      this.lateReturnMs = 0;
    }

    this.model.state = 'COMBAT';
    this.model.waveTimerMs = 0;
    this.resourceDrops = [];
    this.projectiles = [];
    this.enemies = this.spawnWave();
  }

  private enterRunEnd(): void {
    this.model.state = 'RUN_END';
    this.model.base.hp = 0;
    this.enemies = [];
    this.projectiles = [];
    this.resourceDrops = [];
  }

  private generateMine(entrance: MineEntranceModel): MineModel {
    const width = BALANCE.mineWidth;
    const height = BALANCE.mineHeight;
    const entranceTile = { x: 0, y: Math.floor(height / 2) };
    const tiles: TileModel[][] = [];

    for (let y = 0; y < height; y += 1) {
      const row: TileModel[] = [];
      for (let x = 0; x < width; x += 1) {
        if (x < 3 && Math.abs(y - entranceTile.y) <= 1) {
          row.push(createTile('empty'));
          continue;
        }

        const depth = x / width;
        const roll = seededRandom(`${entrance.id}:${x}:${y}`);
        const rareChance = 0.018 + depth * 0.075 + entrance.difficulty * 0.006;
        const circuitChance = entrance.biome === 'electronics' ? 0.13 + depth * 0.08 : 0.055 + depth * 0.05;
        const hardChance = 0.035 + entrance.difficulty * 0.035 + depth * 0.035;
        const denseChance = 0.26 + depth * 0.24;

        if (roll < rareChance) {
          row.push(createTile('alloyChunk'));
        } else if (roll < rareChance + circuitChance) {
          row.push(createTile('circuitWaste'));
        } else if (roll < rareChance + circuitChance + hardChance) {
          row.push(createTile('hardJunk'));
        } else if (roll < rareChance + circuitChance + hardChance + denseChance) {
          row.push(createTile('denseScrap'));
        } else {
          row.push(createTile('scrap'));
        }
      }
      tiles.push(row);
    }

    return {
      id: entrance.id,
      biome: entrance.biome,
      difficulty: entrance.difficulty,
      width,
      height,
      entrance: entranceTile,
      tiles,
      clearedRatio: 0,
    };
  }

  private movePlayer(dx: number, dy: number): void {
    if (!this.currentMine) {
      return;
    }
    const nextX = this.model.player.x + dx;
    const nextY = this.model.player.y + dy;
    if (this.canOccupy(nextX, nextY)) {
      this.model.player.x = nextX;
      this.model.player.y = nextY;
    }
  }

  private canOccupy(x: number, y: number): boolean {
    if (!this.currentMine) {
      return false;
    }

    const radius = 7;
    const samples = [
      { x: x - radius, y: y - radius },
      { x: x + radius, y: y - radius },
      { x: x - radius, y: y + radius },
      { x: x + radius, y: y + radius },
    ];

    return samples.every((sample) => {
      const { tx, ty } = worldToTile(sample.x, sample.y);
      if (tx < 0 || ty < 0 || tx >= this.currentMine!.width || ty >= this.currentMine!.height) {
        return false;
      }
      return !this.currentMine!.tiles[ty][tx].solid;
    });
  }

  private drill(): void {
    if (!this.currentMine) {
      return;
    }

    if (this.input.activePointer.isDown) {
      this.model.player.facing = this.directionFromPointer(this.model.player.x, this.model.player.y);
    }

    const { tx, ty } = worldToTile(this.model.player.x, this.model.player.y);
    const target = targetFromDirection(tx, ty, this.model.player.facing);
    if (target.tx < 0 || target.ty < 0 || target.tx >= this.currentMine.width || target.ty >= this.currentMine.height) {
      this.drillCooldownMs = this.model.player.drillCooldownMs;
      return;
    }

    const tile = this.currentMine.tiles[target.ty][target.tx];
    if (tile.solid) {
      tile.hp -= this.model.player.drillPower;
      if (tile.hp <= 0) {
        this.destroyTile(target.tx, target.ty, tile);
      }
    }
    this.drillCooldownMs = this.model.player.drillCooldownMs;
  }

  private destroyTile(tx: number, ty: number, tile: TileModel): void {
    if (!this.currentMine) {
      return;
    }

    this.currentMine.tiles[ty][tx] = createTile('empty');
    this.currentMine.clearedRatio = this.calculateClearedRatio(this.currentMine);
    if (tile.resourceType && tile.resourceAmount) {
      const world = tileToWorld(tx, ty);
      this.resourceDrops.push({
        id: `drop-${this.dropSeq++}`,
        type: tile.resourceType,
        amount: tile.resourceAmount,
        x: world.x,
        y: world.y,
      });
    }
  }

  private updateDrops(dtMs: number): void {
    const dt = dtMs / 1000;
    const player = this.model.player;

    for (const drop of this.resourceDrops) {
      const dist = distance(drop.x, drop.y, player.x, player.y);
      if (dist <= player.vacuumRange && cargoTotal(player.cargo) + drop.amount <= player.cargoCapacity) {
        const dir = normalize(player.x - drop.x, player.y - drop.y);
        drop.x += dir.x * BALANCE.resourceAttractSpeed * dt;
        drop.y += dir.y * BALANCE.resourceAttractSpeed * dt;
      }
    }

    this.resourceDrops = this.resourceDrops.filter((drop) => {
      if (distance(drop.x, drop.y, player.x, player.y) < 12 && cargoTotal(player.cargo) + drop.amount <= player.cargoCapacity) {
        player.cargo[drop.type] += drop.amount;
        return false;
      }
      return true;
    });
  }

  private depositCargoIfAtEntrance(): void {
    if (!this.currentMine || cargoTotal(this.model.player.cargo) === 0) {
      return;
    }
    const entrance = tileToWorld(this.currentMine.entrance.x + 1, this.currentMine.entrance.y);
    if (distance(this.model.player.x, this.model.player.y, entrance.x, entrance.y) < 28) {
      this.depositCargo();
    }
  }

  private depositCargo(): void {
    for (const type of RESOURCE_ORDER) {
      this.model.inventory[type] += this.model.player.cargo[type];
      this.model.player.cargo[type] = 0;
    }
  }

  private spawnWave(): EnemyModel[] {
    const count = 5 + this.model.waveIndex * 2;
    const enemies: EnemyModel[] = [];
    for (let i = 0; i < count; i += 1) {
      const type = this.pickEnemyType(i);
      const template = ENEMY_TEMPLATES[type];
      const lane = i % 3;
      const spawnX = -30 - i * 26;
      const spawnY = lane === 0 ? 132 + i * 9 : lane === 1 ? 270 + (i % 4) * 18 : 410 - i * 7;
      enemies.push({
        id: `enemy-${this.enemySeq++}`,
        type,
        hp: template.hp + Math.floor(this.model.waveIndex / 4),
        maxHp: template.hp + Math.floor(this.model.waveIndex / 4),
        speed: template.speed + this.model.waveIndex * 2,
        damage: template.damage,
        x: spawnX,
        y: clamp(spawnY, 78, 470),
        attackRange: template.attackRange,
        attackCooldownMs: 300 + i * 80,
        behavior: template.behavior,
      });
    }
    return enemies;
  }

  private pickEnemyType(index: number): EnemyModel['type'] {
    if (this.model.waveIndex >= 3 && index % 5 === 4) {
      return 'bomber';
    }
    if (this.model.waveIndex >= 2 && index % 3 === 2) {
      return 'flyer';
    }
    return 'crawler';
  }

  private fireTurret(): void {
    const pointer = this.pointerWorldPosition();
    const dir = normalize(pointer.x - BALANCE.combatTruckX, pointer.y - BALANCE.combatTruckY);
    this.projectiles.push({
      id: `projectile-${this.projectileSeq++}`,
      x: BALANCE.combatTruckX - 34,
      y: BALANCE.combatTruckY,
      vx: dir.x * BALANCE.projectileSpeed,
      vy: dir.y * BALANCE.projectileSpeed,
      damage: this.model.base.turretDamage,
      owner: 'player',
      ttlMs: 1400,
    });
    this.turretCooldownMs = this.model.base.turretFireRateMs;
  }

  private fireEnemyProjectile(enemy: EnemyModel): void {
    const dir = normalize(BALANCE.combatTruckX - enemy.x, BALANCE.combatTruckY - enemy.y);
    this.projectiles.push({
      id: `enemy-shot-${this.projectileSeq++}`,
      x: enemy.x,
      y: enemy.y,
      vx: dir.x * BALANCE.enemyProjectileSpeed,
      vy: dir.y * BALANCE.enemyProjectileSpeed,
      damage: enemy.damage,
      owner: 'enemy',
      ttlMs: 2000,
    });
  }

  private updateProjectiles(dtMs: number): void {
    const dt = dtMs / 1000;
    for (const projectile of this.projectiles) {
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      projectile.ttlMs -= dtMs;

      if (projectile.owner === 'player') {
        for (const enemy of this.enemies) {
          if (enemy.hp > 0 && distance(projectile.x, projectile.y, enemy.x, enemy.y) < 18) {
            enemy.hp -= projectile.damage;
            projectile.ttlMs = 0;
            break;
          }
        }
      } else if (distance(projectile.x, projectile.y, BALANCE.combatTruckX, BALANCE.combatTruckY) < 34) {
        this.model.base.hp -= projectile.damage;
        projectile.ttlMs = 0;
      }
    }

    this.projectiles = this.projectiles.filter(
      (projectile) =>
        projectile.ttlMs > 0 &&
        projectile.x > -80 &&
        projectile.x < BALANCE.screenWidth + 80 &&
        projectile.y > -80 &&
        projectile.y < BALANCE.screenHeight + 80,
    );
  }

  private tryBuyUpgrade(index: number): void {
    const upgrade = UPGRADE_DEFINITIONS[index];
    const level = this.model.upgradeLevels[upgrade.id];
    if (level >= upgrade.maxLevel) {
      this.setUpgradeMessage(`${upgrade.name} is already maxed.`, true);
      return;
    }

    const cost = upgrade.getCost(level);
    if (!canAfford(this.model.inventory, cost)) {
      this.setUpgradeMessage(`Not enough resources for ${upgrade.name}.`, true);
      return;
    }

    payCost(this.model.inventory, cost);
    upgrade.apply(this.model);
    this.model.upgradeLevels[upgrade.id] += 1;
    this.setUpgradeMessage(`${upgrade.name} upgraded.`, false);
  }

  private setUpgradeMessage(message: string, isWarning: boolean): void {
    this.upgradeMessage = isWarning ? `! ${message}` : message;
    this.upgradeMessageMs = 2200;
  }

  private getNearestEntrance(): MineEntranceModel | null {
    let nearest: MineEntranceModel | null = null;
    let best = Number.POSITIVE_INFINITY;
    for (const entrance of this.model.mines) {
      const dist = Math.abs(this.model.base.wallY - entrance.wallY);
      if (dist < best) {
        nearest = entrance;
        best = dist;
      }
    }
    return nearest;
  }

  private directionFromPointer(x: number, y: number): Direction {
    const pointer = this.pointerWorldPosition();
    const dx = pointer.x - x;
    const dy = pointer.y - y;
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx >= 0 ? 'right' : 'left';
    }
    return dy >= 0 ? 'down' : 'up';
  }

  private calculateClearedRatio(mine: MineModel): number {
    let empty = 0;
    let total = 0;
    for (const row of mine.tiles) {
      for (const tile of row) {
        total += 1;
        if (!tile.solid) {
          empty += 1;
        }
      }
    }
    return empty / total;
  }

  private toggleFullscreen(): void {
    if (this.scale.isFullscreen) {
      this.scale.stopFullscreen();
    } else {
      this.scale.startFullscreen();
    }
  }

  private resizeGameView(): void {
    const width = Math.max(1, this.scale.width);
    const height = Math.max(1, this.scale.height);
    const zoom = Math.min(width / BALANCE.screenWidth, height / BALANCE.screenHeight);
    const camera = this.cameras.main;
    camera.setViewport(0, 0, width, height);
    camera.setZoom(zoom);
    camera.centerOn(BALANCE.screenWidth / 2, BALANCE.screenHeight / 2);
    this.input.setDefaultCursor('crosshair');
  }

  private getVisibleWorldBounds(): Phaser.Geom.Rectangle {
    const camera = this.cameras.main;
    const zoom = camera.zoom || 1;
    const width = camera.width / zoom;
    const height = camera.height / zoom;
    return new Phaser.Geom.Rectangle(camera.scrollX, camera.scrollY, width, height);
  }

  private pointerWorldPosition(): { x: number; y: number } {
    const pointer = this.input.activePointer;
    return {
      x: Number.isFinite(pointer.worldX) ? pointer.worldX : pointer.x,
      y: Number.isFinite(pointer.worldY) ? pointer.worldY : pointer.y,
    };
  }

  private createPixelSpriteLayers(): void {
    for (let y = 0; y < BALANCE.mineHeight; y += 1) {
      for (let x = 0; x < BALANCE.mineWidth; x += 1) {
        const image = this.add.image(
          BALANCE.mineOriginX + x * BALANCE.tileSize,
          BALANCE.mineOriginY + y * BALANCE.tileSize,
          ASSET_KEYS.tiles.empty,
        );
        image.setOrigin(0, 0);
        image.setDisplaySize(BALANCE.tileSize, BALANCE.tileSize);
        image.setDepth(3);
        image.setVisible(false);
        this.tileImages.push(image);
      }
    }

    for (let i = 0; i < WALL_CHUNK_COUNT; i += 1) {
      this.wallChunkImages.push(this.createHiddenImage(ASSET_KEYS.wallChunk, 2));
    }
    for (let i = 0; i < 3; i += 1) {
      this.entranceImages.push(this.createHiddenImage(ASSET_KEYS.entrance, 4));
    }
    for (let i = 0; i < MAX_DROPS; i += 1) {
      this.dropImages.push(this.createHiddenImage(ASSET_KEYS.drops.scrap, 8));
    }
    for (let i = 0; i < MAX_ENEMIES; i += 1) {
      this.enemyImages.push(this.createHiddenImage(ASSET_KEYS.enemies.crawler, 8));
    }
    for (let i = 0; i < MAX_PROJECTILES; i += 1) {
      this.projectileImages.push(this.createHiddenImage(ASSET_KEYS.projectiles.player, 9));
    }

    this.playerImage = this.createHiddenImage(ASSET_KEYS.workerSuit, 9);
    this.travelTruckImage = this.createHiddenImage(ASSET_KEYS.vehicle, 6);
    this.combatTruckImage = this.createHiddenImage(ASSET_KEYS.vehicle, 6);
    this.turretBarrelImage = this.createHiddenImage(ASSET_KEYS.turretBarrel, 10);
  }

  private createHiddenImage(texture: string, depth: number): Phaser.GameObjects.Image {
    return this.add.image(0, 0, texture).setDepth(depth).setVisible(false).setOrigin(0.5, 0.5);
  }

  private hidePixelSprites(): void {
    for (const image of this.tileImages) image.setVisible(false);
    for (const image of this.wallChunkImages) image.setVisible(false);
    for (const image of this.entranceImages) image.setVisible(false);
    for (const image of this.dropImages) image.setVisible(false);
    for (const image of this.enemyImages) image.setVisible(false);
    for (const image of this.projectileImages) image.setVisible(false);
    this.playerImage.setVisible(false);
    this.travelTruckImage.setVisible(false);
    this.combatTruckImage.setVisible(false);
    this.turretBarrelImage.setVisible(false);
  }

  private renderScene(): void {
    this.graphics.clear();
    this.overlayGraphics.clear();
    this.hidePixelSprites();
    this.panelText.setText('');
    this.debugText.setText('');
    this.drawBackground();

    switch (this.model.state) {
      case 'WALL_TRAVEL':
        this.drawWallTravel();
        break;
      case 'MINING':
        this.drawMining();
        break;
      case 'COMBAT':
        this.drawCombat();
        break;
      case 'UPGRADE':
        this.drawUpgrade();
        break;
      case 'RUN_END':
        this.drawRunEnd();
        break;
    }

    this.drawHud();
    this.drawDebug();
  }

  private drawBackground(): void {
    const visible = this.getVisibleWorldBounds();
    this.graphics.fillStyle(COLORS.bg, 1);
    this.graphics.fillRect(visible.x - 2, visible.y - 2, visible.width + 4, visible.height + 4);
    this.graphics.fillStyle(COLORS.bg2, 1);
    this.graphics.fillRect(visible.x - 2, 54, visible.width + 4, BALANCE.screenHeight - 94);
  }

  private drawWallTravel(): void {
    this.graphics.fillStyle(COLORS.wallDark, 1);
    this.graphics.fillRect(716, 54, 244, 446);
    let wallIndex = 0;
    for (let y = 62; y < 500; y += 28) {
      const offset = y % 56 === 0 ? 16 : 0;
      wallIndex = this.showWallChunk(wallIndex, 754 + offset, y + 10, 58, 24);
      wallIndex = this.showWallChunk(wallIndex, 832 + offset, y + 18, 76, 24);
      wallIndex = this.showWallChunk(wallIndex, 905 + offset, y + 12, 48, 24);
    }

    this.graphics.lineStyle(4, COLORS.rail, 1);
    this.graphics.lineBetween(BALANCE.truckX - 50, 78, BALANCE.truckX - 50, 470);
    this.graphics.lineBetween(BALANCE.truckX + 50, 78, BALANCE.truckX + 50, 470);

    let entranceIndex = 0;
    for (const entrance of this.model.mines) {
      const y = BALANCE.truckY + (entrance.wallY - this.model.base.wallY);
      if (y < 70 || y > 480) {
        continue;
      }
      const close = Math.abs(this.model.base.wallY - entrance.wallY) < 30;
      this.graphics.lineStyle(close ? 5 : 3, close ? COLORS.entrance : COLORS.rail, 1);
      this.graphics.lineBetween(BALANCE.truckX + 42, y, 720, y);
      const entranceImage = this.entranceImages[entranceIndex++];
      if (entranceImage) {
        entranceImage.setPosition(716, y);
        entranceImage.setDisplaySize(26, 56);
        entranceImage.setAlpha(close ? 1 : 0.62);
        entranceImage.setVisible(true);
      }
    }

    this.showTruck(this.travelTruckImage, BALANCE.truckX, BALANCE.truckY);

    const nearest = this.getNearestEntrance();
    const prompt =
      nearest && Math.abs(this.model.base.wallY - nearest.wallY) < 30
        ? `Entrance ${nearest.label} ready - press E or Space`
        : 'Move along the scrap wall to align with an entrance';
    this.helpText.setText(`W/S or arrows: move   ${prompt}   F: fullscreen`);
  }

  private showWallChunk(index: number, x: number, y: number, width: number, height: number): number {
    const image = this.wallChunkImages[index];
    if (!image) {
      return index + 1;
    }
    image.setPosition(x, y);
    image.setDisplaySize(width, height);
    image.setVisible(true);
    return index + 1;
  }

  private drawMining(): void {
    if (!this.currentMine) {
      return;
    }

    this.graphics.fillStyle(0x151a22, 1);
    this.graphics.fillRect(86, 54, 812, 448);

    for (let y = 0; y < this.currentMine.height; y += 1) {
      for (let x = 0; x < this.currentMine.width; x += 1) {
        const tile = this.currentMine.tiles[y][x];
        const px = BALANCE.mineOriginX + x * BALANCE.tileSize;
        const py = BALANCE.mineOriginY + y * BALANCE.tileSize;
        const image = this.tileImages[y * BALANCE.mineWidth + x];
        image.setTexture(tileTextureKey(tile));
        image.setPosition(px, py);
        image.setDisplaySize(BALANCE.tileSize, BALANCE.tileSize);
        image.setAlpha(1);
        image.setVisible(true);
        if (tile.solid && tile.hp < tile.maxHp) {
          this.overlayGraphics.fillStyle(0xfff2a6, 0.32);
          this.overlayGraphics.fillRect(px + 3, py + 3, BALANCE.tileSize - 7, BALANCE.tileSize - 7);
        }
      }
    }

    const entrance = tileToWorld(this.currentMine.entrance.x, this.currentMine.entrance.y);
    const entranceImage = this.entranceImages[0];
    entranceImage.setPosition(BALANCE.mineOriginX - 6, entrance.y);
    entranceImage.setDisplaySize(48, 72);
    entranceImage.setAlpha(0.92);
    entranceImage.setVisible(true);

    for (let i = 0; i < this.resourceDrops.length && i < this.dropImages.length; i += 1) {
      const drop = this.resourceDrops[i];
      const image = this.dropImages[i];
      image.setTexture(dropTextureKey(drop.type));
      image.setPosition(drop.x, drop.y);
      image.setDisplaySize(13, 13);
      image.setVisible(true);
    }

    const target = this.currentDrillTarget();
    if (target) {
      this.overlayGraphics.lineStyle(2, 0xfff2a6, 0.9);
      this.overlayGraphics.strokeRect(
        BALANCE.mineOriginX + target.tx * BALANCE.tileSize + 2,
        BALANCE.mineOriginY + target.ty * BALANCE.tileSize + 2,
        BALANCE.tileSize - 4,
        BALANCE.tileSize - 4,
      );
    }

    const facing = facingVector(this.model.player.facing);
    this.playerImage.setPosition(this.model.player.x, this.model.player.y);
    this.playerImage.setDisplaySize(24, 24);
    this.playerImage.setRotation(Math.atan2(facing.y, facing.x));
    this.playerImage.setVisible(true);

    this.helpText.setText(
      'WASD/arrows: move   Space/click: drill   return to green entrance to deposit   R near entrance: exit',
    );
  }

  private drawCombat(): void {
    this.graphics.fillStyle(0x141820, 1);
    this.graphics.fillRect(0, 54, BALANCE.screenWidth, 446);
    let wallIndex = 0;
    for (let x = 0; x < 880; x += 80) {
      wallIndex = this.showWallChunk(wallIndex, x + 25, 475, 56, 18);
      wallIndex = this.showWallChunk(wallIndex, x + 39, 414, 38, 14);
    }

    for (let i = 0; i < this.enemies.length && i < this.enemyImages.length; i += 1) {
      const enemy = this.enemies[i];
      const image = this.enemyImages[i];
      image.setTexture(enemyTextureKey(enemy.type));
      image.setPosition(enemy.x, enemy.y);
      image.setDisplaySize(enemy.type === 'crawler' ? 32 : 28, enemy.type === 'crawler' ? 24 : 28);
      image.setFlipX(enemy.x > BALANCE.combatTruckX);
      image.setVisible(true);
      this.drawEnemyHealth(enemy);
    }

    for (let i = 0; i < this.projectiles.length && i < this.projectileImages.length; i += 1) {
      const projectile = this.projectiles[i];
      const image = this.projectileImages[i];
      image.setTexture(projectile.owner === 'player' ? ASSET_KEYS.projectiles.player : ASSET_KEYS.projectiles.enemy);
      image.setPosition(projectile.x, projectile.y);
      image.setDisplaySize(projectile.owner === 'player' ? 10 : 12, projectile.owner === 'player' ? 10 : 12);
      image.setRotation(Math.atan2(projectile.vy, projectile.vx));
      image.setVisible(true);
    }

    this.showTruck(this.combatTruckImage, BALANCE.combatTruckX, BALANCE.combatTruckY);
    const pointer = this.pointerWorldPosition();
    const aim = normalize(pointer.x - BALANCE.combatTruckX, pointer.y - BALANCE.combatTruckY);
    this.turretBarrelImage.setPosition(BALANCE.combatTruckX, BALANCE.combatTruckY - 2);
    this.turretBarrelImage.setDisplaySize(48, 15);
    this.turretBarrelImage.setRotation(Math.atan2(aim.y, aim.x));
    this.turretBarrelImage.setVisible(true);

    if (this.lateReturnMs > 0) {
      this.overlayGraphics.fillStyle(0x000000, 0.62);
      this.overlayGraphics.fillRect(260, 210, 440, 94);
      this.panelText.setPosition(296, 232);
      this.panelText.setColor(COLORS.warningText);
      this.panelText.setText(`Returning from mine...\nBase taking damage for ${Math.ceil(this.lateReturnMs / 1000)}s`);
    } else {
      this.panelText.setColor(COLORS.text);
    }

    this.helpText.setText('Mouse: aim   click/Space: fire   clear all enemies to upgrade');
  }

  private drawUpgrade(): void {
    this.graphics.fillStyle(0x151a21, 1);
    this.graphics.fillRect(0, 54, BALANCE.screenWidth, 446);
    this.graphics.fillStyle(COLORS.panel, 0.96);
    this.graphics.fillRect(158, 86, 644, 366);
    this.graphics.lineStyle(2, COLORS.panelStroke, 1);
    this.graphics.strokeRect(158, 86, 644, 366);

    const lines = ['UPGRADE BAY', ''];
    UPGRADE_DEFINITIONS.forEach((upgrade, index) => {
      const level = this.model.upgradeLevels[upgrade.id];
      const cost = level >= upgrade.maxLevel ? 'MAX' : formatCost(upgrade.getCost(level));
      lines.push(`${index + 1}. ${upgrade.name.padEnd(16)} Lv ${level}/${upgrade.maxLevel}  ${cost}`);
      lines.push(`   ${upgrade.effect}`);
    });
    lines.push('');
    if (this.upgradeMessageMs > 0) {
      lines.push(this.upgradeMessage);
    } else {
      lines.push('Enter / Esc / C: continue');
    }

    this.panelText.setColor(this.upgradeMessage.startsWith('!') && this.upgradeMessageMs > 0 ? COLORS.dangerText : COLORS.text);
    this.panelText.setPosition(190, 116);
    this.panelText.setText(lines.join('\n'));
    this.helpText.setText('1-5: buy upgrade   continue when ready');
  }

  private drawRunEnd(): void {
    this.graphics.fillStyle(0x160f12, 1);
    this.graphics.fillRect(0, 54, BALANCE.screenWidth, 446);
    this.graphics.fillStyle(COLORS.panel, 0.96);
    this.graphics.fillRect(260, 172, 440, 172);
    this.graphics.lineStyle(2, 0xff6464, 1);
    this.graphics.strokeRect(260, 172, 440, 172);
    this.panelText.setColor(COLORS.text);
    this.panelText.setPosition(302, 210);
    this.panelText.setText(
      [
        'RUN END',
        '',
        `Waves survived: ${Math.max(0, this.model.waveIndex - 1)}`,
        `Resources banked: ${formatInventory(this.model.inventory)}`,
        '',
        'Press Enter to restart',
      ].join('\n'),
    );
    this.helpText.setText('Enter: restart');
  }

  private drawHud(): void {
    const cargo = cargoTotal(this.model.player.cargo);
    const timer = this.model.state === 'COMBAT' ? 'ACTIVE' : `${Math.max(0, Math.ceil(this.model.waveTimerMs / 1000))}s`;
    const hpColor =
      this.model.base.hp <= this.model.base.maxHp * 0.3 ? COLORS.dangerText : this.model.waveTimerMs <= 5000 ? COLORS.warningText : COLORS.text;
    this.hudText.setColor(hpColor);
    this.hudText.setText(
      [
        `MODE ${this.model.state}   HP ${Math.ceil(this.model.base.hp)}/${this.model.base.maxHp}   WAVE ${this.model.waveIndex} ${timer}`,
        `Inventory ${formatInventory(this.model.inventory)}   Cargo ${cargo}/${this.model.player.cargoCapacity} ${formatInventory(
          this.model.player.cargo,
        )}`,
      ].join('\n'),
    );
  }

  private drawDebug(): void {
    if (!this.debugVisible) {
      this.debugText.setText('');
      return;
    }

    const tile = this.currentMine ? worldToTile(this.model.player.x, this.model.player.y) : null;
    this.debugText.setText(
      [
        `debug state=${this.model.state}`,
        `wallY=${this.model.base.wallY.toFixed(1)} currentMine=${this.model.currentMineId ?? 'none'}`,
        `player=${this.model.player.x.toFixed(1)},${this.model.player.y.toFixed(1)} tile=${tile ? `${tile.tx},${tile.ty}` : 'n/a'}`,
        `drops=${this.resourceDrops.length} enemies=${this.enemies.length} projectiles=${this.projectiles.length}`,
        `lateReturnMs=${this.lateReturnMs.toFixed(0)} drillCd=${this.drillCooldownMs.toFixed(0)} turretCd=${this.turretCooldownMs.toFixed(0)}`,
      ].join('\n'),
    );
  }

  private showTruck(image: Phaser.GameObjects.Image, x: number, y: number): void {
    image.setPosition(x, y);
    image.setDisplaySize(96, 64);
    image.setVisible(true);
  }

  private drawEnemyHealth(enemy: EnemyModel): void {
    if (enemy.hp < enemy.maxHp) {
      this.overlayGraphics.fillStyle(0x000000, 0.6);
      this.overlayGraphics.fillRect(enemy.x - 14, enemy.y - 20, 28, 4);
      this.overlayGraphics.fillStyle(0x8dff8d, 1);
      this.overlayGraphics.fillRect(enemy.x - 14, enemy.y - 20, 28 * (enemy.hp / enemy.maxHp), 4);
    }
  }

  private currentDrillTarget(): { tx: number; ty: number } | null {
    if (!this.currentMine) {
      return null;
    }
    const { tx, ty } = worldToTile(this.model.player.x, this.model.player.y);
    const target = targetFromDirection(tx, ty, this.model.player.facing);
    if (target.tx < 0 || target.ty < 0 || target.tx >= this.currentMine.width || target.ty >= this.currentMine.height) {
      return null;
    }
    return target;
  }

  private renderGameToText(): string {
    const playerTile = this.currentMine ? worldToTile(this.model.player.x, this.model.player.y) : null;
    const target = this.currentDrillTarget();
    const targetTile = target && this.currentMine ? this.currentMine.tiles[target.ty][target.tx] : null;
    const nearest = this.getNearestEntrance();
    const payload = {
      coordinateSystem: 'screen origin top-left, x right, y down; mine tile origin top-left of grid',
      state: this.model.state,
      base: {
        hp: Math.round(this.model.base.hp),
        maxHp: this.model.base.maxHp,
        wallY: Math.round(this.model.base.wallY),
        nearestEntrance: nearest ? { id: nearest.id, label: nearest.label, distance: Math.round(Math.abs(nearest.wallY - this.model.base.wallY)) } : null,
      },
      wave: {
        index: this.model.waveIndex,
        timerMs: Math.max(0, Math.round(this.model.waveTimerMs)),
        lateReturnMs: Math.round(this.lateReturnMs),
      },
      inventory: this.model.inventory,
      cargo: {
        total: cargoTotal(this.model.player.cargo),
        capacity: this.model.player.cargoCapacity,
        resources: this.model.player.cargo,
      },
      player:
        this.model.state === 'MINING'
          ? {
              x: Math.round(this.model.player.x),
              y: Math.round(this.model.player.y),
              tile: playerTile,
              facing: this.model.player.facing,
              drillTarget: target ? { ...target, tileType: targetTile?.type, hp: targetTile?.hp, solid: targetTile?.solid } : null,
            }
          : null,
      mine: this.currentMine
        ? {
            id: this.currentMine.id,
            biome: this.currentMine.biome,
            clearedRatio: Number(this.currentMine.clearedRatio.toFixed(3)),
            drops: this.resourceDrops.map((drop) => ({
              type: drop.type,
              amount: drop.amount,
              x: Math.round(drop.x),
              y: Math.round(drop.y),
            })),
          }
        : null,
      combat: {
        enemies: this.enemies.slice(0, 12).map((enemy) => ({
          type: enemy.type,
          hp: enemy.hp,
          x: Math.round(enemy.x),
          y: Math.round(enemy.y),
        })),
        enemyCount: this.enemies.length,
        projectileCount: this.projectiles.length,
      },
      upgrades: this.model.upgradeLevels,
    };
    return JSON.stringify(payload);
  }
}

function emptyInventory(): Inventory {
  return { scrap: 0, circuit: 0, alloy: 0 };
}

function boolToAxis(positive: boolean, negative: boolean): number {
  if (positive === negative) {
    return 0;
  }
  return positive ? 1 : -1;
}

function createTile(type: TileType): TileModel {
  switch (type) {
    case 'empty':
      return { type, hp: 0, maxHp: 0, solid: false, revealed: true };
    case 'denseScrap':
      return { type, hp: 2, maxHp: 2, solid: true, resourceType: 'scrap', resourceAmount: 2, revealed: true };
    case 'circuitWaste':
      return { type, hp: 1, maxHp: 1, solid: true, resourceType: 'circuit', resourceAmount: 1, revealed: true };
    case 'alloyChunk':
      return { type, hp: 2, maxHp: 2, solid: true, resourceType: 'alloy', resourceAmount: 1, revealed: true };
    case 'hardJunk':
      return { type, hp: 3, maxHp: 3, solid: true, resourceType: 'scrap', resourceAmount: 1, revealed: true };
    case 'scrap':
    default:
      return { type, hp: 1, maxHp: 1, solid: true, resourceType: 'scrap', resourceAmount: 1, revealed: true };
  }
}

function seededRandom(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function tileColor(tile: TileModel): number {
  switch (tile.type) {
    case 'empty':
      return COLORS.emptyTile;
    case 'denseScrap':
      return COLORS.denseScrapTile;
    case 'circuitWaste':
      return COLORS.circuitTile;
    case 'alloyChunk':
      return COLORS.alloyTile;
    case 'hardJunk':
      return COLORS.hardJunkTile;
    case 'scrap':
    default:
      return COLORS.scrapTile;
  }
}

function resourceColor(type: ResourceType): number {
  if (type === 'circuit') {
    return COLORS.dropCircuit;
  }
  if (type === 'alloy') {
    return COLORS.dropAlloy;
  }
  return COLORS.dropScrap;
}

function targetFromDirection(tx: number, ty: number, direction: Direction): { tx: number; ty: number } {
  const vector = facingVector(direction);
  return { tx: tx + vector.x, ty: ty + vector.y };
}

function facingVector(direction: Direction): { x: number; y: number } {
  switch (direction) {
    case 'up':
      return { x: 0, y: -1 };
    case 'down':
      return { x: 0, y: 1 };
    case 'left':
      return { x: -1, y: 0 };
    case 'right':
    default:
      return { x: 1, y: 0 };
  }
}

function cargoTotal(inventory: Inventory): number {
  return RESOURCE_ORDER.reduce((sum, type) => sum + inventory[type], 0);
}

function canAfford(inventory: Inventory, cost: Partial<Inventory>): boolean {
  return RESOURCE_ORDER.every((type) => inventory[type] >= (cost[type] ?? 0));
}

function payCost(inventory: Inventory, cost: Partial<Inventory>): void {
  for (const type of RESOURCE_ORDER) {
    inventory[type] -= cost[type] ?? 0;
  }
}

function formatCost(cost: Partial<Inventory>): string {
  return RESOURCE_ORDER.filter((type) => (cost[type] ?? 0) > 0)
    .map((type) => `${type}:${cost[type]}`)
    .join(' ');
}

function formatInventory(inventory: Inventory): string {
  return `scrap ${inventory.scrap} / circuit ${inventory.circuit} / alloy ${inventory.alloy}`;
}
