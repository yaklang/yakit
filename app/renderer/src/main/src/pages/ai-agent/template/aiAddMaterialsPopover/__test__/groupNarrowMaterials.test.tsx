import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { groupNarrowMaterials } from '../groupNarrowMaterials'
import { MaterialSummaryPanel } from '../materialSummary/MaterialSummary'
import type { MaterialSummaryGroup } from '../materialSummary/type'

vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
afterEach(cleanup)

const forge: MaterialSummaryGroup = {
  key: 'forge',
  label: '技能',
  title: '已添加技能',
  count: 1,
  rows: [{ key: 'skill', name: '测试技能', icon: null }],
}
const knowledge: MaterialSummaryGroup = {
  key: 'knowledgeBase',
  label: '知识库',
  title: '已添加知识库',
  count: 2,
  rows: [{ key: 'knowledge', name: '测试知识库', icon: null }],
}

describe('窄屏资料合并', () => {
  it('关闭策略时保持技能独立，其他资料切换为按类别清除，原分组仍可整组清除', () => {
    const clearAll = vi.fn()
    const clearFlow = vi.fn()
    const other: MaterialSummaryGroup = {
      key: 'other',
      label: '其他资料',
      title: '已添加资料',
      count: 1,
      onRemove: clearAll,
      rows: [{ key: 'flow', name: '流量', icon: null, onClearCategory: clearFlow }],
    }
    const [skill, compactOther] = groupNarrowMaterials([forge, other], '其他资料', '已添加资料', false)
    expect(skill).toBe(forge)
    expect(compactOther.allowCategoryRemoval).toBe(true)
    expect(compactOther.onRemove).toBeUndefined()
    compactOther.rows[0].onClearCategory?.()
    expect(clearFlow).toHaveBeenCalledOnce()
    expect(other.onRemove).toBe(clearAll)
  })

  it('合并标签没有外层关闭，每类只清除自己的资料', () => {
    const clearForge = vi.fn()
    const clearKnowledge = vi.fn()
    const clearHttp = vi.fn()
    const clearRisk = vi.fn()
    const [merged] = groupNarrowMaterials(
      [
        { ...forge, onRemove: clearForge },
        { ...knowledge, onRemove: clearKnowledge },
        {
          key: 'other',
          label: '其他资料',
          title: '已添加资料',
          count: 2,
          onRemove: vi.fn(),
          rows: [
            { key: 'http', name: '流量', icon: null, onClearCategory: clearHttp },
            { key: 'risk', name: '风险', icon: null, onClearCategory: clearRisk },
          ],
        },
      ],
      '资料',
      '已添加资料',
    )
    expect(merged.label).toBe('资料')
    expect(merged.allowCategoryRemoval).toBe(true)
    expect(merged.onRemove).toBeUndefined()
    merged.rows[0].onClearCategory?.()
    expect(clearForge).toHaveBeenCalledOnce()
    expect(clearKnowledge).not.toHaveBeenCalled()
    merged.rows[2].onClearCategory?.()
    expect(clearHttp).toHaveBeenCalledOnce()
    expect(clearRisk).not.toHaveBeenCalled()
  })

  it('只有其他资料时保留其他资料文案并隐藏外层关闭', () => {
    const [merged] = groupNarrowMaterials(
      [{ key: 'other', label: '其他资料', title: '已添加资料', count: 1, rows: [], onRemove: vi.fn() }],
      '其他资料',
      '已添加资料',
    )
    expect(merged.label).toBe('其他资料')
    expect(merged.allowCategoryRemoval).toBe(true)
    expect(merged.onRemove).toBeUndefined()
  })
  it('仅技能和知识库也生成其他资料，且不修改原有分组', () => {
    const original = [forge, knowledge]
    const merged = groupNarrowMaterials(original, '其他资料', '已添加资料')
    expect(merged).toHaveLength(1)
    expect(merged[0].count).toBe(3)
    expect(merged[0].rows.map((row) => row.key)).toEqual(['forge', 'knowledgeBase'])
    expect(original.map((group) => group.key)).toEqual(['forge', 'knowledgeBase'])
    expect(merged[0].rows[0].group).toBe(forge)
  })

  it('累加其他资料原计数并保留其入口', () => {
    const other: MaterialSummaryGroup = {
      key: 'other',
      label: '其他资料',
      title: '资料',
      count: 4,
      rows: [{ key: 'flow', name: '流量', icon: null }],
    }
    const [merged] = groupNarrowMaterials([forge, knowledge, other], '其他资料', '资料')
    expect(merged.count).toBe(7)
    expect(merged.rows[2]).toBe(other.rows[0])
  })

  it('分类入口打开已有条目并可返回，保留移除操作与锁定条目', () => {
    const remove = vi.fn()
    const source = {
      ...forge,
      rows: [
        { key: 'a', name: '可取消技能', icon: null, onRemove: remove },
        { key: 'b', name: '锁定技能', icon: null },
      ],
    }
    const [merged] = groupNarrowMaterials([source], '其他资料', '已添加资料')
    render(<MaterialSummaryPanel group={merged} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '技能' }))
    expect(screen.getByRole('dialog', { name: '已添加技能' })).toBeTruthy()
    expect(screen.getByText('锁定技能')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'YakitButton.cancel 锁定技能' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.cancel 可取消技能' }))
    expect(remove).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: '已添加资料' }))
    expect(screen.getByRole('dialog', { name: '已添加资料' })).toBeTruthy()
  })
})
