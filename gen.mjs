// Builds README.md from README.tpl.md: every link to a GitHub repository (github.com/<owner>/<repo>) gets its
// star count behind it, when the repository has at least MIN stars. Links under "## Contributions" stay as they are
// (other people's projects). Run daily by .github/workflows/readme.yml; edit README.tpl.md, never README.md.
import { readFileSync, writeFileSync } from 'node:fs';

const MIN = 10;
const token = process.env.GITHUB_TOKEN;
const tpl = readFileSync(new URL('./README.tpl.md', import.meta.url), 'utf8');
const cut = tpl.indexOf('\n## Contributions');
const head = cut < 0 ? tpl : tpl.slice(0, cut);
const tail = cut < 0 ? '' : tpl.slice(cut);

const link = /(\*\*)?\[([^\]]+)\]\(https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/?\)(\*\*)?/g;
const repos = new Set([...head.matchAll(link)].map(m => `${m[3]}/${m[4]}`));
const stars = {};
for (const r of repos) {
  const res = await fetch(`https://api.github.com/repos/${r}`, {
    headers: { 'User-Agent': 'profile-readme', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) throw new Error(`${r}: HTTP ${res.status}`);
  stars[r] = (await res.json()).stargazers_count;
}
const out = head.replace(link, (m, b1, _t, o, r) => {
  const n = stars[`${o}/${r}`];
  return n >= MIN ? `${m} <small>★&nbsp;${n}</small>` : m;
}) + tail;
writeFileSync(new URL('./README.md', import.meta.url), out);
