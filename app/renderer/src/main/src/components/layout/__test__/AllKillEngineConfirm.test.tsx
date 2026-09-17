import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AllKillEngineConfirm } from '../AllKillEngineConfirm'
import { yakitEngine } from '@/services/electronBridge'
import { failed } from '@/utils/notification'

vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('@/services/electronBridge', () => ({ yakitEngine: { stopAllLocalEngines: vi.fn() } }))
vi.mock('@/utils/notification', () => ({ failed: vi.fn() }))
vi.mock('@/components/yakitUI/YakitHint/YakitHint', () => ({
  YakitHint: ({ okButtonText, onOk }: { okButtonText?: string; onOk?: () => void }) => (
    <button onClick={() => onOk?.()}>{okButtonText}</button>
  ),
}))

const renderConfirm = () => {
  const onSuccess = vi.fn()
  render(<AllKillEngineConfirm visible setVisible={vi.fn()} onSuccess={onSuccess} onCancelFun={vi.fn()} />)
  return { onSuccess }
}
const confirmStop = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.closeNow' }))
  })
}

describe('AllKillEngineConfirm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('continues the update flow only after every owned engine stopped', async () => {
    vi.mocked(yakitEngine.stopAllLocalEngines).mockResolvedValue({ ok: true, stopped: true })
    const { onSuccess } = renderConfirm()

    await confirmStop()

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce())
    expect(failed).not.toHaveBeenCalled()
  })

  it('blocks the update flow when a child process is still alive', async () => {
    vi.mocked(yakitEngine.stopAllLocalEngines).mockResolvedValue({ ok: true, stopped: false })
    const { onSuccess } = renderConfirm()

    await confirmStop()

    await waitFor(() => expect(failed).toHaveBeenCalledWith('EngineManagement.stopFailed'))
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('blocks the update flow when the stop IPC rejects', async () => {
    vi.mocked(yakitEngine.stopAllLocalEngines).mockRejectedValue(new Error('raw ipc failure'))
    const { onSuccess } = renderConfirm()

    await confirmStop()

    await waitFor(() => expect(failed).toHaveBeenCalledWith('EngineManagement.stopFailed'))
    expect(onSuccess).not.toHaveBeenCalled()
  })
})
