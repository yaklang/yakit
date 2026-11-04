import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { YakitRoute } from '@/enums/yakitRoute'
import { useHttpFlowStore } from '@/store/httpFlow'
import emiter from '@/utils/eventBus/eventBus'
import type { RouteToPageProps } from '../PublicMenu'
import { openMenuRoute } from '../openMenuRoute'

describe('openMenuRoute', () => {
  const initialState = useHttpFlowStore.getState()
  const menuOpen = vi.fn()
  const openPage = vi.fn()

  beforeEach(() => {
    menuOpen.mockReset()
    openPage.mockReset()
    emiter.on('menuOpenPage', menuOpen)
    emiter.on('openPage', openPage)
    useHttpFlowStore.setState({
      token: 'existing-compare',
      flag: 'left',
      dataMap: new Map([['existing-compare', { type: 1, left: { content: 'GET / HTTP/1.1', language: 'http' } }]]),
    })
  })

  afterEach(() => {
    emiter.off('menuOpenPage', menuOpen)
    emiter.off('openPage', openPage)
    useHttpFlowStore.setState(initialState)
  })

  describe.each(['callback', 'event'] as const)('%s dispatch', (dispatch) => {
    const navigate = (routeInfo: RouteToPageProps, callback: (route: RouteToPageProps) => void) => {
      openMenuRoute(routeInfo, dispatch === 'callback' ? callback : undefined)
    }

    it.each([
      {
        input: { route: YakitRoute.Plugin_OP, pluginId: 42, pluginName: 'resident-plugin' },
        expected: { route: YakitRoute.Plugin_OP, pluginId: 42, pluginName: 'resident-plugin' },
      },
      {
        input: { route: YakitRoute.Plugin_OP },
        expected: { route: YakitRoute.Plugin_OP, pluginId: 0, pluginName: '' },
      },
      {
        input: { route: YakitRoute.Plugin_OP, pluginId: 0, pluginName: '' },
        expected: { route: YakitRoute.Plugin_OP, pluginId: 0, pluginName: '' },
      },
      ...[YakitRoute.Codec, YakitRoute.PoC, YakitRoute.Irify_AI_Code_Audit, YakitRoute.YakRunner_Audit_Code].map(
        (route) => ({
          input: { route, pluginId: 42, pluginName: 'discarded-plugin-metadata' },
          expected: { route },
        }),
      ),
    ])('normalizes $input without clearing comparison data', ({ input, expected }) => {
      const callback = vi.fn()
      const previousState = useHttpFlowStore.getState()

      navigate(input, callback)

      if (dispatch === 'callback') {
        expect(callback).toHaveBeenCalledExactlyOnceWith(expected)
        expect(menuOpen).not.toHaveBeenCalled()
      } else {
        expect(menuOpen).toHaveBeenCalledExactlyOnceWith(JSON.stringify(expected))
        expect(callback).not.toHaveBeenCalled()
      }
      expect(openPage).not.toHaveBeenCalled()
      expect(useHttpFlowStore.getState()).toBe(previousState)
    })

    it('clears shared comparison data before dispatching DataCompare', () => {
      const previousMap = useHttpFlowStore.getState().dataMap
      const expectReset = () => {
        const { token, flag, dataMap } = useHttpFlowStore.getState()
        expect(token).toBe('')
        expect(flag).toBe('')
        expect(dataMap.size).toBe(0)
        expect(dataMap).not.toBe(previousMap)
      }
      const callback = vi.fn(expectReset)
      menuOpen.mockImplementation(expectReset)

      navigate({ route: YakitRoute.DataCompare, pluginId: 42, pluginName: 'discarded' }, callback)

      if (dispatch === 'callback') {
        expect(callback).toHaveBeenCalledExactlyOnceWith({ route: YakitRoute.DataCompare })
        expect(menuOpen).not.toHaveBeenCalled()
      } else {
        expect(menuOpen).toHaveBeenCalledExactlyOnceWith(JSON.stringify({ route: YakitRoute.DataCompare }))
        expect(callback).not.toHaveBeenCalled()
      }
      expect(openPage).not.toHaveBeenCalled()
    })

    it.each([undefined, null, ''])('ignores a missing route (%s) without changing comparison data', (route) => {
      const callback = vi.fn()
      const previousState = useHttpFlowStore.getState()

      navigate({ route } as unknown as RouteToPageProps, callback)

      expect(callback).not.toHaveBeenCalled()
      expect(menuOpen).not.toHaveBeenCalled()
      expect(openPage).not.toHaveBeenCalled()
      expect(useHttpFlowStore.getState()).toBe(previousState)
    })
  })
})
