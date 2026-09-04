import os from 'os'
import path from 'path'
import { pathToFileURL } from 'url'
import { describe, expect, it, vi } from 'vitest'
import { assertExpectedWindowSender, isTrustedAppSender } from '../security'

const createUrlEvent = (url) => ({
  sender: {
    getURL: () => url,
  },
})

describe('main-process IPC sender checks', () => {
  it('trusts packaged renderer files inside the application directory', () => {
    const rendererPath = path.resolve(process.cwd(), 'app/renderer/pages/main/index.html')
    expect(isTrustedAppSender(createUrlEvent(pathToFileURL(rendererPath).toString()))).toBe(true)
  })

  it('rejects arbitrary local file renderers outside the application directory', () => {
    const externalFile = path.resolve(os.tmpdir(), 'attacker.html')
    expect(isTrustedAppSender(createUrlEvent(pathToFileURL(externalFile).toString()))).toBe(false)
  })

  it('requires the expected top-level webContents for privileged scoped IPC', () => {
    const mainFrame = {}
    const expectedWebContents = { isDestroyed: vi.fn(() => false), mainFrame }
    const expectedWindow = { webContents: expectedWebContents }

    expect(() =>
      assertExpectedWindowSender(
        { sender: expectedWebContents, senderFrame: mainFrame },
        expectedWindow,
        'privileged-action',
      ),
    ).not.toThrow()
    expect(() =>
      assertExpectedWindowSender({ sender: { id: 99 }, senderFrame: {} }, expectedWindow, 'privileged-action'),
    ).toThrow(/unexpected IPC sender/)
  })
})
