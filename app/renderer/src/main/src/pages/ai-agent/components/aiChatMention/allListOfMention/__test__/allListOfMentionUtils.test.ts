import { describe, expect, it } from 'vitest'
import { AIMentionTabsEnum } from '../../../../defaultConstant'
import {
  buildAllMentionSections,
  buildMentionKnowledgeList,
  filterByDisplayNameIncludes,
} from '../allListOfMentionUtils'

describe('filterByDisplayNameIncludes', () => {
  const items = [{ name: 'Alpha Tool' }, { name: 'Beta Helper' }, { name: 'gamma' }]

  it('空关键词原样返回', () => {
    expect(filterByDisplayNameIncludes(items, (it) => it.name, '')).toEqual(items)
    expect(filterByDisplayNameIncludes(items, (it) => it.name, '  ')).toEqual(items)
  })

  it('按展示名大小写不敏感包含匹配', () => {
    expect(filterByDisplayNameIncludes(items, (it) => it.name, 'alp')).toEqual([{ name: 'Alpha Tool' }])
    expect(filterByDisplayNameIncludes(items, (it) => it.name, 'HELPER')).toEqual([{ name: 'Beta Helper' }])
  })
})

describe('buildMentionKnowledgeList', () => {
  const placeholder = { ID: '@所有知识库', KnowledgeBaseName: '@所有知识库' }
  const bases = [
    { ID: 1, KnowledgeBaseName: '安全知识库' },
    { ID: 2, KnowledgeBaseName: '产品文档' },
  ]

  it('无关键词：占位项置顶 + 全部真实库', () => {
    expect(buildMentionKnowledgeList(placeholder, bases, '')).toEqual([placeholder, ...bases])
  })

  it('有关键词：占位项仍置顶，仅过滤真实库', () => {
    expect(buildMentionKnowledgeList(placeholder, bases, '产品')).toEqual([
      placeholder,
      { ID: 2, KnowledgeBaseName: '产品文档' },
    ])
  })

  it('关键词不匹配任何真实库时仍保留占位项', () => {
    expect(buildMentionKnowledgeList(placeholder, bases, 'zzz')).toEqual([placeholder])
  })
})

describe('buildAllMentionSections', () => {
  const sections = [
    { value: AIMentionTabsEnum.Forge_Name, label: 'forge' },
    { value: AIMentionTabsEnum.Tool, label: 'tool' },
    { value: AIMentionTabsEnum.KnowledgeBase, label: 'kb' },
    { value: AIMentionTabsEnum.FocusMode, label: 'focus' },
    { value: AIMentionTabsEnum.Browser, label: 'browser' },
    { value: AIMentionTabsEnum.File_System, label: 'fs' },
  ]

  it('按分区拼装 flat 项，并剔除空分区（含 File_System）', () => {
    const result = buildAllMentionSections(sections, {
      forgeList: [{ Id: 1, ForgeVerboseName: '技能A', ForgeName: 'a' }],
      toolList: [{ ID: 2, VerboseName: '工具B', Name: 'b' }],
      knowledgeList: [{ ID: '@所有知识库', KnowledgeBaseName: '@所有知识库' }],
      focusList: [{ Name: 'mode1', VerboseNameZh: '专注' }],
      browserList: [{ id: 'dev-1', name: 'Chrome' }],
    })

    expect(result.map((s) => s.value)).toEqual([
      AIMentionTabsEnum.Forge_Name,
      AIMentionTabsEnum.Tool,
      AIMentionTabsEnum.KnowledgeBase,
      AIMentionTabsEnum.FocusMode,
      AIMentionTabsEnum.Browser,
    ])
    expect(result.find((s) => s.value === AIMentionTabsEnum.Forge_Name)?.items).toEqual([
      {
        rowKey: 'all-forge-1',
        section: AIMentionTabsEnum.Forge_Name,
        id: '1',
        name: '技能A',
      },
    ])
    expect(result.find((s) => s.value === AIMentionTabsEnum.Tool)?.items[0].name).toBe('工具B')
    expect(result.find((s) => s.value === AIMentionTabsEnum.KnowledgeBase)?.items[0].rowKey).toBe('all-kb-@所有知识库')
    expect(result.find((s) => s.value === AIMentionTabsEnum.FocusMode)?.items[0].name).toBe('专注')
    expect(result.find((s) => s.value === AIMentionTabsEnum.Browser)?.items[0]).toEqual({
      rowKey: 'all-browser-dev-1',
      section: AIMentionTabsEnum.Browser,
      id: 'dev-1',
      name: 'Chrome',
    })
  })

  it('全部为空时返回空数组', () => {
    expect(
      buildAllMentionSections(sections, {
        forgeList: [],
        toolList: [],
        knowledgeList: [],
        focusList: [],
        browserList: [],
      }),
    ).toEqual([])
  })

  it('展示名回退：Verbose 空时用 Name', () => {
    const result = buildAllMentionSections([{ value: AIMentionTabsEnum.Forge_Name, label: 'forge' }], {
      forgeList: [{ Id: 9, ForgeName: 'raw-name' }],
      toolList: [],
      knowledgeList: [],
      focusList: [],
      browserList: [],
    })
    expect(result[0].items[0].name).toBe('raw-name')
  })
})
