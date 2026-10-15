const { ipcRendererMock, setupMonacoWorkersMock, setUpSyntaxFlowMonacoMock } = vi.hoisted(() => {
  const ipcRendererMock = {
    invoke: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    send: vi.fn(),
    removeAllListeners: vi.fn(),
  }
  ;(window as any).require = (id: string) => {
    if (id === 'electron') return { ipcRenderer: ipcRendererMock }
    return {}
  }
  return {
    ipcRendererMock,
    setupMonacoWorkersMock: vi.fn(),
    setUpSyntaxFlowMonacoMock: vi.fn(),
  }
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../setupMonacoWorkers', () => ({
  setupMonacoWorkers: setupMonacoWorkersMock,
}))

vi.mock('../syntaxflowEditor', () => ({
  setUpSyntaxFlowMonaco: setUpSyntaxFlowMonacoMock,
}))

vi.mock('../yakCompletionHint', () => ({
  setupCompletionHint: vi.fn(),
}))

vi.mock('@/utils/tool', () => ({
  JSONParseLog: (raw: string) => JSON.parse(raw || '{}'),
}))

describe('yakEditor Monaco 延后初始化', () => {
  beforeEach(() => {
    vi.resetModules()
    ipcRendererMock.invoke.mockReset()
    setupMonacoWorkersMock.mockClear()
    setUpSyntaxFlowMonacoMock.mockClear()
    const rawJson = new TextEncoder().encode('{"libNames":[],"libCompletions":[]}')
    ipcRendererMock.invoke.mockImplementation(async (channel: string) => {
      if (channel === 'GetYakitCompletionRaw') return { RawJson: rawJson }
      if (channel === 'GetYakVMBuildInMethodCompletion') return { Suggestions: [] }
      return undefined
    })
  })

  it('首次导入 yakEditor 后完成 setup 并请求补全', async () => {
    await import('../yakEditor')
    await vi.waitFor(() => {
      expect(setupMonacoWorkersMock).toHaveBeenCalled()
    })
    expect(setUpSyntaxFlowMonacoMock).toHaveBeenCalled()
    await vi.waitFor(() => {
      expect(ipcRendererMock.invoke).toHaveBeenCalledWith('GetYakitCompletionRaw')
    })
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('GetYakVMBuildInMethodCompletion', {})
  })

  it('setup 阶段抛错不逃逸为未捕获异常，且不阻断后续补全请求', async () => {
    const uncaught: unknown[] = []
    const onUncaught = (e: unknown) => uncaught.push(e)
    process.on('uncaughtException', onUncaught)
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {})
    // 模拟回调执行时依赖未就绪（如循环依赖对端尚未求值）
    setupMonacoWorkersMock.mockImplementationOnce(() => {
      throw new Error('monaco workers not ready')
    })

    try {
      await import('../yakEditor')
      // 留出宏任务窗口，让潜在未捕获异常有机会冒出
      await new Promise((resolve) => setTimeout(resolve, 10))
      expect(uncaught).toEqual([])
      expect(consoleInfo).toHaveBeenCalled()
      // try/catch 只兜 setup，IPC 请求链不受影响
      await vi.waitFor(() => {
        expect(ipcRendererMock.invoke).toHaveBeenCalledWith('GetYakitCompletionRaw')
      })
    } finally {
      process.off('uncaughtException', onUncaught)
      consoleInfo.mockRestore()
    }
  })
})
