import type { GameModel, Inventory, UpgradeLevels } from '../types';

export interface UpgradeDefinition {
  id: keyof UpgradeLevels;
  name: string;
  effect: string;
  maxLevel: number;
  getCost: (level: number) => Partial<Inventory>;
  apply: (model: GameModel) => void;
}

export const UPGRADE_DEFINITIONS: UpgradeDefinition[] = [
  {
    id: 'drillPower',
    name: 'Drill Output',
    effect: '+1 drill power',
    maxLevel: 5,
    getCost: (level) => ({ scrap: 6 + level * 7 }),
    apply: (model) => {
      model.player.drillPower += 1;
    },
  },
  {
    id: 'moveSpeed',
    name: 'Suit Mobility',
    effect: '+10% suit speed',
    maxLevel: 5,
    getCost: (level) => ({ scrap: 5 + level * 5, circuit: 1 + Math.floor(level / 2) }),
    apply: (model) => {
      model.player.moveSpeed *= 1.1;
    },
  },
  {
    id: 'cargoCapacity',
    name: 'Cargo Module',
    effect: '+5 cargo capacity',
    maxLevel: 5,
    getCost: (level) => ({ scrap: 8 + level * 8 }),
    apply: (model) => {
      model.player.cargoCapacity += 5;
    },
  },
  {
    id: 'turretDamage',
    name: 'Turret Power',
    effect: '+1 turret damage',
    maxLevel: 5,
    getCost: (level) => ({ scrap: 8 + level * 6, circuit: 2 + level }),
    apply: (model) => {
      model.base.turretDamage += 1;
    },
  },
  {
    id: 'baseHp',
    name: 'Vehicle Plating',
    effect: '+20 max HP and repair',
    maxLevel: 5,
    getCost: (level) => ({ scrap: 10 + level * 8, alloy: 1 + Math.floor(level / 2) }),
    apply: (model) => {
      model.base.maxHp += 20;
      model.base.hp = Math.min(model.base.maxHp, model.base.hp + 20);
    },
  },
];
