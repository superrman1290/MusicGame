import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { LoadingScene } from './scenes/LoadingScene.js';
import { PlayScene } from './scenes/PlayScene.js';
import { ResultScene } from './scenes/ResultScene.js';
import { SongSelectScene } from './scenes/SongSelectScene.js';
import './style.css';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 600,
  backgroundColor: '#0b0b13',
  scene: [BootScene, SongSelectScene, LoadingScene, PlayScene, ResultScene],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, pixelArt: false },
});

