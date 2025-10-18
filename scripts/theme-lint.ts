/* eslint-disable */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
let TARGET_DIRS = ['app', 'components'];
const EXTENSIONS = new Set(['.tsx', '.ts', '.jsx', '.js']);

const bannedPatterns: { name: string; regex: RegExp }[] = [
  { name: 'bg-gray/*', regex: /(^|[^\w-])bg-(?:gray|neutral|zinc|slate|stone)-\d{2,3}(?:\/\d+)?/g },
  { name: 'text-gray/*', regex: /(^|[^\w-])text-(?:gray|neutral|zinc|slate|stone)-\d{2,3}(?:\/\d+)?/g },
  { name: 'border-gray/*', regex: /(^|[^\w-])border-(?:gray|neutral|zinc|slate|stone)-\d{2,3}(?:\/\d+)?/g },
  { name: 'bg/text/border white/black', regex: /(^|[^\w-])(bg|text|border)-(white|black)(?:\/\d+)?/g },
  { name: 'scrollbar-thumb gray/*', regex: /scrollbar-thumb-(?:gray|neutral|zinc|slate|stone)-\d{2,3}/g },
  { name: 'scrollbar-track gray/*', regex: /scrollbar-track-(?:gray|neutral|zinc|slate|stone)-\d{2,3}/g },
];

const SUGGESTION = `Use theme tokens instead of raw colors:
- Backgrounds: bg-app | bg-surface | bg-surface-2
- Text: text-foreground | text-muted-foreground | text-link
- Borders: border-default
- Primary: bg-[var(--color-primary)] via custom class or extend colors (text-primary, bg-primary)
- Scrollbar: use scrollbar-thumb-muted-foreground/30, scrollbar-track-transparent (requires plugin)`;

function walk(dir: string, files: string[] = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

function checkFile(file: string) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  const problems: { line: number; match: string; rule: string }[] = [];

  lines.forEach((line, i) => {
    for (const { name, regex } of bannedPatterns) {
      let m: RegExpExecArray | null;
      const r = new RegExp(regex);
      while ((m = r.exec(line)) !== null) {
        problems.push({ line: i + 1, match: m[0].trim(), rule: name });
      }
    }
  });

  return problems;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length) {
    TARGET_DIRS = args;
  }
  const targets = TARGET_DIRS
    .map((d) => path.isAbsolute(d) ? d : path.join(ROOT, d))
    .filter((p) => fs.existsSync(p));

  const files = targets.flatMap((d) => walk(d));

  let total = 0;
  for (const f of files) {
    const probs = checkFile(f);
    if (probs.length) {
      console.log(`\n[theme-lint] ${path.relative(ROOT, f)}`);
      for (const p of probs) {
        console.log(`  L${p.line}: ${p.match}  <- ${p.rule}`);
      }
      total += probs.length;
    }
  }

  if (total > 0) {
    console.error(`\nFound ${total} theme violations.\n${SUGGESTION}\n`);
    process.exit(1);
  } else {
    console.log('No theme violations found.');
  }
}

main();
