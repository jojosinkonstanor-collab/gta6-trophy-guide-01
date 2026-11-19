// Leonida Ledger — the hand-in program for gta6-trophy-guide-01.
//
// The entry is the static guide in this repository's app/ directory
// (index.html, its ES modules and stylesheet, and data/trophies.json with
// the 55 official trophies and their guides) plus the 3 or 4 real renders
// in screenshots/. This program copies both into the output directory and
// writes dossier.json there with the kit's vendored library — the same
// bytes the sealed scorer rebuilds, so a dossier that differs is refused.
//
// Node 22, standard library only, no network, no clock: the same input
// files always produce the same output bytes. Run it locally as:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// and in the grader MAKEFUN_OUTPUT_DIR is unset, so /output is used.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// The gate's own caps, from the kit's RULES.txt: at most 4 screenshots of
// at most 256 KiB each, app/ at most 993 files and directories and 48 MiB,
// and the dossier text at most 160 KiB. buildDossier enforces them and
// refuses an entry the scorer would refuse.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
} as const;

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function fail(message: string): never {
  throw new Error(`main.ts: ${message}`);
}

function checkShots(): void {
  const shotsDir = join(repoRoot, 'screenshots');
  if (!existsSync(shotsDir)) fail('screenshots/ is missing');
  const shots = readdirSync(shotsDir)
    .filter((name) => !name.startsWith('.'))
    .filter((name) => statSync(join(shotsDir, name)).isFile());
  if (shots.length < 3 || shots.length > 4) {
    fail(`screenshots/ holds ${shots.length} images, expected 3 or 4`);
  }
  for (const name of shots) {
    if (!/^[A-Za-z0-9._-]+$/.test(name) || name.startsWith('-')) {
      fail(`screenshot name ${JSON.stringify(name)} is not allowed`);
    }
  }
}

function copyTree(from: string, to: string): void {
  cpSync(from, to, { recursive: true, dereference: false });
}

checkShots();
if (!existsSync(join(repoRoot, 'app', 'index.html'))) fail('app/index.html is missing');
if (!existsSync(join(repoRoot, 'app', 'data', 'trophies.json'))) fail('app/data/trophies.json is missing');

// Start from a clean output directory so a stale file from an earlier
// run can never leak into this one.
rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });
copyTree(join(repoRoot, 'app'), join(outputDir, 'app'));
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
copyTree(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'));

writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, DOSSIER_CAPS));
