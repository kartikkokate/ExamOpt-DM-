import { mkdir, copyFile } from 'node:fs/promises';

// Publish only the browser files. Keep server code, tests, and secrets out of the static output.
const rootFiles = [
  'index.html', 'styles.css', 'app.js', 'engine.js', 'assistant-core.js',
  'companion.js', 'voice.js', 'voice-ui.js', 'pet3d.bundle.js',
  'sample-data.js', 'sample.json',
];
await mkdir('public', { recursive: true });
for (const file of rootFiles) await copyFile(file, `public/${file}`);
await mkdir('public/assets', { recursive: true });
for (const file of ['opti.glb', 'THREE-LICENSE.txt']) await copyFile(`assets/${file}`, `public/assets/${file}`);
console.log('Prepared ExamOpt static site in public/.');
