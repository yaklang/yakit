import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import html from '../../../yakit-aux.html?raw'

const send = vi.fn()
const loadAux = vi.fn()
const originalRequire = window.require
let loadingStyle: HTMLStyleElement

beforeEach(() => {
  vi.resetModules()
  send.mockClear()
  loadAux.mockClear()
  vi.doMock('../aux-entry', () => {
    loadAux()
    return {}
  })
  const page = new DOMParser().parseFromString(html, 'text/html')
  document.body.innerHTML = page.body.innerHTML
  loadingStyle = page.querySelector('style')!
  document.head.append(loadingStyle)
  Object.defineProperty(window, 'require', {
    configurable: true,
    writable: true,
    value: () => ({ ipcRenderer: { send } }),
  })
})

afterEach(() => {
  loadingStyle.remove()
  document.body.innerHTML = ''
  delete document.body.dataset.mode
  window.require = originalRequire
  window.history.replaceState(null, '', '/')
  vi.doUnmock('../aux-entry')
})

describe('aux bootstrap', () => {
  it('prepares the static loading page before sending ready without starting the aux app', async () => {
    window.history.replaceState(null, '', '/yakit-aux.html?mode=child-loading')
    send.mockImplementationOnce(() => {
      expect(document.querySelector('#initial-loading span')?.textContent).toBe('正在准备加载资源，请稍候...')
      expect(document.body.dataset.mode).toBe('child-loading')
    })
    await import('../aux-bootstrap')
    await vi.dynamicImportSettled()
    expect(send).toHaveBeenCalledExactlyOnceWith('ready-to-load-child')
    expect(loadAux).not.toHaveBeenCalled()
    expect(getComputedStyle(document.querySelector('#initial-loading span')!).fontSize).toBe('24px')
    expect(getComputedStyle(document.querySelector('.initial-spinner')!).display).toBe('none')
  })

  it.each(['?windowId=console&route=engine-console', '?mode=other&windowId=log&route=ai-chat-log'])(
    'starts the original aux app without the child handshake (%s)',
    async (search) => {
      window.history.replaceState(null, '', `/yakit-aux.html${search}`)
      await import('../aux-bootstrap')
      await vi.dynamicImportSettled()
      expect(loadAux).toHaveBeenCalledOnce()
      expect(send).not.toHaveBeenCalled()
      expect(document.body.dataset.mode).toBeUndefined()
      expect(document.querySelector('#initial-loading span')?.textContent).toBe('正在加载')
      expect(getComputedStyle(document.querySelector('#initial-loading span')!).fontSize).toBe('16px')
      expect(getComputedStyle(document.querySelector('.initial-spinner')!).display).not.toBe('none')
    },
  )
})
