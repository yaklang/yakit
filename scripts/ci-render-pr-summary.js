#!/usr/bin/env node
/**
 * CI：根据各 step outcome 与 *.log 生成 PR 汇总 Markdown，并写入 GITHUB_OUTPUT（供 maintain-one-comment）。
 */
const fs = require('fs')

const delim = 'PR_CI_COMMENT_BODY_' + Math.random().toString(36).slice(2, 11)

const checks = [
  { envKey: 'OUTCOME_I18N', title: 'i18n（zh/en）', log: 'i18n-output.log' },
  { envKey: 'OUTCOME_ESLINT', title: 'ESLint（renderer src/main）', log: 'eslint-output.log' },
  { envKey: 'OUTCOME_TSC', title: 'TypeScript（renderer src/main）', log: 'tsc-output.log' },
  {
    envKey: 'OUTCOME_ESLINT_ENGINE_LINK',
    title: 'ESLint（engine-link-startup）',
    log: 'eslint-engine-link-output.log',
  },
  { envKey: 'OUTCOME_TSC_ENGINE_LINK', title: 'TypeScript（engine-link-startup）', log: 'tsc-engine-link-output.log' },
  { envKey: 'OUTCOME_MEDIA', title: '图片/视频体积', log: 'media-output.log' },
  {
    envKey: 'OUTCOME_VITEST',
    title: 'Vitest（main / renderer / engine-link；__test__ 同目录·别名·相对路径）',
    log: 'vitest-output.log',
  },
  { envKey: 'OUTCOME_FORMAT', title: 'Prettier', log: 'format-output.log' },
]

const marker = '<!-- pr-ci-one-comment -->'

function outcome(envKey) {
  const v = (process.env[envKey] || '').trim()
  return v || 'unknown'
}

let hasFailure = false
for (const { envKey } of checks) {
  if (outcome(envKey) === 'failure') hasFailure = true
}

const statusLine = hasFailure ? '**状态：存在失败项**（见下方日志片段）\n\n' : '**状态：全部通过**\n\n'
let md = `${marker}\n## PR CI 汇总\n\n${statusLine}`

for (const { envKey, title, log } of checks) {
  const o = outcome(envKey)
  const ok = o === 'success'
  if (ok) {
    md += `- ✅ ${title}\n`
  } else if (o === 'cancelled' || o === 'skipped') {
    md += `- ○ ${title}（${o}）\n`
  } else {
    md += `- ❌ ${title}（${o}）\n`
    if (fs.existsSync(log)) {
      let tail = fs.readFileSync(log, 'utf8').replace(/\r\n/g, '\n')
      if (tail.length > 4500) tail = '…(仅显示末尾)\n' + tail.slice(-4500)
      tail = tail.split(delim).join('<delim>')
      md += `\n<details><summary>${title} — 日志片段</summary>\n\n\`\`\`\n${tail}\n\`\`\`\n</details>\n\n`
    }
  }
}

md += '\n---\n_由 pull_request test workflow 自动生成_\n'

const maxGithubOutput = 900000
if (md.length > maxGithubOutput) {
  md = md.slice(0, maxGithubOutput) + '\n\n…(汇总过长已在写入 GITHUB_OUTPUT 时截断)'
}

const ghOut = process.env.GITHUB_OUTPUT
if (ghOut) {
  fs.appendFileSync(ghOut, `body<<${delim}\n${md}\n${delim}\n`)
}

fs.writeFileSync('pr-comment.md', md)
