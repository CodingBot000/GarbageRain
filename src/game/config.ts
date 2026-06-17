import Phaser from 'phaser';
import { BALANCE } from './constants';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: BALANCE.screenWidth,
  height: BALANCE.screenHeight,
  backgroundColor: '#101318',
  pixelArt: true,
  antialias: false,
  render: {
    preserveDrawingBuffer: true,
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.NO_CENTER,
    width: '100%',
    height: '100%',
  },
  scene: [BootScene, GameScene],
};
