import { describe, expect, it } from 'vitest'
import { YakitRoute } from '@/enums/yakitRoute'
import type { PublicRouteMenuProps } from '@/routes/newRoute'
import { buildFirstTabRouteOptions, flattenFirstTabRouteMenus } from '../FirstTabRouteMenu/utils'

const translations: Record<'zh' | 'en', Record<string, string>> = {
  zh: {
    'YakitRoute.aiRepository': '知识库',
    'YakitRoute.history': '流量历史',
    'YakitRoute.webFuzzer': 'HTTP 模糊测试',
  },
  en: {
    'YakitRoute.aiRepository': 'Knowledge Base',
    'YakitRoute.history': 'Traffic History',
    'YakitRoute.webFuzzer': 'Web Fuzzer',
  },
}

const translate = (language: 'zh' | 'en') => (key: string) => translations[language][key] ?? key

const knowledge: PublicRouteMenuProps = {
  page: YakitRoute.AI_REPOSITORY,
  label: '知识库',
  labelUi: 'YakitRoute.aiRepository',
}
const history: PublicRouteMenuProps = {
  page: YakitRoute.DB_HTTPHistory,
  label: '流量历史',
  labelUi: 'YakitRoute.history',
}
const fuzzer: PublicRouteMenuProps = {
  page: YakitRoute.HTTPFuzzer,
  label: 'HTTP 模糊测试',
  labelUi: 'YakitRoute.webFuzzer',
}
const group = (label: string, children?: PublicRouteMenuProps[]): PublicRouteMenuProps => ({
  page: undefined,
  label,
  children,
})
const menus = [group('AI', [knowledge]), group('工具', [history, group('Fuzzer', [fuzzer])])]
const routes = flattenFirstTabRouteMenus(menus)

describe('buildFirstTabRouteOptions', () => {
  it('只平铺顶层 children，递归展开分组并保留路由顺序', () => {
    const source = [
      { page: YakitRoute.NewHome, label: '顶层首页' },
      group('AI', [knowledge]),
      group('工具', [group('空组'), group('Fuzzer', [group('嵌套分组', [fuzzer])]), history]),
    ]

    const options = buildFirstTabRouteOptions(flattenFirstTabRouteMenus(source), translate('zh'), '')

    expect(options.map((option) => option.page)).toEqual([
      YakitRoute.AI_REPOSITORY,
      YakitRoute.HTTPFuzzer,
      YakitRoute.DB_HTTPHistory,
    ])
    expect(options.map((option) => option.displayLabel)).toEqual(['知识库', 'HTTP 模糊测试', '流量历史'])
  })

  it('同一路由下的不同插件分别保留，并保留各自插件数据', () => {
    const plugins: PublicRouteMenuProps[] = [
      { page: YakitRoute.Plugin_OP, label: '子域名收集', yakScripName: 'subdomain', yakScriptId: 11 },
      { page: YakitRoute.Plugin_OP, label: '基础爬虫', yakScripName: 'crawler', yakScriptId: 12 },
    ]

    const options = buildFirstTabRouteOptions(flattenFirstTabRouteMenus([group('插件', plugins)]), translate('zh'), '')

    expect(options).toEqual([
      { ...plugins[0], displayLabel: '子域名收集' },
      { ...plugins[1], displayLabel: '基础爬虫' },
    ])
  })

  it('中文下展示 labelUi 对应文案，并按中文片段搜索', () => {
    const options = buildFirstTabRouteOptions(routes, translate('zh'), '历史')

    expect(options).toEqual([{ ...history, displayLabel: '流量历史' }])
  })

  it('英文下展示英文文案，搜索忽略大小写和关键词两端空白', () => {
    const options = buildFirstTabRouteOptions(routes, translate('en'), '  KNOWledge  ')

    expect(options).toEqual([{ ...knowledge, displayLabel: 'Knowledge Base' }])
  })

  it.each(['知识库', 'YakitRoute.aiRepository'])('英文下不使用隐藏的原 label 或翻译 key 匹配：%s', (keyword) => {
    expect(buildFirstTabRouteOptions(routes, translate('en'), keyword)).toEqual([])
  })

  it('语言切换后重新使用当前语言展示和过滤，翻译函数引用可以保持不变', () => {
    let language: 'zh' | 'en' = 'zh'
    const currentTranslate = (key: string) => translations[language][key] ?? key

    expect(buildFirstTabRouteOptions(routes, currentTranslate, '知识').map((option) => option.displayLabel)).toEqual([
      '知识库',
    ])

    language = 'en'

    expect(buildFirstTabRouteOptions(routes, currentTranslate, '知识')).toEqual([])
    expect(buildFirstTabRouteOptions(routes, currentTranslate, 'base').map((option) => option.displayLabel)).toEqual([
      'Knowledge Base',
    ])
  })

  it('没有 labelUi 的条目使用 label 展示和搜索', () => {
    const custom: PublicRouteMenuProps = { page: YakitRoute.Plugin_OP, label: 'Custom Plugin', yakScripName: 'custom' }

    expect(buildFirstTabRouteOptions([custom], translate('en'), 'plugin')).toEqual([
      { ...custom, displayLabel: 'Custom Plugin' },
    ])
  })

  it('空白搜索显示全部条目，无匹配时返回空列表', () => {
    expect(buildFirstTabRouteOptions(routes, translate('en'), ' \t ')).toHaveLength(3)
    expect(buildFirstTabRouteOptions(routes, translate('en'), 'missing route')).toEqual([])
  })

  it('空菜单和没有可显示路由的嵌套空组均返回空列表', () => {
    expect(buildFirstTabRouteOptions([], translate('zh'), '')).toEqual([])
    expect(
      buildFirstTabRouteOptions(
        flattenFirstTabRouteMenus([group('空组', [group('嵌套空组', [])])]),
        translate('zh'),
        '',
      ),
    ).toEqual([])
  })
})
