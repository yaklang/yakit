#!/usr/bin/env node
/**
 * pr-label-feishu：PR 被打上指定标签 -> 飞书群机器人。
 *
 * 用法场景：本文件就放在「PR 所在的那个仓库」里，由 GitHub Actions 的
 * pull_request / pull_request_target 事件触发。GitHub 会把完整的 webhook
 * payload 写到 GITHUB_EVENT_PATH 指向的文件，脚本直接读它，零 API 调用、
 * 不需要 token、不需要轮询游标。
 *
 * 零第三方依赖，只用 Node 18+ 内置的 fetch / crypto。
 *
 * CLI:
 *   node pr-label.mjs                          # 读 GITHUB_EVENT_PATH（Actions 里用）
 *   node pr-label.mjs --event-file=./ev.json   # 读本地文件
 *   node pr-label.mjs --event-json='{...}'     # 读字符串
 *   node pr-label.mjs --dry-run                # 只打印卡片，不发送
 *   cat ev.json | node pr-label.mjs --stdin    # 读 stdin
 */

import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const NAME = 'pr-label'
const MAX_BODY_BYTES = 20 * 1024
const RATE_LIMIT_CODE = 11232
const FEISHU_ERROR = {
  9499: '请求体格式错误或超过 20KB',
  11232: '触发频率限流',
  19021: '签名不匹配或时间戳超过 1 小时',
  19022: 'IP 不在白名单',
  19024: '未命中自定义关键词',
}

function readFeishuCode(json) {
  const raw = json?.code ?? json?.StatusCode
  if (raw === undefined || raw === null || raw === '') return undefined
  const num = Number(raw)
  return Number.isFinite(num) ? num : undefined
}

// ---------------------------------------------------------------- 工具

/** CI 上未配置的 secret 是空字符串而不是 undefined，`??` 兜不住，必须统一走这里 */
export function pickNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed !== '') return trimmed
      continue
    }
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'boolean') return value
  }
  return undefined
}

export function parseNumber(value, fallback) {
  const raw = pickNonEmpty(value)
  if (raw === undefined) return fallback
  const num = Number(raw)
  return Number.isFinite(num) ? num : fallback
}

/**
 * 要通知的标签。名字完全相等才命中，大小写不敏感，不考虑前后缀。
 * 以后要多通知一个标签，直接在这里加一项。
 */
export const WATCH_LABELS = ['ready', 'need more test']
const MATCH_MODES = new Set(['exact', 'contains', 'all'])

/** 只接受 exact / contains / all。空值或拼写错误都回到 exact，避免误放宽成包含匹配。 */
export function normalizeMatchMode(value) {
  const mode = String(value ?? '')
    .trim()
    .toLowerCase()
  return MATCH_MODES.has(mode) ? mode : 'exact'
}

/**
 * 飞书只给一个 webhook URL，整条填进 PR_LABEL_WEBHOOK_URL 即可。
 * 走 pickNonEmpty 是因为 CI 上未配置的 secret 是空字符串。
 */
export function resolveWebhookUrl(env = process.env) {
  return pickNonEmpty(env.PR_LABEL_WEBHOOK_URL)
}

/** 官方口径：key = timestamp + 换行 + secret，对空字符串做 HmacSHA256，再 base64 */
export function buildSign(secret, timestampSec) {
  return createHmac('sha256', `${timestampSec}\n${secret}`).update('').digest('base64')
}

// ---------------------------------------------------------------- 时间

// Intl 默认 12 小时制，必须显式 hourCycle，否则 22 点显示成 10
export function formatTime(iso) {
  if (!iso) return '未知时间'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: process.env.PR_LABEL_TZ || 'Asia/Shanghai',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/** 日志里不能出现完整 webhook（公开仓库的 Actions 日志是任何人可见的） */
export function maskUrl(url) {
  const value = pickNonEmpty(url)
  if (!value) return '(未配置 webhook)'
  // 只展示已知格式的地址前缀；查询参数、片段和无法识别的地址均不进入日志。
  const match = String(value).match(
    /^(https:\/\/open\.feishu\.cn\/open-apis\/bot\/v2\/hook\/)([0-9a-f]{4})[0-9a-f]{4}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\/?(?:[?#].*)?$/i,
  )
  return match ? `${match[1]}${match[2]}****` : '(webhook 已隐藏)'
}

export function truncate(text, max = 120) {
  const value = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

// ---------------------------------------------------------------- 事件解析

/**
 * 归一化 GitHub pull_request / pull_request_target 的 labeled 事件。
 * 同时兼容 repository_dispatch 传来的简化 payload，以及手工拼的对象。
 */
export function normalizeEvent(input) {
  if (!input || typeof input !== 'object') return null

  const action = input.action ?? 'labeled'
  const pr = input.pull_request ?? input.pr ?? input
  const repo =
    input.repository?.full_name ??
    (typeof input.repository === 'string' ? input.repository : undefined) ??
    input.repo ??
    ''
  const label = typeof input.label === 'string' ? input.label : (input.label?.name ?? input.labelName ?? '')

  const number = pr?.number ?? input.number ?? input.issue?.number
  const url = pr?.html_url ?? input.html_url ?? (repo && number ? `https://github.com/${repo}/pull/${number}` : '')

  const event = {
    action,
    label,
    repo,
    number,
    url,
    title: pr?.title ?? input.title ?? '',
    state: pr?.state ?? '',
    draft: Boolean(pr?.draft),
    merged: Boolean(pr?.merged),
    author: pr?.user?.login ?? '',
    actor: input.sender?.login ?? input.actor ?? '',
    base: pr?.base?.ref ?? '',
    head: pr?.head?.ref ?? '',
    // PR 上现有的全部标签（不是只有这次被打上的那一个）
    labels: Array.isArray(pr?.labels)
      ? pr.labels.map((item) => (typeof item === 'string' ? item : (item?.name ?? ''))).filter(Boolean)
      : [],
    additions: pr?.additions,
    deletions: pr?.deletions,
    changedFiles: pr?.changed_files,
    body: pr?.body ?? '',
  }

  if (!event.repo || !event.number || !event.label) return null
  return event
}

/**
 * 判定「这次被打上的标签」是否值得通知。大小写不敏感。
 *
 * exact：标签名与白名单某项完全相等，不考虑前后缀。
 *   白名单 ['ready', 'need more test'] 只命中这两项，ready-to-merge / need more testing 不命中。
 * contains：标签名包含白名单某项即命中。
 * all：任何标签都通知（白名单失效）。
 */
export function isWatched(event, labels, { mode = 'exact' } = {}) {
  const matchMode = normalizeMatchMode(mode)
  if (matchMode === 'all') return true
  if (!Array.isArray(labels) || labels.length === 0) return true
  const target = String(event.label ?? '')
    .trim()
    .toLowerCase()
  if (target === '') return false
  return labels.some((label) => {
    const needle = String(label ?? '')
      .trim()
      .toLowerCase()
    if (needle === '') return false
    return matchMode === 'contains' ? target.includes(needle) : target === needle
  })
}

// ---------------------------------------------------------------- 消息

/** ready / need more test 用固定标题，其它情况回落到 PR title。 */
function actionTitle(label) {
  const name = String(label ?? '').toLowerCase()
  if (name === 'need more test') return '请产品进行测试'
  if (name === 'ready') return '请值班人员审阅并合并'
  return ''
}

/** 只分三种：ready 绿、need more test 橙，其余蓝。标题栏和正文 tag 共用。 */
function colorForLabel(name) {
  const label = String(name ?? '').toLowerCase()
  if (label === 'ready') return 'green'
  if (label === 'need more test') return 'orange'
  return 'blue'
}

/** 飞书 Markdown 使用 HTML 实体转义；外部文本不能生成标签、链接或格式。 */
function escapeMarkdownText(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/[\\`*_{}\[\]()#+.!|~:/"'-]/g, (char) => `&#${char.charCodeAt(0)};`)
}

/** 只展示本次命中的那一个标签。飞书用 text_tag 渲染成彩色 tag。 */
function labelTag(name) {
  const value = String(name ?? '').trim()
  if (!value) return '无'
  return `<text_tag color='${colorForLabel(value)}'>${escapeMarkdownText(value)}</text_tag>`
}

function openUrlButton(text, url, type) {
  return {
    tag: 'button',
    text: { tag: 'plain_text', content: text },
    type,
    width: 'default',
    size: 'medium',
    behaviors: [{ type: 'open_url', default_url: url }],
  }
}

/**
 * 卡片 JSON 2.0。webhook 机器人不能挂请求回调，按钮只能 open_url。
 * 内容第一行是 PR title，随后是作者、分支、本次标签。
 * footer 只有「打开 PR」，只能 open_url。
 */
export function buildCard(event, { msgType = 'interactive' } = {}) {
  const prTitle = truncate(event.title || `#${event.number}`, 80)
  const title = actionTitle(event.label) || prTitle
  const labelsText = labelTag(event.label)
  const branchText = event.head || event.base ? `${event.head || '?'} → ${event.base || '?'}` : '未知'
  const place = [event.repo, event.number ? `#${event.number}` : ''].filter(Boolean).join(' ')

  if (msgType === 'text') {
    const lines = [
      title,
      ...(title === prTitle ? [] : [prTitle]),
      `作者：${event.author || '未知'}`,
      `分支：${branchText}`,
      `PR：${event.url}`,
      `Labels：${String(event.label ?? '').trim() || '无'}`,
      `触发时间：${formatTime(new Date().toISOString())}`,
    ]
    // text 消息也会解析 at 标签，使用全角尖括号展示内容，避免形成标签语法。
    const text = lines.join('\n').replace(/</g, '＜').replace(/>/g, '＞')
    return { msg_type: 'text', content: { text } }
  }

  const elements = [
    {
      tag: 'markdown',
      content: `${escapeMarkdownText(prTitle)}\n**作者**：${escapeMarkdownText(event.author || '未知')}\n**分支**：${escapeMarkdownText(branchText)}\n**Labels**：${labelsText}`,
      text_align: 'left',
      text_size: 'normal',
      margin: '0px 0px 0px 0px',
    },
    { tag: 'hr' },
    {
      tag: 'markdown',
      content: `触发时间 ${formatTime(new Date().toISOString())}`,
      text_align: 'left',
      text_size: 'notation',
      margin: '0px 0px 0px 0px',
    },
  ]

  if (event.url) elements.push(openUrlButton('打开 PR', event.url, 'primary'))

  return {
    msg_type: 'interactive',
    card: {
      schema: '2.0',
      config: {
        update_multi: true,
        enable_forward: true,
        summary: { content: truncate(`${title} · ${place || prTitle}`, 80) },
      },
      header: {
        title: { tag: 'plain_text', content: title },
        template: colorForLabel(event.label),
        padding: '12px 12px 12px 12px',
      },
      body: {
        direction: 'vertical',
        padding: '12px 12px 12px 12px',
        elements,
      },
    },
  }
}

export function decoratePayload(payload, { secret, keyword, now = Date.now() } = {}) {
  const body = structuredClone(payload)
  const safeKeyword = pickNonEmpty(keyword)

  if (safeKeyword) {
    if (body.msg_type === 'text' && body.content?.text) {
      body.content = { ...body.content, text: `${safeKeyword} ${body.content.text}` }
    } else if (body.msg_type === 'interactive' && body.card?.header?.title?.content) {
      const title = body.card.header.title.content
      if (!title.includes(safeKeyword)) {
        body.card = {
          ...body.card,
          header: { ...body.card.header, title: { ...body.card.header.title, content: `${safeKeyword} ${title}` } },
        }
      }
    }
  }

  const safeSecret = pickNonEmpty(secret)
  if (safeSecret) {
    const timestampSec = Math.floor(now / 1000)
    body.timestamp = String(timestampSec)
    body.sign = buildSign(safeSecret, timestampSec)
  }

  return body
}

// ---------------------------------------------------------------- 发送

const sleep = (ms) => new Promise((done) => setTimeout(done, ms))

export async function sendToFeishu(payload, options = {}) {
  const {
    webhookUrl,
    secret,
    keyword,
    timeoutMs = 10000,
    retries = 3,
    fetchImpl = fetch,
    logger,
    now = Date.now(),
    sleepFn = sleep,
  } = options

  if (!webhookUrl) return { ok: false, reason: '缺少飞书 webhook 地址' }

  const body = decoratePayload(payload, { secret, keyword, now })
  const raw = JSON.stringify(body)
  const size = Buffer.byteLength(raw, 'utf8')
  if (size > MAX_BODY_BYTES) {
    return { ok: false, reason: `请求体 ${size} 字节，超过飞书 20KB 限制` }
  }

  let lastReason = '未知错误'
  const maxAttempts = Math.max(1, retries)
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetchImpl(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: raw,
        redirect: 'manual',
        signal: AbortSignal.timeout(timeoutMs),
      })
      const text = await response.text()
      let json = null
      try {
        json = JSON.parse(text)
      } catch {
        json = null
      }

      const code = readFeishuCode(json)
      if (code === 0) {
        logger?.info?.(`发送成功（第 ${attempt} 次，${size} 字节，${maskUrl(webhookUrl)}）`)
        return { ok: true, attempts: attempt, code: 0 }
      }

      // 只有 11232 表示飞书没收下。9499 / 19021 / 19022 / 19024 再发一次也不会成功。
      const retryable = response.status === 429 || code === RATE_LIMIT_CODE
      const hint = FEISHU_ERROR[code]
      const msg = json?.msg ?? json?.message ?? `HTTP ${response.status}`
      lastReason = hint ? `${code} ${msg}：${hint}` : msg
      if (!retryable) {
        logger?.error?.(`发送失败且不可重试：${lastReason}`)
        return { ok: false, attempts: attempt, reason: lastReason }
      }

      const retryAfter = Number(response.headers?.get?.('retry-after') ?? 0)
      const waitMs = retryAfter > 0 ? retryAfter * 1000 : Math.min(8000, 1000 * 2 ** (attempt - 1))
      logger?.warn?.(`${lastReason}，${waitMs}ms 后重试（${attempt}/${maxAttempts}）`)
      await sleepFn(waitMs)
    } catch (error) {
      lastReason = error?.name === 'TimeoutError' ? `请求超时 ${timeoutMs}ms` : String(error?.message ?? error)
      logger?.error?.(`网络异常 ${lastReason}，不再重试，避免飞书已收下后重复发卡片`)
      return { ok: false, attempts: attempt, reason: lastReason }
    }
  }
  return { ok: false, attempts: maxAttempts, reason: lastReason }
}

// ---------------------------------------------------------------- 配置与入口

export function resolveConfig(argv = {}, env = process.env) {
  return {
    webhookUrl: pickNonEmpty(argv.webhookUrl, resolveWebhookUrl(env)),
    secret: pickNonEmpty(argv.secret, env.PR_LABEL_SECRET),
    keyword: pickNonEmpty(argv.keyword, env.PR_LABEL_KEYWORD),
    msgType: pickNonEmpty(argv.msgType, env.PR_LABEL_MSG_TYPE) || 'interactive',
    timeoutMs: parseNumber(pickNonEmpty(env.PR_LABEL_TIMEOUT_MS), 10000),
    retries: parseNumber(pickNonEmpty(env.PR_LABEL_RETRIES), 3),
    labels: WATCH_LABELS,
    matchMode: normalizeMatchMode(pickNonEmpty(argv.matchMode, env.PR_LABEL_MATCH_MODE)),
    dryRun: Boolean(argv.dryRun),
    probe: Boolean(argv.probe),
    eventFile: pickNonEmpty(argv.eventFile, env.GITHUB_EVENT_PATH),
    eventJson: pickNonEmpty(argv.eventJson, env.PR_LABEL_EVENT_JSON),
    useStdin: Boolean(argv.stdin),
  }
}

function parseArgv(tokens) {
  const argv = {}
  for (const token of tokens) {
    if (!token.startsWith('--')) continue
    const body = token.slice(2)
    if (body === 'dry-run') {
      argv.dryRun = true
      continue
    }
    if (body === 'stdin') {
      argv.stdin = true
      continue
    }
    if (body === 'probe') {
      argv.probe = true
      continue
    }
    if (body === 'verbose') {
      argv.verbose = true
      continue
    }
    const eq = body.indexOf('=')
    const key = eq === -1 ? body : body.slice(0, eq)
    const value = eq === -1 ? 'true' : body.slice(eq + 1)
    argv[key.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value
  }
  return argv
}

function readEventSource(config) {
  if (config.eventJson) return config.eventJson
  if (config.eventFile) return readFileSync(config.eventFile, 'utf8')
  if (config.useStdin) return readFileSync(0, 'utf8')
  if (process.env.GITHUB_EVENT_PATH) return readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')
  throw new Error('找不到事件数据：请在 Actions 中运行，或用 --event-file / --event-json / --stdin 指定')
}

export async function main(argv = {}, deps = {}) {
  const env = deps.env ?? process.env
  const config = resolveConfig(argv, env)
  const logger = deps.logger ?? {
    debug() {},
    info: (...a) => console.log(`[${NAME}] INFO  ${a.join(' ')}`),
    warn: (...a) => console.error(`[${NAME}] WARN  ${a.join(' ')}`),
    error: (...a) => console.error(`[${NAME}] ERROR ${a.join(' ')}`),
  }
  const fetchImpl = deps.fetchImpl ?? fetch

  // --probe：不依赖任何事件数据，直接发一条测试消息，用来确认 webhook / 签名配对了没
  if (config.probe) {
    const probeMessage = {
      msg_type: 'text',
      content: {
        text: `[${NAME}] 连通性测试：看到这条消息说明 webhook 与签名配置正确（${formatTime(new Date().toISOString())}）`,
      },
    }
    if (config.dryRun || !config.webhookUrl) {
      console.log(
        JSON.stringify(decoratePayload(probeMessage, { secret: config.secret, keyword: config.keyword }), null, 2),
      )
      return { ok: true, dryRun: true, probe: true }
    }
    const probeResult = await sendToFeishu(probeMessage, {
      webhookUrl: config.webhookUrl,
      secret: config.secret,
      keyword: config.keyword,
      timeoutMs: config.timeoutMs,
      retries: config.retries,
      fetchImpl,
      logger,
    })
    return { ...probeResult, probe: true }
  }

  const raw = readEventSource(config)
  let payload
  try {
    payload = typeof raw === 'object' ? raw : JSON.parse(raw)
  } catch {
    throw new Error(`事件数据不是合法 JSON：${String(raw).slice(0, 120)}`)
  }

  const event = normalizeEvent(payload)
  if (!event) {
    logger.info('事件缺少 repo / number / label 字段，跳过')
    return { skipped: true }
  }
  if (!isWatched(event, config.labels, { mode: config.matchMode })) {
    const why = config.matchMode === 'contains' ? '不包含' : '不等于'
    logger.info(`标签 ${event.label} ${why} [${config.labels.join(', ')}]（mode=${config.matchMode}），跳过`)
    return { skipped: true }
  }

  const message = buildCard(event, { msgType: config.msgType })

  if (config.dryRun || !config.webhookUrl) {
    const preview = decoratePayload(message, { secret: config.secret, keyword: config.keyword })
    logger.info(`[dry-run] 将发送到 ${maskUrl(config.webhookUrl)}`)
    console.log(JSON.stringify(preview, null, 2))
    return { ok: true, dryRun: true, event }
  }

  const result = await sendToFeishu(message, {
    webhookUrl: config.webhookUrl,
    secret: config.secret,
    keyword: config.keyword,
    timeoutMs: config.timeoutMs,
    retries: config.retries,
    fetchImpl,
    logger,
  })
  return { ...result, event }
}

const invoked = process.argv[1] ? resolve(process.argv[1]) : ''
if (invoked && invoked === fileURLToPath(import.meta.url)) {
  const argv = parseArgv(process.argv.slice(2))
  try {
    const result = await main(argv)
    if (result?.ok === false) process.exitCode = 1
  } catch (error) {
    console.error(`[${NAME}] ERROR ${error.stack ?? error.message}`)
    process.exitCode = 1
  }
}
