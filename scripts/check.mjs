/**
 * Content checks — what the build cannot catch on its own.
 *
 * `npm run build` renders whatever it is given. It will happily emit a page
 * that links to a file nobody wrote, sits in a module the nav does not know
 * about, or claims a slug another page already owns. The last one is the worst:
 * two pages with the same slug means one silently overwrites the other in
 * docs/, and the build reports success either way. Those are the failures that
 * reach a reader as a 404 or a missing sidebar entry, so they get their own
 * gate.
 *
 * The list of valid modules is read out of scripts/build.mjs rather than
 * repeated here. A second copy would be one more thing to keep in sync, and a
 * stale copy would reject pages the build accepts.
 *
 * Deliberately dependency-free and deliberately not part of `build`: the build
 * should stay usable while a page is half-written, and this should be able to
 * fail without stopping you from previewing.
 *
 *   node scripts/check.mjs            fail on errors
 *   node scripts/check.mjs --strict   fail on warnings too
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const CONTENT = join(ROOT, "content");

const REQUIRED = ["title", "slug", "module", "order", "status", "summary"];
const STATUSES = new Set(["live", "draft"]);

// Lookup surfaces rather than topics: no reading order, so nothing is expected
// to link to them.
const NOT_ORPHANS = new Set(["start", "reference"]);

/** The single source of truth for module ids is build.mjs. */
function modulesFromBuild() {
  const src = readFileSync(join(ROOT, "scripts", "build.mjs"), "utf8");
  const block = src.match(/const MODULES\s*=\s*\[([\s\S]*?)\]\s*;/);
  if (!block) {
    console.error("could not find `const MODULES = [...]` in scripts/build.mjs");
    process.exit(1);
  }
  const ids = [...block[1].matchAll(/id:\s*["']([^"']+)["']/g)].map((m) => m[1]);
  if (!ids.length) {
    console.error("found MODULES in build.mjs but no `id:` entries in it");
    process.exit(1);
  }
  return new Set(ids);
}

const MODULES = modulesFromBuild();
const strict = process.argv.includes("--strict");
const errors = [];
const warnings = [];
const err = (file, msg) => errors.push(`${file}: ${msg}`);
const warn = (file, msg) => warnings.push(`${file}: ${msg}`);

/** Same minimal parser the build uses; duplicated so this runs standalone. */
function parseFrontmatter(raw) {
  if (!raw.startsWith("---")) return { meta: {}, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { meta: {}, body: raw };
  const meta = {};
  for (const line of raw.slice(4, end).split("\n")) {
    const match = /^([a-z_]+):\s*(.*)$/i.exec(line.trim());
    if (match) meta[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
  return { meta, body: raw.slice(end + 4) };
}

const files = readdirSync(CONTENT).filter((f) => f.endsWith(".md"));
if (files.length === 0) {
  console.error("no markdown found in content/ — refusing to pass vacuously");
  process.exit(1);
}

const pages = files.map((file) => {
  const raw = readFileSync(join(CONTENT, file), "utf8");
  const { meta, body } = parseFrontmatter(raw);
  return { file, meta, body, slug: meta.slug || basename(file, ".md") };
});

const slugs = new Set(pages.map((p) => p.slug));
const seenSlug = new Map();
const seenOrder = new Map();

for (const { file, meta, body, slug } of pages) {
  // -- frontmatter ----------------------------------------------------------
  for (const key of REQUIRED) {
    if (!meta[key]) err(file, `missing frontmatter: ${key}`);
  }
  if (meta.module && !MODULES.has(meta.module)) {
    err(file, `unknown module "${meta.module}" — not in build.mjs MODULES`);
  }
  if (meta.status && !STATUSES.has(meta.status)) {
    err(file, `status must be live or draft, got "${meta.status}"`);
  }
  if (meta.order && !Number.isFinite(Number(meta.order))) {
    err(file, `order must be a number, got "${meta.order}"`);
  }

  // The slug is the URL. A collision means one page silently overwrites the
  // other in docs/, and the build reports success either way.
  if (seenSlug.has(slug)) err(file, `duplicate slug "${slug}", also in ${seenSlug.get(slug)}`);
  else seenSlug.set(slug, file);

  if (meta.slug && meta.slug !== basename(file, ".md")) {
    warn(file, `slug "${meta.slug}" does not match filename`);
  }

  // Order collisions inside one module make nav ordering depend on a title
  // tiebreak, which is stable but not what the author intended.
  if (meta.module && meta.order) {
    const key = `${meta.module}/${meta.order}`;
    if (seenOrder.has(key)) warn(file, `order ${meta.order} in "${meta.module}" also used by ${seenOrder.get(key)}`);
    else seenOrder.set(key, file);
  }

  // -- links ----------------------------------------------------------------
  // Internal links are authored as `foo.md` so they resolve when the content is
  // read on GitHub; build.mjs rewrites them to .html for the site. The target
  // must be a real page slug either way.
  for (const [, target] of body.matchAll(/\]\(([a-z0-9][a-z0-9-]*)\.md(?:#[^)]*)?\)/g)) {
    if (!slugs.has(target)) err(file, `link to "${target}.md" — no page with that slug`);
  }
}

// -- reachability -----------------------------------------------------------
// A page nothing links to is reachable only from the nav. That is survivable,
// but it is usually a forgotten draft rather than a decision.
const linkedTo = new Set();
for (const { body } of pages) {
  for (const [, t] of body.matchAll(/\]\(([a-z0-9][a-z0-9-]*)\.md(?:#[^)]*)?\)/g)) linkedTo.add(t);
}
for (const { file, slug, meta } of pages) {
  if (!NOT_ORPHANS.has(meta.module) && !linkedTo.has(slug)) {
    warn(file, `no other page links to "${slug}.md"`);
  }
}

// -- report -----------------------------------------------------------------
const drafts = pages.filter((p) => p.meta.status === "draft").length;
for (const w of warnings) console.warn(`warn   ${w}`);
for (const e of errors) console.error(`ERROR  ${e}`);

const counts = `${pages.length} page(s), ${drafts} draft(s), ${errors.length} error(s), ${warnings.length} warning(s)`;
if (errors.length || (strict && warnings.length)) {
  console.error(`\nFAILED — ${counts}`);
  process.exit(1);
}
console.log(`\nok — ${counts}`);
