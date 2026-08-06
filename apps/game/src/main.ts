import Phaser from 'phaser';
import './style.css';

class ScaffoldScene extends Phaser.Scene {
  create(): void {
    this.cameras.main.setBackgroundColor('#0d0d1a');
    this.add.text(480, 300, 'MusicGame scaffold', {
      color: '#f5f5f7', fontFamily: 'system-ui', fontSize: '32px',
    }).setOrigin(0.5);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 600,
  scene: [ScaffoldScene],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
});

