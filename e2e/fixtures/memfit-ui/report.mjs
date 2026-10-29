import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char],
  )

function caption(file) {
  if (/^(light|dark)-/.test(file)) {
    const [theme, component] = file.replace('.png', '').split('-')
    return `${component} · ${theme === 'light' ? '亮色' : '暗色'}`
  }
  const name = file.replace('.png', '')
  const match = name.match(/^ask-(async|blocking)-(questions|form)-(light|dark)-(.+)$/)
  if (match) {
    const [, mode, kind, theme, state] = match
    const states = {
      single: '单选与自由文本',
      multiple: '多选',
      last: '最后一题',
      empty: '填写前',
      invalid: '校验失败',
      filled: '填写后',
      submitted: '已回答，操作按钮移除',
    }
    return `${mode === 'async' ? '异步' : '阻塞'}${kind === 'form' ? '参数表单' : '分页问卷'} · ${theme === 'light' ? '亮色' : '暗色'} · ${states[state] || state}`
  }
  return name
}

// Actual Electron screenshots, without compositing or recreating the production UI.
export async function writeGallery(directory) {
  const files = await readdir(directory)
  const results = files.includes('results.json')
    ? JSON.parse(await readFile(path.join(directory, 'results.json'), 'utf8'))
    : []
  const images = files.filter((file) => file.endsWith('.png')).sort()
  const groups = [
    {
      id: 'questions',
      title: 'ask：分页问卷',
      description:
        '输入栏浮层内逐题显示单选、多选与可选自由文本。同步和异步共用 UI，状态提示不同；提交后浮层关闭，历史保留只读摘要。',
      include: (file) => file.startsWith('ask-') && file.includes('-questions-'),
    },
    {
      id: 'forms',
      title: 'ask：参数表单',
      description:
        '表单属于 ask，不在展示 catalog 中。覆盖字符串、枚举、整数、布尔、多选、默认值、必填校验及提交后的只读摘要。',
      include: (file) => file.startsWith('ask-') && file.includes('-form-'),
    },
    {
      id: 'display',
      title: 'render_ui：展示组件',
      description:
        '12 个 catalog 组件的亮暗主题。图例、表格筛选/排序/分页、Tabs、Tooltip、Popover 只影响本地展示，不向模型提交回答。',
      include: (file) => /^(light|dark)-/.test(file) || ['popover-open.png', 'tooltip-open.png'].includes(file),
    },
    {
      id: 'failures',
      title: '失败现场',
      description: '以下截图对应失败用例，需要结合测试结果定位。',
      include: (file) => file.startsWith('failure-'),
    },
  ]
  const sections = groups
    .map(({ id, title, description, include }) => {
      const selected = images.filter(include)
      if (!selected.length) return ''
      return `<section id="${id}"><h2>${title}</h2><p>${description}</p><div class="gallery">${selected
        .map(
          (file) =>
            `<figure><figcaption>${escape(caption(file))}</figcaption><a href="${encodeURIComponent(file)}" target="_blank" rel="noopener"><img loading="lazy" src="${encodeURIComponent(file)}" alt="${escape(caption(file))}"></a></figure>`,
        )
        .join('')}</div></section>`
    })
    .join('')
  const passed = results.filter((result) => result.passed).length
  const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Memfit ask / render_ui 回归效果</title><style>
body{margin:0 auto;padding:28px;max-width:1500px;background:#f7f8fa;color:#202938;font:15px/1.7 system-ui,sans-serif}
h1{font-size:26px}h2{font-size:21px}nav{display:flex;gap:20px;flex-wrap:wrap}a{color:#356bb6}.note{background:#fff;padding:16px;border:1px solid #dce1e8;border-radius:8px}
.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,520px),1fr));gap:18px}figure{margin:0;background:white;border:1px solid #dce1e8;border-radius:8px;overflow:hidden}figcaption{padding:10px 14px;font-weight:600}img{display:block;width:100%;height:auto}section{margin-top:32px}li{overflow-wrap:anywhere}.failed{color:#b42318}
</style><h1>Memfit ask / render_ui 回归效果</h1>
<p>本次运行：${escape(path.basename(directory))} · ${passed} / ${results.length} 项通过 · ${images.length} 张实际截图</p>
<p class="note">这是实际生产组件、Yakit 控件与主题在独立 Electron 测试容器中的截图，点击可查看原图。外层会话容器和传输使用测试适配器，未连接 LLM / Go 引擎；不代表完整应用端到端联调，也没有自动像素基准比较。</p>
<nav>${groups.map(({ id, title }) => `<a href="#${id}">${title}</a>`).join('')}</nav>${sections}
<section><h2>逐项测试结果</h2><p><a href="results.json">原始 results.json</a></p><ul>${results
    .map(
      (result) =>
        `<li${result.passed ? '' : ' class="failed"'}>${result.passed ? '通过' : '失败'} · ${escape(result.title)}${result.error ? ` — ${escape(result.error)}` : ''}</li>`,
    )
    .join('')}</ul></section></html>`
  await writeFile(path.join(directory, 'index.html'), html)
}
