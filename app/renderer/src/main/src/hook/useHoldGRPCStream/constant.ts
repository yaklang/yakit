import { HoldGRPCStreamProps } from './useHoldGRPCStreamType'
import i18n from '@/i18n/i18n'
const tOriginal = i18n.getFixedT(null, ['yakitRoute', 'plugin'])

/** @name 插件执行结果默认展示的tab集合 */
export const DefaultTabs: () => HoldGRPCStreamProps.InfoTab[] = () => {
  return [
    { tabName: tOriginal('PluginExecResultDefaultTabs.HTTPtraffic'), type: 'http' },
    { tabName: tOriginal('YakitRoute.vulnerabilityAndrisk'), type: 'risk' },
    { tabName: tOriginal('PluginExecResultDefaultTabs.log'), type: 'log' },
    { tabName: 'Console', type: 'console' },
  ]
}
