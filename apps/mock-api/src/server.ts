import { createApp } from './app.js';
import { DEFAULT_DATA_DIRECTORY, seedDemoSong } from './seed.js';
import { SongStore } from './store.js';

const store = new SongStore(process.env.SONG_DATA_DIR ?? DEFAULT_DATA_DIRECTORY);
await seedDemoSong(store);
const port = Number(process.env.PORT ?? 3001);
createApp(store).listen(port, () => console.log(`MusicGame API listening on http://localhost:${port}`));
