/**
 * Sync the three spec markdown files from the irc-:: sibling repo into
 * src/specs/ for the Astro build.
 *
 * Run: npm run sync-specs
 *
 * The canonical source-of-truth for the specs is the irc-:: repo. This
 * script copies them into the site repo so Cloudflare Pages can build
 * without needing access to a sibling directory. Re-run whenever the
 * specs change in the source repo.
 *
 * Source:  ../irc-::/spec/{well-known-irc-json,irc-directory.json,irc-trust-list.json}.md
 * Dest:    src/specs/{well-known-irc-json,irc-directory-json,irc-trust-list-json}.md
 *
 * Filename mapping: the canonical filenames contain a `.json` segment
 * (`irc-directory.json.md`) that conflicts with Astro's URL-routing rules,
 * so we flatten to single-dotted (`irc-directory-json.md`) on copy.
 *
 * @module
 */

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const sourceRoot = resolve(projectRoot, "..", "irc-::", "spec");
const destRoot = resolve(projectRoot, "src", "specs");

const files = [
  ["well-known-irc-json.md", "well-known-irc-json.md"],
  ["irc-directory.json.md", "irc-directory-json.md"],
  ["irc-trust-list.json.md", "irc-trust-list-json.md"],
];

if (!existsSync(sourceRoot)) {
  console.error(
    `Source spec directory not found: ${sourceRoot}\n` +
      `Expected the irc-:: repo as a sibling directory. ` +
      `If your layout is different, edit scripts/sync-specs.mjs.`,
  );
  process.exit(1);
}

mkdirSync(destRoot, { recursive: true });

for (const [src, dst] of files) {
  const source = resolve(sourceRoot, src);
  const dest = resolve(destRoot, dst);
  if (!existsSync(source)) {
    console.error(`Missing source: ${source}`);
    process.exit(1);
  }
  copyFileSync(source, dest);
  console.log(`synced  ${src}  →  src/specs/${dst}`);
}

console.log(`\nSynced ${files.length} spec(s) from ${sourceRoot}.`);
