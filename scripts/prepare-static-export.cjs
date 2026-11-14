// Some Next.js exports emit nested segment files while prefetch uses dotted paths.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(process.argv[2] || 'out');
const files = fs.readdirSync(root, { recursive: true, withFileTypes: true });
for (const file of files) {
  if (!file.isFile() || !file.name.endsWith('.txt')) continue;
  const source = path.join(file.parentPath, file.name);
  const parts = path.relative(root, source).split(path.sep);
  const segment = parts.findIndex(part => part.startsWith('__next.'));
  if (segment < 0 || segment === parts.length - 1) continue;
  const alias = path.join(root, ...parts.slice(0, segment), parts.slice(segment).join('.'));
  if (!fs.existsSync(alias)) fs.copyFileSync(source, alias, fs.constants.COPYFILE_EXCL);
}
