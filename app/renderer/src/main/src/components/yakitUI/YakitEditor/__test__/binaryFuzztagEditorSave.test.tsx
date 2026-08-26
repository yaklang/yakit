import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { BinaryFuzztagHexModal as BinaryFuzztagHexModalComponent } from '../BinaryFuzztagHexModal'
import {
  bytesToUnquoteString,
  collapseBinaryFuzztag,
  decodeBinaryTag,
  encodeBytesToTag,
  expandBinaryFuzztag,
  packetTextToRawBytes,
  type BinaryFuzztagEntry,
} from '../binaryFuzztag'

vi.mock('react-hex-editor', () => ({
  default: ({ onSetValue }: { onSetValue?: (offset: number, value: number) => void }) => (
    <button
      type="button"
      onClick={() => {
        for (let offset = 0; offset < 29; offset++) {
          onSetValue?.(offset, 0x11)
        }
      }}
    >
      overwrite first HEX row
    </button>
  ),
}))

vi.mock('react-hex-editor/themes/oneDarkPro', () => ({ default: {} }))
vi.mock('@/hook/useTheme', () => ({ useTheme: () => ({ theme: 'light' }) }))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children, icon, type: _type, size: _size, ...props }: any) => (
    <button type="button" {...props}>
      {icon}
      {children}
    </button>
  ),
}))
vi.mock('@/components/yakitUI/YakitInput/YakitInput', () => ({
  YakitInput: (props: any) => <input {...props} />,
}))
vi.mock('@/components/yakitUI/YakitModal/YakitModalConfirm', () => ({
  showYakitModal: vi.fn(),
}))
vi.mock('../../YakitDropdownMenu/YakitDropdownMenu', () => ({
  YakitDropdownMenu: ({ children }: any) => children,
}))
vi.mock('@/assets/newIcon', () => ({ DocumentDuplicateSvgIcon: () => null }))
vi.mock('@/assets/icon/outline', () => ({ OutlineExportIcon: () => null }))
vi.mock('@/utils/clipboard', () => ({ setClipboardText: vi.fn() }))
vi.mock('@/utils/notification', () => ({ warn: vi.fn(), yakitNotify: vi.fn() }))
vi.mock('@/utils/openWebsite', () => ({ saveABSFileToOpen: vi.fn() }))

let BinaryFuzztagHexModal: typeof BinaryFuzztagHexModalComponent

beforeAll(async () => {
  Object.assign(window as any, {
    require: () => ({
      ipcRenderer: {
        invoke: vi.fn(async (channel: string, params: { Text: string; WorkFlow: { CodecType: string }[] }) => {
          if (channel !== 'NewCodec' || params.WorkFlow[0]?.CodecType !== 'StrUnQuote') {
            throw new Error(`unexpected IPC call: ${channel}`)
          }
          return { RawResult: packetTextToRawBytes(`{{unquote(${params.Text})}}`) }
        }),
      },
    }),
  })
  BinaryFuzztagHexModal = (await import('../BinaryFuzztagHexModal')).BinaryFuzztagHexModal
})

afterEach(() => {
  cleanup()
})

const includesBytes = (packet: Uint8Array, expected: Uint8Array): boolean => {
  outer: for (let i = 0; i <= packet.length - expected.length; i++) {
    for (let j = 0; j < expected.length; j++) {
      if (packet[i + j] !== expected[j]) {
        continue outer
      }
    }
    return true
  }
  return false
}

describe('Binary chip HEX editor save path', () => {
  it('submits edited bytes and replaces the Monaco chip with one unquote layer', async () => {
    // This follows the actual UI boundary that regressed in ID=3:
    // react-hex-editor -> modal dataRef -> Submit -> new chip placeholder ->
    // useBinaryFold expansion -> MITMv2 request text.
    // Match the real redis-poc ZIP scale from ID=3 so a large inline tag cannot
    // accidentally take a different save path than a tiny unit-test fixture.
    const original = new Uint8Array(47_213)
    for (let i = 0; i < original.length; i++) {
      original[i] = (i * 37 + 11) & 0xff
    }
    original.set([0x50, 0x4b, 0x03, 0x04])
    const originalTag = `{{unquote(${bytesToUnquoteString(original)})}}`
    const packet =
      'POST /upload HTTP/1.1\r\n' +
      'Content-Type: multipart/form-data; boundary=case\r\n\r\n' +
      '--case\r\nContent-Type: application/zip\r\n\r\n' +
      originalTag +
      '\r\n--case--\r\n'

    const initialCollapse = collapseBinaryFuzztag(packet)
    const entry = Array.from(initialCollapse.entries.values())[0] as BinaryFuzztagEntry
    const initialData = await decodeBinaryTag(entry)
    expect(initialData).toEqual(original)
    let submittedBytes: Uint8Array | undefined
    render(
      <BinaryFuzztagHexModal
        entry={entry}
        initialData={initialData}
        onSubmit={(bytes) => {
          submittedBytes = bytes.slice()
        }}
        onCancel={() => {}}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'overwrite first HEX row' }))
    fireEvent.click(screen.getByRole('button', { name: '提交' }))
    await waitFor(() => expect(submittedBytes).toBeDefined())

    const edited = submittedBytes as Uint8Array
    expect(Array.from(edited.slice(0, 29))).toEqual(new Array(29).fill(0x11))
    expect(Array.from(edited.slice(29))).toEqual(Array.from(original.slice(29)))

    // Mirror YakitEditor.handleSubmit + Monaco executeEdits + useBinaryFold.
    const editedTag = await encodeBytesToTag(entry.kind, entry.tagName, edited)
    expect(editedTag).toContain('\\x11')
    expect(editedTag).not.toContain('\\\\x11')
    // The 47,213-byte fixture cycles through every byte value, including the
    // Fuzztag parser delimiters that occur in the real redis-poc ZIP. The
    // Renderer must emit the same delimiter escapes as backend
    // lowhttp.ToUnquoteFuzzTagForce, otherwise the engine cannot expand it.
    expect(editedTag).toContain('\\x28')
    expect(editedTag).toContain('\\x29')
    expect(editedTag).toContain('\\x7b')
    expect(editedTag).toContain('\\x7d')
    const editedCollapse = collapseBinaryFuzztag(editedTag)
    editedCollapse.entries.forEach((value, key) => initialCollapse.entries.set(key, value))
    const originalPlaceholder = collapseBinaryFuzztag(originalTag).text
    const nextDisplay = initialCollapse.text.replace(originalPlaceholder, editedCollapse.text)
    const requestSubmittedToMITMv2 = expandBinaryFuzztag(nextDisplay, initialCollapse.entries)

    expect(requestSubmittedToMITMv2).toContain(editedTag)
    expect(requestSubmittedToMITMv2).not.toContain('\\\\x11')
    expect(includesBytes(packetTextToRawBytes(requestSubmittedToMITMv2), edited)).toBe(true)
  })
})
