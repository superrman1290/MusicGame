export function exposeScene(scene: string, state = 'ready', error = ''): void {
  const root = document.getElementById('game');
  if (!root) return;
  root.dataset.scene = scene;
  root.dataset.state = state;
  if (error) root.dataset.error = error; else delete root.dataset.error;
}
