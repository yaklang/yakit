import { describe, expect, it, vi } from 'vitest'
import '../../../ai-re-act/hooks/__test__/setupElectron'

vi.mock('lottie-web', () => ({ default: vi.fn() }))
// 隔离会话启动/删除和代码块路径依赖；资源转换及提及映射使用真实实现。
vi.mock('@/pages/ai-re-act/hooks/ChatMultiSessionController', () => ({ globalSessionEngine: {} }))
vi.mock('../../historyChat/utils', async () => import('../../historyChat/deleteSource'))
vi.mock('@/pages/yakRunner/utils', () => ({ isYaklangScriptDeliveryPath: () => false }))

import { getAIReActRequestParams } from '..'
import type { AIResourceReferenceParams } from '../../components/aiMilkdownInput/aiMilkdownResourceReference/aiResourceReferencePlugin'
import type { AIMentionCommandParams } from '../../components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin'

const aggregate = (ids: string[]): AIResourceReferenceParams => ({
  type: 'http',
  ids,
  displayText: `勾选了 ${ids.length} 条流量`,
  isSummary: true,
})

describe('漏洞风险引用发送资源', () => {
  const risk = (id: string): AIMentionCommandParams => ({
    mentionType: 'risk',
    mentionId: id,
    mentionName: `风险 ${id}`,
  })

  it('与 HTTP 流量同时发送时，将去重后的风险 ID 聚合为一个 JSON 数组字符串', () => {
    const { attachedResourceInfo } = getAIReActRequestParams({
      qs: '',
      riskList: [{ riskIds: ['101'] }],
      mentionList: [risk('102')],
      resourceReferences: [
        aggregate(['7']),
        { type: 'risk', ids: ['101', '102', '103'], displayText: '3 条风险', isSummary: true },
      ],
    })

    expect(attachedResourceInfo).toEqual([
      { Type: 'http_flow', Key: 'id', Value: ['7'] },
      { Type: 'risk', Key: 'ids', Value: '[101,102,103]' },
    ])
  })

  it('保留 int64 风险 ID 的精度，并跳过无效引用', () => {
    const { attachedResourceInfo } = getAIReActRequestParams({
      qs: '',
      mentionList: [risk('9223372036854775807'), risk('risk-1'), risk('0'), risk('1.2')],
    })

    expect(attachedResourceInfo).toContainEqual({ Type: 'risk', Key: 'ids', Value: '[9223372036854775807]' })
  })

  it('没有有效风险 ID 时不发送风险资源', () => {
    const { attachedResourceInfo } = getAIReActRequestParams({ qs: '', mentionList: [risk('risk-1')] })
    expect(attachedResourceInfo).toEqual([{ Type: 'http_flow', Key: 'id', Value: [] }])
  })
})

describe('流量引用发送资源', () => {
  it.each([1, 5, 6, 10])('正文为空时完整转换 %i 条外置引用，不按显示数量截断', (count) => {
    const ids = Array.from({ length: count }, (_, index) => String(index + 1))
    const { attachedResourceInfo } = getAIReActRequestParams({ qs: '', resourceReferences: [aggregate(ids)] })
    expect(attachedResourceInfo).toEqual([{ Type: 'http_flow', Key: 'id', Value: ids }])
  })

  it('旧正文聚合引用和外置引用重叠时去重，同时保留文件提及和图片', () => {
    const oldReference = { flowIds: ['1', '2'], displayText: '#1, #2', isSummary: false }
    const selection = aggregate(['2', '3', '3'])
    const { attachedResourceInfo } = getAIReActRequestParams({
      qs: '请分析流量和附件',
      httpFlowList: [oldReference],
      resourceReferences: [selection],
      mentionList: [{ mentionId: 'report', mentionType: 'file', mentionName: '/reports/scan.txt' }],
      imageList: ['/images/evidence.png'],
    })
    expect(attachedResourceInfo).toEqual([
      { Type: 'file', Key: 'file_path', Value: '/reports/scan.txt' },
      { Type: 'file', Key: 'file_path', Value: '/images/evidence.png' },
      { Type: 'http_flow', Key: 'id', Value: ['1', '2', '3'] },
    ])
    expect(oldReference.flowIds).toEqual(['1', '2'])
    expect(selection.ids).toEqual(['2', '3', '3'])
  })

  it('旧单条 flowId 引用与外置聚合一起提交且不重复', () => {
    const oldReferences = JSON.parse('[{"flowId":"7","flowIds":""},{"flowId":"8"}]')
    const { attachedResourceInfo } = getAIReActRequestParams({
      qs: '分析旧消息中的流量',
      httpFlowList: oldReferences,
      resourceReferences: [aggregate(['8', '8'])],
    })
    expect(attachedResourceInfo).toEqual([{ Type: 'http_flow', Key: 'id', Value: ['7', '8'] }])
  })

  it('单条引用统一使用 flowIds，存在旧字段时优先读取 flowIds', () => {
    const reference = { flowId: 'old', flowIds: ['7'], displayText: '#7', isSummary: false }
    const { attachedResourceInfo } = getAIReActRequestParams({ qs: '', httpFlowList: [reference] })
    expect(attachedResourceInfo).toEqual([{ Type: 'http_flow', Key: 'id', Value: ['7'] }])
  })

  it('旧字符串 flowIds 在资源边界解析并去空去重', () => {
    const httpFlowList = JSON.parse('[{"flowIds":"7, 8,7, ,","flowId":"old"}]')
    const { attachedResourceInfo } = getAIReActRequestParams({ qs: '', httpFlowList })
    expect(attachedResourceInfo).toEqual([{ Type: 'http_flow', Key: 'id', Value: ['7', '8'] }])
  })
})
