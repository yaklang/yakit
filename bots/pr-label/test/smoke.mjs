import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createHmac } from 'node:crypto'

import {
  buildCard,
  buildSign,
  decoratePayload,
  isWatched,
  main,
  normalizeEvent,
  resolveConfig,
  resolveWebhookUrl,
  WATCH_LABELS,
  sendToFeishu,
} from '../pr-label.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const FIXTURE = JSON.parse(readFileSync(join(HERE, '..', 'fixtures', 'labeled.json'), 'utf8'))
const READY_FIXTURE = JSON.parse(readFileSync(join(HERE, '..', 'fixtures', 'labeled-ready.json'), 'utf8'))
const NEED_MORE_FIXTURE = JSON.parse(readFileSync(join(HERE, '..', 'fixtures', 'labeled-need-more-test.json'), 'utf8'))
const READY_FILE = join(HERE, '..', 'fixtures', 'labeled-ready.json')
const OTHER_FILE = join(HERE, '..', 'fixtures', 'labeled.json')

let passed = 0
let failed = 0
function check(name, condition, detail = '') {
  if (condition) {
    passed += 1
    console.log(`  PASS  ${name}`)
  } else {
    failed += 1
    console.log(`  FAIL  ${name}${detail ? ` -> ${detail}` : ''}`)
  }
}

const quiet = { debug() {}, info() {}, warn() {}, error() {} }

async function startMock(handler) {
  const calls = []
  const server = createServer((req, res) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      calls.push(JSON.parse(body || '{}'))
      const reply = handler ? handler(calls.length) : { code: 0, msg: 'success' }
      if (reply === 'retry') {
        res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '0' })
        res.end(JSON.stringify({ code: 11232, msg: 'too many requests' }))
        return
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(reply))
    })
  })
  await new Promise((done) => server.listen(0, '127.0.0.1', done))
  return { calls, url: `http://127.0.0.1:${server.address().port}/hook`, close: () => server.close() }
}

console.log('\n[1] webhook URL 变量')
{
  const url = 'https://open.feishu.cn/open-apis/bot/v2/hook/abcd1234-0000-0000-0000-000000000000'
  check('读到完整 URL', resolveWebhookUrl({ PR_LABEL_WEBHOOK_URL: url }) === url)
  check('前后空白会被去掉', resolveWebhookUrl({ PR_LABEL_WEBHOOK_URL: `  ${url}  ` }) === url)
  check('没填返回 undefined', resolveWebhookUrl({}) === undefined)
  check('空串不算已配置', resolveWebhookUrl({ PR_LABEL_WEBHOOK_URL: '' }) === undefined)
}

console.log('\n[2] 签名')
{
  const secret = 's3cret'
  const ts = 1667990000
  const expected = createHmac('sha256', `${ts}\n${secret}`).update('').digest('base64')
  check('签名 = HmacSHA256(ts+换行+secret, 空串) 的 base64', buildSign(secret, ts) === expected)
  const body = decoratePayload(
    { msg_type: 'text', content: { text: 'hi' } },
    { secret, keyword: 'PR提醒', now: ts * 1000 },
  )
  check('请求体带 timestamp 与 sign', body.timestamp === String(ts) && body.sign === expected)
  check('关键词拼到文本前', body.content.text.startsWith('PR提醒'))
}

console.log('\n[3] 事件解析与白名单')
{
  const event = normalizeEvent(FIXTURE)
  check(
    '解析出仓库 / 编号 / 标签',
    event.repo === 'yaklang/yakit' && event.number === 128 && event.label === 'needs-review',
  )
  check('解析出作者与操作人', event.author === 'nonight' && event.actor === 'yakit')
  check(
    '解析出分支与变更统计',
    event.head === 'feat/pr-label-feishu' && event.base === 'main' && event.changedFiles === 9,
  )
  check('白名单命中', isWatched(event, ['needs-review', 'ready-to-merge']) === true)
  check('白名单大小写不敏感', isWatched(event, ['Needs-Review']) === true)
  check('不在白名单被过滤', isWatched(event, ['ready-to-merge']) === false)
  check('白名单为空 = 放行全部', isWatched(event, []) === true)
  check('示例事件只有本次这一个标签', JSON.stringify(event.labels) === '["needs-review"]', JSON.stringify(event.labels))
  check('缺字段的事件返回 null', normalizeEvent({ action: 'labeled' }) === null)
}

console.log('\n[3a] 只精确匹配 ready 与 need more test')
{
  const ready = normalizeEvent(READY_FIXTURE)
  const other = normalizeEvent(FIXTURE)
  const watched = WATCH_LABELS
  check('ready 事件解析出标签 ready', ready.label === 'ready', ready.label)

  check('ready 命中默认白名单', isWatched(ready, watched, { mode: 'exact' }) === true)
  check('大写 READY 也命中', isWatched({ label: 'READY' }, watched, { mode: 'exact' }) === true)
  const needMore = normalizeEvent(NEED_MORE_FIXTURE)
  check('need more test 示例只有这一个标签', JSON.stringify(needMore.labels) === '["need more test"]')
  check(
    'need more test 命中',
    needMore.label === 'need more test' && isWatched(needMore, watched, { mode: 'exact' }) === true,
  )
  check('Need More Test 大小写不敏感', isWatched({ label: 'Need More Test' }, watched, { mode: 'exact' }) === true)
  check('needs-review 不命中', isWatched(other, watched, { mode: 'exact' }) === false)
  check('ready-to-merge 不算 ready', isWatched({ label: 'ready-to-merge' }, watched, { mode: 'exact' }) === false)
  check('ready-for-review 不算 ready', isWatched({ label: 'ready-for-review' }, watched, { mode: 'exact' }) === false)
  check(
    'need more testing 不算 need more test',
    isWatched({ label: 'need more testing' }, watched, { mode: 'exact' }) === false,
  )
  check('标签为空时不命中', isWatched({ label: '' }, watched, { mode: 'exact' }) === false)

  check(
    'contains 模式下 ready-to-merge 仍命中 ready',
    isWatched({ label: 'ready-to-merge' }, ['ready'], { mode: 'contains' }) === true,
  )
  check(
    '未知匹配模式按 exact，ready-to-merge 不命中',
    isWatched({ label: 'ready-to-merge' }, ['ready'], { mode: 'excat' }) === false,
  )
  check('all 模式任何标签都放行', isWatched(other, watched, { mode: 'all' }) === true)

  check(
    '白名单就是代码里的 WATCH_LABELS',
    JSON.stringify(resolveConfig({}).labels) === JSON.stringify(WATCH_LABELS),
    JSON.stringify(resolveConfig({}).labels),
  )
  check('默认匹配模式是 exact', resolveConfig({}).matchMode === 'exact')
  check(
    '环境变量和 --labels 改不了白名单',
    JSON.stringify(resolveConfig({ labels: 'x' }, { PR_LABEL_WATCH_LABELS: 'foo, bar' }).labels) ===
      JSON.stringify(WATCH_LABELS),
  )
  check(
    'PR_LABEL_MATCH_MODE 可切成 contains',
    resolveConfig({}, { PR_LABEL_MATCH_MODE: 'contains' }).matchMode === 'contains',
  )
  check(
    '写错的 PR_LABEL_MATCH_MODE 回到 exact',
    resolveConfig({}, { PR_LABEL_MATCH_MODE: 'excat' }).matchMode === 'exact',
  )
}

console.log('\n[3b] 消息结构：标题=PR title / 内容=作者+分支+URL+labels / footer=触发时间')
{
  const event = normalizeEvent(FIXTURE)
  const card = buildCard(event)
  const flat = JSON.stringify(card)

  check('未命中固定标题时用 PR title', card.card.header.title.content === event.title, card.card.header.title.content)
  const readyHeader = buildCard({ ...event, label: 'ready' }).card.header
  check('ready 标题请值班人员审阅并合并', readyHeader.title.content === '请值班人员审阅并合并')
  check('标题栏没有副标题', readyHeader.subtitle === undefined)
  check(
    '内容第一行是 PR title',
    buildCard({ ...event, label: 'ready' }).card.body.elements[0].content.startsWith(
      'feat&#58; 支持通过飞书 webhook 推送 PR 标签变更\n',
    ),
  )
  const testHeader = buildCard({ ...event, label: 'need more test' }).card.header
  check('need more test 标题请产品进行测试', testHeader.title.content === '请产品进行测试')
  check(
    '标题不含仓库名与标签后缀',
    !card.card.header.title.content.includes('yaklang') && !card.card.header.title.content.includes('被加上标签'),
  )

  check('卡片是 JSON 2.0', card.card.schema === '2.0' && Array.isArray(card.card.body.elements))
  const markdown = card.card.body.elements[0].content
  check('内容含作者', markdown.includes('nonight'))
  check(
    '作者、分支、Labels 各占一行',
    markdown.includes('**作者**：') && markdown.includes('\n**分支**：') && markdown.includes('\n**Labels**：'),
  )
  check('分支含 head → base', markdown.includes('feat&#47;pr&#45;label&#45;feishu → main'))
  check(
    '只展示本次标签，并渲染成 text_tag',
    markdown.includes("<text_tag color='blue'>needs&#45;review</text_tag>") &&
      !markdown.includes('enhancement') &&
      !markdown.includes('ready'),
  )

  const buttons = card.card.body.elements.filter((el) => el.tag === 'button')
  check(
    'footer 只有打开 PR，只能 open_url，且不包 action',
    buttons.length === 1 &&
      buttons[0].text.content === '打开 PR' &&
      buttons[0].behaviors.length === 1 &&
      buttons[0].behaviors[0].type === 'open_url' &&
      buttons[0].behaviors[0].default_url === 'https://github.com/yaklang/yakit/pull/128' &&
      !card.card.body.elements.some((el) => el.tag === 'action' || el.tag === 'column_set') &&
      !JSON.stringify(card).includes('复制 PR 链接'),
  )

  const footer = card.card.body.elements.find((el) => el.text_size === 'notation')
  check('footer 是小字 markdown', footer.tag === 'markdown', footer.tag)
  check('footer 内容是触发时间', /触发时间 \d{4}\/\d{2}\/\d{2}/.test(footer.content), footer.content)

  // 不该再出现被删掉的字段
  check('不再出现变更行数/文件数', !flat.includes('个文件') && !flat.includes('+412'))
  check('不再出现操作人与描述摘要', !flat.includes('添加') && !flat.includes('监听 PR label'))

  const text = buildCard(event, { msgType: 'text' }).content.text
  check(
    'text 模式字段齐全',
    ['nonight', 'main', 'https://github.com/yaklang/yakit/pull/128', 'needs-review', '触发时间'].every((s) =>
      text.includes(s),
    ),
    text,
  )

  // labels 为空 / 缺字段时不炸
  const bare = buildCard({ title: 't', url: 'u', labels: [], number: 1, label: '', author: '', head: '', base: '' })
  check('labels 为空显示「无」', JSON.stringify(bare).includes('无'))
  check('没写标题时回落到 PR 号', buildCard({ title: '', number: 7, labels: [] }).card.header.title.content === '#7')
}

console.log('\n[3c] 外部文本不能成为卡片标记')
{
  const event = {
    ...normalizeEvent(READY_FIXTURE),
    title: '<at id=all></at> [打开 PR](https://example.com) **修复**',
    author: '<at id=ou_test></at>',
    head: 'feat/<at id=all></at>',
    base: 'release_[test]',
    label: '</text_tag><at id=all></at>',
  }
  const card = buildCard(event)
  const markdown = card.card.body.elements[0].content
  check('标题中的 @ 标签被转义', markdown.startsWith('&lt;at id=all&gt;&lt;&#47;at&gt;'))
  check(
    '标题中的链接和加粗被转义',
    markdown.includes('&#91;打开 PR&#93;&#40;https&#58;&#47;&#47;example&#46;com&#41; &#42;&#42;修复&#42;&#42;'),
  )
  check(
    '作者和两端分支均按普通文本显示',
    markdown.includes('**作者**：&lt;at id=ou&#95;test&gt;&lt;&#47;at&gt;') &&
      markdown.includes('**分支**：feat&#47;&lt;at id=all&gt;&lt;&#47;at&gt; → release&#95;&#91;test&#93;'),
  )
  check(
    '标签不能闭合 text_tag 或注入 @ 标签',
    markdown.includes("<text_tag color='blue'>&lt;&#47;text&#95;tag&gt;&lt;at id=all&gt;&lt;&#47;at&gt;</text_tag>") &&
      !markdown.includes('<at '),
  )
  check('plain_text 标题不做 Markdown 转义', card.card.header.title.content === event.title)
  const literal = buildCard({ ...event, title: '&lt;at&gt; \\ * _ ` # - + ! | ~ {x}' }).card.body.elements[0].content
  check(
    '已有实体、反斜杠和 Markdown 分隔符只按字面值展示',
    literal.startsWith(
      '&amp;lt;at&amp;gt; &#92; &#42; &#95; &#96; &#35; &#45; &#43; &#33; &#124; &#126; &#123;x&#125;\n',
    ),
  )
}

console.log('\n[3d] text 模式不能注入 @ 标签')
{
  const mention = '<at user_id="all">所有人</at>'
  const literalMention = '＜at user_id="all"＞所有人＜/at＞'
  const event = { ...normalizeEvent(READY_FIXTURE), title: mention }
  const text = buildCard(event, { msgType: 'text' }).content.text
  check(
    '固定标题下的 PR 标题不能触发全员提醒',
    text.startsWith(`请值班人员审阅并合并\n${literalMention}\n`) && !text.includes('<at'),
  )
  const fallback = buildCard({ ...event, label: 'other' }, { msgType: 'text' }).content.text
  check('回落到 PR 标题时也不能注入 @ 标签', fallback.startsWith(`${literalMention}\n`))
  check(
    '作者、两端分支、标签和 URL 中的标签均失效',
    ['author', 'head', 'base', 'label', 'url'].every((field) => {
      const value = buildCard({ ...event, title: '正常标题', [field]: mention }, { msgType: 'text' }).content.text
      return value.includes(literalMention) && !/[<>]/.test(value)
    }),
  )
  const normalTitle = 'fix: **文本** & [链接](https://example.com) _test_'
  const normal = buildCard({ ...event, title: normalTitle }, { msgType: 'text' }).content.text
  check(
    'text 模式保留普通字符、链接和换行，不应用 Markdown 转义',
    normal.startsWith(`请值班人员审阅并合并\n${normalTitle}\n作者：nonight\n`) && normal.includes(`PR：${event.url}\n`),
  )
  check(
    '大小写、单引号及空白变体均不能保留标签边界',
    ["<AT user_id='all'>所有人</AT>", '<at\nuser_id = "all">所有人</at>', '<at user_id="ou_test">用户</at>'].every(
      (title) => {
        const value = buildCard({ ...event, title }, { msgType: 'text' }).content.text
        return value.includes('＜') && value.includes('＞') && !/[<>]/.test(value)
      },
    ),
  )
}

console.log('\n[4] 端到端：dry-run / 真实发送 / 过滤')
{
  const mock = await startMock()
  const base = { eventFile: READY_FILE, webhookUrl: mock.url, secret: 's3cret' }
  const withLabel = (name) => {
    const payload = structuredClone(READY_FIXTURE)
    payload.label.name = name
    return JSON.stringify(payload)
  }

  const dry = await main({ ...base, dryRun: true }, { logger: quiet })
  check('dry-run 不发请求', dry.dryRun === true && mock.calls.length === 0)

  const sent = await main(base, { logger: quiet })
  check('默认配置下 ready 会发送', sent.ok === true, JSON.stringify(sent))
  check('只发 1 条', mock.calls.length === 1, String(mock.calls.length))
  const sentCard = JSON.stringify(mock.calls[0])
  check('ready 标题请值班人员审阅并合并', mock.calls[0].card?.header?.title?.content === '请值班人员审阅并合并')
  check('标题栏没有副标题', mock.calls[0].card?.header?.subtitle === undefined)
  check(
    '正文第一行是 PR title',
    mock.calls[0].card?.body?.elements?.[0]?.content?.startsWith(
      '【测试】feat&#58; 支持通过飞书 webhook 推送 PR 标签变更\n',
    ),
  )
  check(
    '正文含作者/分支/URL/labels',
    ['nonight', 'main', 'pull/128', "<text_tag color='green'>ready</text_tag>"].every((s) => sentCard.includes(s)),
  )
  check('ready 标题栏是绿色', mock.calls[0].card?.header?.template === 'green')

  const needMore = await main({ webhookUrl: mock.url, eventJson: withLabel('need more test') }, { logger: quiet })
  check(
    '默认配置下 need more test 会发送，标题栏是橙色',
    needMore.ok === true && mock.calls.length === 2 && mock.calls[1].card?.header?.template === 'orange',
    JSON.stringify(needMore),
  )

  const prefixed = await main({ webhookUrl: mock.url, eventJson: withLabel('ready-to-merge') }, { logger: quiet })
  check('ready-to-merge 被跳过', prefixed.skipped === true && mock.calls.length === 2, JSON.stringify(prefixed))

  const suffixed = await main({ webhookUrl: mock.url, eventJson: withLabel('need more testing') }, { logger: quiet })
  check('need more testing 被跳过', suffixed.skipped === true && mock.calls.length === 2, JSON.stringify(suffixed))

  const filtered = await main({ eventFile: OTHER_FILE, webhookUrl: mock.url, secret: 's3cret' }, { logger: quiet })
  check(
    '默认配置下 needs-review 被跳过',
    filtered.skipped === true && mock.calls.length === 2,
    JSON.stringify(filtered),
  )

  const explicit = await main(
    { eventFile: OTHER_FILE, webhookUrl: mock.url, labels: 'needs-review' },
    { logger: quiet },
  )
  check(
    '传入 --labels 仍然按代码里的名单跳过',
    explicit.skipped === true && mock.calls.length === 2,
    JSON.stringify(explicit),
  )

  const textResult = await main(
    {
      webhookUrl: mock.url,
      eventJson: JSON.stringify({
        ...READY_FIXTURE,
        pull_request: { ...READY_FIXTURE.pull_request, title: '<at user_id="all">所有人</at>' },
      }),
    },
    { logger: quiet, env: { PR_LABEL_MSG_TYPE: 'text' } },
  )
  const textMessage = mock.calls[mock.calls.length - 1]
  check(
    '环境变量切换 text 后，实际发送的消息不含可执行 @ 标签',
    textResult.ok === true &&
      textMessage.msg_type === 'text' &&
      textMessage.content.text.includes('＜at user_id="all"＞所有人＜/at＞') &&
      !/[<>]/.test(textMessage.content.text),
  )

  const probe = await main({ webhookUrl: mock.url, probe: true }, { logger: quiet })
  const last = mock.calls[mock.calls.length - 1]
  check('--probe 发出连通性测试消息', probe.ok === true && last?.msg_type === 'text', JSON.stringify(last))
  mock.close()
}

console.log('\n[5] 发送健壮性')
{
  const retry = await startMock(() => 'retry')
  const result = await sendToFeishu(
    { msg_type: 'text', content: { text: 'x' } },
    { webhookUrl: retry.url, retries: 3, logger: quiet, sleepFn: () => Promise.resolve() },
  )
  check('限流重试 3 次后失败', result.ok === false && result.attempts === 3)
  check('共发出 3 次请求', retry.calls.length === 3, String(retry.calls.length))
  retry.close()

  const ok = await startMock()
  const big = await sendToFeishu(
    { msg_type: 'text', content: { text: 'x'.repeat(21 * 1024) } },
    { webhookUrl: ok.url, retries: 1, logger: quiet },
  )
  check('超过 20KB 直接拦截', big.ok === false && ok.calls.length === 0)
  ok.close()

  const noUrl = await sendToFeishu({ msg_type: 'text', content: { text: 'x' } }, { logger: quiet })
  check('没有 webhook 地址时明确报错', noUrl.ok === false && noUrl.reason.includes('webhook'))

  for (const [code, hint] of [
    [9499, '20KB'],
    [19021, '时间戳'],
    [19022, '白名单'],
    [19024, '关键词'],
  ]) {
    const failed = await startMock(() => ({ code, msg: 'fail' }))
    const once = await sendToFeishu(
      { msg_type: 'text', content: { text: 'x' } },
      { webhookUrl: failed.url, retries: 3, logger: quiet },
    )
    check(
      `${code} 不重试`,
      once.ok === false && once.attempts === 1 && failed.calls.length === 1 && once.reason.includes(hint),
      JSON.stringify(once),
    )
    failed.close()
  }

  let networkCalls = 0
  const network = await sendToFeishu(
    { msg_type: 'text', content: { text: 'x' } },
    {
      webhookUrl: 'http://127.0.0.1:9/hook',
      retries: 3,
      logger: quiet,
      fetchImpl: async () => {
        networkCalls += 1
        throw new Error('socket hang up')
      },
    },
  )
  check('网络异常不重试，避免重复卡片', network.ok === false && networkCalls === 1, String(networkCalls))
}

console.log(`\n结果：${passed} 通过 / ${failed} 失败\n`)
process.exitCode = failed === 0 ? 0 : 1
