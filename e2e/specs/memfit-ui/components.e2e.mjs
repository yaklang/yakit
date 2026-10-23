import assert from 'node:assert/strict'
import { capture } from '../../fixtures/memfit-ui/capture.mjs'
import { examples } from '../../fixtures/memfit-ui/examples.mjs'

const button = (label) => $(`//button[normalize-space(.)='${label}']`)
const show = async (name, options = {}) => {
  await browser.execute((name, options) => window.memfitUITest.show(name, options), name, options)
  await $(
    `main[data-example="${name === 'question' ? 'ui-question:question' : `ui-component:${name}`}"]`,
  ).waitForExist()
  await (
    name === 'question' ? $('[data-testid="composer"] section') : $('section[aria-label="交互组件"]')
  ).waitForDisplayed()
}
const messages = () => browser.execute(() => window.memfitUITest.messages.filter((event) => event.IsFreeInput))
const overlayVisible = (selector) =>
  browser.execute((selector) => {
    const element = document.querySelector(selector)
    if (!element) return false
    const style = getComputedStyle(element)
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Number(style.opacity) > 0 &&
      element.getBoundingClientRect().height > 0
    )
  }, selector)

describe('Memfit real Chromium component regression', () => {
  before(async () => {
    await browser.waitUntil(async () => browser.execute(() => !!window.memfitUITest || window.memfitUIErrors?.length))
    assert.deepEqual(await browser.execute(() => window.memfitUIErrors), [])
    const names = await browser.execute(() => window.memfitUITest.registeredComponents)
    assert.deepEqual(names.sort(), Object.keys(examples).sort())
  })
  afterEach(async () => {
    assert.deepEqual(await browser.execute(() => window.memfitUITest.errors), [], 'No renderer exceptions')
  })

  for (const theme of ['light', 'dark']) {
    for (const name of Object.keys(examples)) {
      it(`${theme} renders ${name} without fallback or overflow`, async () => {
        await browser.electron.execute(
          (electron, width) => electron.BrowserWindow.getAllWindows()[0].setContentSize(width, 850),
          theme === 'dark' ? 800 : 1100,
        )
        await browser.execute((theme) => window.memfitUITest.theme(theme), theme)
        await show(name)
        const card = $('section[aria-label="交互组件"]')
        assert.ok((await card.getText()).trim().length)
        assert.ok(!(await card.getText()).includes('文本降级'))
        assert.ok(!(await card.getText()).includes('部分组件已降级'))
        const bounds = await browser.execute(() => {
          const card = document.querySelector('section[aria-label="交互组件"]')
          const rect = card.getBoundingClientRect()
          return {
            width: rect.width,
            height: rect.height,
            right: rect.right,
            viewport: innerWidth,
            scroll: card.scrollWidth,
            client: card.clientWidth,
            theme: getComputedStyle(card).getPropertyValue('--Colors-Use-Neutral-Text-1-Title').trim(),
          }
        })
        assert.ok(bounds.width > 100 && bounds.height > 20 && bounds.right <= bounds.viewport)
        assert.ok(bounds.scroll <= bounds.client + 1, `${name} overflows`)
        assert.ok(bounds.theme, 'Production theme tokens loaded')
        await capture(`${theme}-${name}`)
      })
    }
  }

  it('real chart geometry and legend survive reparsing', async () => {
    await show('BarChart')
    assert.equal(await $$('rect[data-point]').length, 3)
    await button('本次').click()
    assert.equal(await $$('rect[data-point]').length, 1)
    await browser.execute(() => window.memfitUITest.reparse())
    assert.equal(await button('本次').getAttribute('aria-pressed'), 'false')
    assert.equal((await messages()).length, 0)
    await show('LineChart')
    assert.equal(await $$('circle[data-point]').length, 3)
  })

  for (const mode of ['blocking', 'async']) {
    it(`${mode} form uses the composer overlay and submits exactly once`, async () => {
      await show('question', { mode, form: true })
      const region = $('[data-testid="composer"] section')
      await region.$('input[type="text"]').setValue('测试用户')
      await browser.execute(() => window.memfitUITest.remount())
      await expect(region.$('input[type="text"]')).toHaveValue('测试用户')
      await capture(`question-form-${mode}`)
      await browser.execute(() => {
        const input = document.querySelector('[data-testid="composer"] section input')
        input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true }))
        input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
      })
      assert.equal((await messages()).length, 0)
      await browser.execute(() => {
        const button = Array.from(document.querySelectorAll('[data-testid="composer"] section button')).find(
          (button) => button.textContent.trim() === '提交',
        )
        for (let index = 0; index < 15; index++) button.click()
      })
      await region.waitForExist({ reverse: true })
      const sent = await messages()
      assert.equal(sent.length, 1)
      const receipt = JSON.parse(sent[0].UserInteraction)
      assert.equal(receipt.source, 'questionnaire')
      assert.deepEqual(receipt.values, { name: '测试用户' })
      await expect($('[data-testid="history"]')).toHaveText(expect.stringContaining('姓名：测试用户'))
      await browser.execute(() => window.memfitUITest.remount())
      assert.equal(await button('提交').isExisting(), false)
      assert.equal(await button('跳过此题').isExisting(), false)
    })
  }

  it('table sorting and filtering stay local and preserve their state', async () => {
    await show('DataTable')
    await $('button[aria-label="排序：问题数量"]').click()
    await expect($('tbody tr')).toHaveText(expect.stringContaining('管理界面'))
    await $('input[aria-label="筛选：模块"]').setValue('管理')
    await browser.execute(() => window.memfitUITest.reparse())
    await expect($('input[aria-label="筛选：模块"]')).toHaveValue('管理')
    assert.equal(await $$('tbody tr').length, 1)
    assert.equal(await $$('input[type="checkbox"]').length, 0)
    assert.equal(await button('提交到对话').isExisting(), false)
    assert.equal((await messages()).length, 0)
  })

  it('tabs and portal overlays work with real focus and Escape', async () => {
    await show('Tabs')
    await $('[role="tab"][aria-selected="false"]').click()
    await expect($('[role="tabpanel"][aria-hidden="false"]')).toHaveText('200 OK')
    await browser.execute(() => window.memfitUITest.reparse())
    await expect($('[role="tab"][aria-selected="true"]')).toHaveText('响应')
    await show('Popover')
    await button('查看原始字段').click()
    await browser.waitUntil(() => overlayVisible('.ant-popover'))
    await capture('popover-open')
    await browser.keys('Escape')
    await expect(button('查看原始字段')).toHaveAttribute('aria-expanded', 'false')
    await browser.waitUntil(async () => !(await overlayVisible('.ant-popover')))
    await show('Tooltip')
    await button('术语解释').moveTo()
    await browser.waitUntil(() => overlayVisible('.ant-tooltip'))
    await capture('tooltip-open')
    await browser.keys('Escape')
    await browser.waitUntil(async () => !(await overlayVisible('.ant-tooltip')))
    assert.equal((await messages()).length, 0)
  })

  for (const mode of ['blocking', 'async']) {
    it(`${mode} question supports paging, IME, draft and terminal summary`, async () => {
      await browser.electron.execute((electron) => electron.BrowserWindow.getAllWindows()[0].setContentSize(800, 850))
      await show('question', { mode })
      const region = $('[data-testid="composer"] section')
      assert.equal(await region.$$('input:checked').length, 0)
      assert.equal(await $('[data-testid="history"]').$$('input').length, 0)
      await region.$('textarea').setValue('架构师')
      await browser.execute(() => {
        const input = document.querySelector('[data-testid="composer"] section textarea')
        input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true }))
        input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
      })
      assert.equal((await messages()).length, 0)
      await browser.keys('Escape')
      await region.$('textarea').waitForExist({ reverse: true })
      await region.$('button').click()
      await expect(region.$('textarea')).toHaveValue('架构师')
      await button('下一题').click()
      assert.equal(await region.$('textarea').isExisting(), false)
      await region.$$('input[type="checkbox"]')[0].click()
      await region.$$('input[type="checkbox"]')[1].click()
      await button('下一题').click()
      await region.$('label.ant-radio-button-wrapper').click()
      await capture(`question-${mode}`)
      await button('提交').click()
      await region.waitForExist({ reverse: true })
      const sent = await messages()
      assert.equal(sent.length, 1)
      const receipt = JSON.parse(sent[0].UserInteraction)
      assert.equal(receipt.answers[0].text, '架构师')
      assert.deepEqual(receipt.answers[1].selected, ['data', 'deploy'])
      await expect($('[data-testid="history"]')).toHaveText(expect.stringContaining('已回答'))
      assert.equal(await button('提交').isExisting(), false)
      assert.equal(await button('跳过此题').isExisting(), false)
    })
  }

  it('expired question is recoverable from history', async () => {
    await show('question', { deadline: Date.now() + 2500 })
    await $('[data-testid="composer"] section').waitForExist({ reverse: true })
    await $('[data-testid="history"] button').click()
    await $('[data-testid="composer"] section textarea').waitForDisplayed()
    assert.equal((await messages()).length, 0)
  })

  it('unsupported catalog renders readable fallback instead of a blank card', async () => {
    await show('Text')
    const document = {
      ...examples.Text,
      catalogVersion: 'future-version',
      fallback: '客户端暂不支持，以下为文字说明。',
    }
    await browser.execute((source) => window.memfitUITest.setSource(source, true), JSON.stringify(document))
    await expect($('section[aria-label="交互组件"]')).toHaveText(expect.stringContaining(document.fallback))
    assert.equal((await messages()).length, 0)
  })
})
