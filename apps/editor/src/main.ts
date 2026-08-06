import Phaser from 'phaser';
import './style.css';

class EditorScaffoldScene extends Phaser.Scene {
  create(): void {
    this.cameras.main.setBackgroundColor('#11111d');
    this.add.text(550, 210, 'Chart editor scaffold', {
      color: '#d7d7df', fontFamily: 'system-ui', fontSize: '28px',
    }).setOrigin(0.5);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'editor',
  width: 1100,
  height: 420,
  scene: [EditorScaffoldScene],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
});

