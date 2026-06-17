import { BALANCE } from '../constants';

export function worldToTile(x: number, y: number): { tx: number; ty: number } {
  return {
    tx: Math.floor((x - BALANCE.mineOriginX) / BALANCE.tileSize),
    ty: Math.floor((y - BALANCE.mineOriginY) / BALANCE.tileSize),
  };
}

export function tileToWorld(tx: number, ty: number): { x: number; y: number } {
  return {
    x: BALANCE.mineOriginX + tx * BALANCE.tileSize + BALANCE.tileSize / 2,
    y: BALANCE.mineOriginY + ty * BALANCE.tileSize + BALANCE.tileSize / 2,
  };
}
