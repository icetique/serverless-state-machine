import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const layerRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const layerNodeModules = path.join(layerRoot, 'nodejs', 'node_modules');
const sourceNodeModules = path.join(layerRoot, 'node_modules');

const packages = [
    'pg',
    'pg-cloudflare',
    'pg-connection-string',
    'pg-int8',
    'pg-pool',
    'pg-protocol',
    'pg-types',
    'pgpass',
    'postgres-array',
    'postgres-bytea',
    'postgres-date',
    'postgres-interval',
    'split2',
    'xtend',
];

for (const packageName of packages) {
    const sourcePath = path.join(sourceNodeModules, packageName);
    const targetPath = path.join(layerNodeModules, packageName);

    if (!fs.existsSync(sourcePath)) {
        continue;
    }

    fs.cpSync(sourcePath, targetPath, { recursive: true });
}
