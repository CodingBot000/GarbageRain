import type { EnemyType } from '../types';

export interface EnemyTemplate {
  type: EnemyType;
  hp: number;
  speed: number;
  damage: number;
  attackRange: number;
  behavior: 'contact' | 'ranged' | 'suicide';
}

export const ENEMY_TEMPLATES: Record<EnemyType, EnemyTemplate> = {
  crawler: {
    type: 'crawler',
    hp: 2,
    speed: 62,
    damage: 5,
    attackRange: 38,
    behavior: 'contact',
  },
  flyer: {
    type: 'flyer',
    hp: 1,
    speed: 92,
    damage: 3,
    attackRange: 155,
    behavior: 'ranged',
  },
  bomber: {
    type: 'bomber',
    hp: 1,
    speed: 122,
    damage: 15,
    attackRange: 32,
    behavior: 'suicide',
  },
};
