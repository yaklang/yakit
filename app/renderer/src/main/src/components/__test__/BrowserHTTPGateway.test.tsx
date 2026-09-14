import React from 'react'
import { act } from 'react-dom/test-utils'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { BrowserHTTPGateway } from '../BrowserHTTPGateway'
import { getRemoteProjectValue } from '@/utils/kv'

vi.mock('@/utils/kv', () => ({ getRemoteProjectValue: vi.fn() }))
vi.mock('@yakit-libs/yakit-ui-icons/oldicon/ChromeSvgIcon', () => ({ ChromeSvgIcon: () => null }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('../yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}))
vi.mock('../yakitUI/YakitModal/YakitModal', () => ({
  YakitModal: ({ visible, children }: any) => (visible ? <div role="dialog">{children}</div> : null),
}))
vi.mock('../yakitUI/YakitEditor/YakitEditor', () => ({
  YakitEditor: ({ value }: any) => <pre data-testid="packet">{value}</pre>,
}))
vi.mock('../yakitUI/YakitTag/YakitTag', () => ({ YakitTag: ({ children }: any) => <span>{children}</span> }))
vi.mock('../yakitUI/YakitSpin/YakitSpin', () => ({ YakitSpin: () => null }))
vi.mock('../yakitUI/YakitEmpty/YakitEmpty', () => ({ YakitEmpty: ({ title }: any) => <span>{title}</span> }))

it('opens packet changes, distinguishes disabled responses, and clears evidence when changing flows', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener: () => {}, removeListener: () => {} }))
  vi.mocked(getRemoteProjectValue)
    .mockResolvedValueOnce(
      JSON.stringify({
        version: 1,
        browserRef: 'A',
        requestEnabled: true,
        responseEnabled: false,
        directions: {
          request: {
            proofLevel: 'structure',
            explanation: {
              directions: [
                {
                  direction: 'request',
                  stages: [
                    {
                      id: 'input',
                      kind: 'input',
                      title: 'Read field',
                      summary: 'Read plaintext',
                      inputPaths: ['body.data'],
                      outputPaths: ['plaintext'],
                    },
                    {
                      id: 'aes',
                      title: 'Page AES',
                      summary: 'Call captured function',
                      inputPaths: ['plaintext'],
                      outputPaths: ['ciphertext'],
                      owner: 'page',
                    },
                    {
                      id: 'output',
                      kind: 'output',
                      title: 'Write form',
                      summary: 'Write encrypted data',
                      inputPaths: ['ciphertext'],
                      outputPaths: ['body.data'],
                    },
                  ],
                },
              ],
            },
          },
        },
      }),
    )
    .mockResolvedValueOnce('')
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  const props = {
    request:
      'POST / HTTP/1.1\r\nContent-Type: application/x-www-form-urlencoded\r\n\r\ndata=%7B%22username%22%3A%22hacker%22%7D',
    wireRequest: 'POST / HTTP/1.1\r\nContent-Type: application/x-www-form-urlencoded\r\n\r\ndata=ciphertext%2B%3D',
    response: 'server response',
    wireResponse: 'server response',
  }
  try {
    await act(async () => {
      root.render(<BrowserHTTPGateway id={1} {...props} />)
    })
    await act(async () => {
      host.querySelector('button')!.click()
    })
    expect(host.querySelector('[role="dialog"]')).not.toBeNull()
    expect(host.textContent).toContain('BrowserHTTPGateway.proof.structure')
    expect(host.querySelectorAll('.ant-steps-item-container')).toHaveLength(3)
    expect(host.querySelectorAll('[data-testid="packet"]')).toHaveLength(0)
    expect(host.textContent).toContain('"username": "hacker"')
    expect(host.textContent).toContain('ciphertext+=')
    await act(async () => {
      ;(host.querySelectorAll('.ant-steps-item-container')[0] as HTMLElement).click()
    })
    expect(host.textContent).not.toContain('ciphertext+=')
    await act(async () => {
      ;(host.querySelectorAll('.ant-steps-item-container')[2] as HTMLElement).click()
    })
    expect(host.querySelector('[data-testid="packet"]')?.textContent).toBe(props.wireRequest)
    await act(async () => {
      ;(host.querySelector('input[value="response"]') as HTMLInputElement).click()
    })
    expect(host.textContent).toContain('BrowserHTTPGateway.disabled')
    expect(host.textContent).not.toContain('BrowserHTTPGateway.state.executed')
    await act(async () => {
      root.render(<BrowserHTTPGateway id={2} {...props} />)
    })
    expect(host.querySelector('[role="dialog"]')).toBeNull()
    await act(async () => {
      host.querySelector('button')!.click()
    })
    expect(host.textContent).toContain('BrowserHTTPGateway.unknown')
    expect(host.textContent).not.toContain('BrowserHTTPGateway.proof.structure')
  } finally {
    await act(async () => {
      root.unmount()
    })
    host.remove()
    vi.unstubAllGlobals()
  }
})
