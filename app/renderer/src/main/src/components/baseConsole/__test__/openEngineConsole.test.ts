import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import emiter from '@/utils/eventBus/eventBus'

// 用可控的 getRemoteValue mock 替换 KV，确保 emitOpenEngineConsole 捕获到的引用可被拦截
const getRemoteValue = vi.fn<(k: string) => Promise<string>>()
vi.mock('@/utils/kv', () => ({ getRemoteValue, setRemoteValue: vi.fn() }))

// 监听 openEngineConsole 事件，验证所有控制台入口都经 UILayout 的互斥管理器路由
const onOpenEngineConsole = vi.fn()

beforeEach(() => {
  onOpenEngineConsole.mockClear()
  getRemoteValue.mockReset()
  emiter.on('openEngineConsole', onOpenEngineConsole)
})

afterEach(() => {
  emiter.off('openEngineConsole', onOpenEngineConsole)
})

// 在 mock 注册之后再引入被测模块，使其捕获到 mocked 的 getRemoteValue
const { emitOpenEngineConsole } = await import('../openEngineConsole')

describe('emitOpenEngineConsole 互斥路由（统一走缓存读取，不传 openType）', () => {
  it('始终读取远端偏好，不传任何参数', () => {
    getRemoteValue.mockResolvedValue('right')
    emitOpenEngineConsole()
    expect(getRemoteValue).toHaveBeenCalledWith(expect.any(String))
  })

  it('合法偏好时触发该方向（接收方写回远端）', async () => {
    getRemoteValue.mockResolvedValue('right')
    emitOpenEngineConsole()
    await flush()
    expect(onOpenEngineConsole).toHaveBeenCalledWith('right')
  })

  it.each(['left', 'right', 'bottom'] as const)('合法抽屉偏好 %s 时触发对应方向', async (type) => {
    onOpenEngineConsole.mockClear()
    getRemoteValue.mockResolvedValue(type)
    emitOpenEngineConsole()
    await flush()
    expect(onOpenEngineConsole).toHaveBeenCalledWith(type)
  })

  it('float 偏好时触发 "float"', async () => {
    getRemoteValue.mockResolvedValue('float')
    emitOpenEngineConsole()
    await flush()
    expect(onOpenEngineConsole).toHaveBeenCalledWith('float')
  })

  it('KV 无偏好（空串）时回退 "float"', async () => {
    getRemoteValue.mockResolvedValue('')
    emitOpenEngineConsole()
    await flush()
    expect(onOpenEngineConsole).toHaveBeenCalledWith('float')
  })

  it('KV 读取抛错时回退 "float"（接收方统一写回，保证下次读取一致）', async () => {
    getRemoteValue.mockRejectedValue(new Error('rpc down'))
    emitOpenEngineConsole()
    await flush()
    expect(onOpenEngineConsole).toHaveBeenCalledWith('float')
  })

  it('非法脏值时回退 "float"', async () => {
    getRemoteValue.mockResolvedValue('top')
    emitOpenEngineConsole()
    await flush()
    expect(onOpenEngineConsole).toHaveBeenCalledWith('float')
  })
})

// 推进微任务直到 .then/.catch 链落定
const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
}
