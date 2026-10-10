/**
 * MITM 热加载页「引擎 Console」入口回归测试。
 *
 * MITMPluginHijackContent 组件依赖 gRPC / xterm / IPC / store / context 等数十个模块，
 * 全量渲染成本极高且脆弱；而该入口的 Console 按钮逻辑已收敛为调用 emitOpenEngineConsole()，
 * 其「缓存命中 / 空值 / 读取失败」三分支行为完全由该 helper 承担。
 * 故此处聚焦验证 MITM 入口共享的 emitOpenEngineConsole 契约：事件参数与回退行为。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import emiter from '@/utils/eventBus/eventBus'

const getRemoteValue = vi.fn<(k: string) => Promise<string>>()
vi.mock('@/utils/kv', () => ({ getRemoteValue, setRemoteValue: vi.fn() }))

const onOpenEngineConsole = vi.fn()

beforeEach(() => {
  onOpenEngineConsole.mockClear()
  getRemoteValue.mockReset()
  emiter.on('openEngineConsole', onOpenEngineConsole)
})

afterEach(() => {
  emiter.off('openEngineConsole', onOpenEngineConsole)
})

const { emitOpenEngineConsole } = await import('@/components/baseConsole/openEngineConsole')

const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

describe('MITMPluginHijackContent 引擎 Console 入口（emitOpenEngineConsole）', () => {
  it('缓存命中合法偏好（right）时按该方向打开', async () => {
    getRemoteValue.mockResolvedValue('right')
    emitOpenEngineConsole()
    await flush()
    expect(onOpenEngineConsole).toHaveBeenCalledWith('right')
  })

  it('缓存命中 float 偏好时打开浮窗', async () => {
    getRemoteValue.mockResolvedValue('float')
    emitOpenEngineConsole()
    await flush()
    expect(onOpenEngineConsole).toHaveBeenCalledWith('float')
  })

  it('缓存为空值（未设置）时回退浮窗', async () => {
    getRemoteValue.mockResolvedValue('')
    emitOpenEngineConsole()
    await flush()
    expect(onOpenEngineConsole).toHaveBeenCalledWith('float')
  })

  it('读取失败时回退浮窗（接收方统一写回远端，保证下次读取一致）', async () => {
    getRemoteValue.mockRejectedValue(new Error('rpc down'))
    emitOpenEngineConsole()
    await flush()
    expect(onOpenEngineConsole).toHaveBeenCalledWith('float')
  })

  it('始终读取远端偏好 EngineConsoleType，不传硬编码打开方式', () => {
    getRemoteValue.mockResolvedValue('left')
    emitOpenEngineConsole()
    expect(getRemoteValue).toHaveBeenCalledWith(expect.stringContaining('engine-console-type'))
  })
})
