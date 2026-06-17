import Phaser from 'phaser';
import type { EnemyType, ResourceType, TileModel } from './types';

export const PIXEL_ASSET_VERSION = `pixel-${Date.now()}`;

export const ASSET_KEYS = {
  tiles: {
    empty: 'tile-empty',
    scrap: 'tile-scrap',
    denseScrap: 'tile-dense-scrap',
    circuitWaste: 'tile-circuit-waste',
    alloyChunk: 'tile-alloy-chunk',
    hardJunk: 'tile-hard-junk',
  },
  entrance: 'entrance',
  wallChunk: 'wall-chunk',
  vehicle: 'vehicle',
  turretBarrel: 'turret-barrel',
  workerSuit: 'worker-suit',
  enemies: {
    crawler: 'enemy-crawler',
    flyer: 'enemy-flyer',
    bomber: 'enemy-bomber',
  },
  drops: {
    scrap: 'drop-scrap',
    circuit: 'drop-circuit',
    alloy: 'drop-alloy',
  },
  projectiles: {
    player: 'projectile-player',
    enemy: 'projectile-enemy',
  },
} as const;

const PIXEL_ASSETS: Array<[string, string]> = [
  [ASSET_KEYS.tiles.empty, 'assets/pixel/tile_empty.png'],
  [ASSET_KEYS.tiles.scrap, 'assets/pixel/tile_scrap.png'],
  [ASSET_KEYS.tiles.denseScrap, 'assets/pixel/tile_dense_scrap.png'],
  [ASSET_KEYS.tiles.circuitWaste, 'assets/pixel/tile_circuit_waste.png'],
  [ASSET_KEYS.tiles.alloyChunk, 'assets/pixel/tile_alloy_chunk.png'],
  [ASSET_KEYS.tiles.hardJunk, 'assets/pixel/tile_hard_junk.png'],
  [ASSET_KEYS.entrance, 'assets/pixel/entrance.png'],
  [ASSET_KEYS.wallChunk, 'assets/pixel/wall_chunk.png'],
  [ASSET_KEYS.vehicle, 'assets/pixel/vehicle.png'],
  [ASSET_KEYS.turretBarrel, 'assets/pixel/turret_barrel.png'],
  [ASSET_KEYS.workerSuit, 'assets/pixel/worker_suit.png'],
  [ASSET_KEYS.enemies.crawler, 'assets/pixel/enemy_crawler.png'],
  [ASSET_KEYS.enemies.flyer, 'assets/pixel/enemy_flyer.png'],
  [ASSET_KEYS.enemies.bomber, 'assets/pixel/enemy_bomber.png'],
  [ASSET_KEYS.drops.scrap, 'assets/pixel/drop_scrap.png'],
  [ASSET_KEYS.drops.circuit, 'assets/pixel/drop_circuit.png'],
  [ASSET_KEYS.drops.alloy, 'assets/pixel/drop_alloy.png'],
  [ASSET_KEYS.projectiles.player, 'assets/pixel/projectile_player.png'],
  [ASSET_KEYS.projectiles.enemy, 'assets/pixel/projectile_enemy.png'],
];

export function preloadPixelAssets(scene: Phaser.Scene): void {
  for (const [key, path] of PIXEL_ASSETS) {
    scene.load.image(key, versionedAssetPath(path));
  }
}

function versionedAssetPath(path: string): string {
  return `/${path}?v=${PIXEL_ASSET_VERSION}`;
}

export function tileTextureKey(tile: TileModel): string {
  switch (tile.type) {
    case 'empty':
      return ASSET_KEYS.tiles.empty;
    case 'denseScrap':
      return ASSET_KEYS.tiles.denseScrap;
    case 'circuitWaste':
      return ASSET_KEYS.tiles.circuitWaste;
    case 'alloyChunk':
      return ASSET_KEYS.tiles.alloyChunk;
    case 'hardJunk':
      return ASSET_KEYS.tiles.hardJunk;
    case 'scrap':
    default:
      return ASSET_KEYS.tiles.scrap;
  }
}

export function dropTextureKey(type: ResourceType): string {
  return ASSET_KEYS.drops[type];
}

export function enemyTextureKey(type: EnemyType): string {
  return ASSET_KEYS.enemies[type];
}
