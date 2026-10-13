import { describe, expect, it } from 'vitest'
import { YakitRoute } from '@/enums/yakitRoute'
import type { MultipleNodeInfo } from '../MainOperatorContentType'
import type { YakitMenuItemProps } from '@/components/yakitUI/YakitMenu/YakitMenu'
import { buildSubTabOverviewMenu, countSubTabs, isSubTabLeaf, isSubTabOverviewRoute } from '../subTabOverview'

const tab = (id: string, verbose: string, groupId = '0'): MultipleNodeInfo => ({
  id,
  verbose,
  groupId,
  sortFieId: 1,
})

const group = (id: string, verbose: string, children: MultipleNodeInfo[], expand = false): MultipleNodeInfo => ({
  id,
  verbose,
  groupId: '0',
  sortFieId: 1,
  expand,
  groupChildren: children,
})

describe('subTabOverview', () => {
  it('只对白名单路由开启', () => {
    expect(isSubTabOverviewRoute(YakitRoute.HTTPFuzzer)).toBe(true)
    expect(isSubTabOverviewRoute(YakitRoute.Codec)).toBe(false)
  })

  it('统计未分组页和组内页，空组不计数', () => {
    const nodes = [
      tab('a', 'A'),
      group('[g]-1-group', '组1', [tab('b', 'B', '[g]-1-group'), tab('c', 'C', '[g]-1-group')]),
      group('[empty]-2-group', '空组', []),
    ]
    expect(countSubTabs(nodes)).toBe(3)
  })

  it('未分组的页是一级菜单，组名展开为组内页', () => {
    const nodes = [tab('a', '请求1'), group('[g]-1-group', '登录', [tab('b', '登录-1', '[g]-1-group')])]
    const menu = buildSubTabOverviewMenu(nodes) as YakitMenuItemProps[]
    expect(menu.map((item) => item.label)).toEqual(['请求1', '登录'])
    expect(menu[0].children).toBeUndefined()
    expect(menu[1].children?.map((item) => item.label)).toEqual(['登录-1'])
    expect(menu[1].children?.[0].key).toBe('b')
  })

  it('空组不出现在菜单里', () => {
    const menu = buildSubTabOverviewMenu([group('[empty]-2-group', '空组', [])])
    expect(menu).toEqual([])
  })

  it('组 id 不是叶子页', () => {
    const nodes = [group('[g]-1-group', '组1', [tab('b', 'B', '[g]-1-group')]), tab('a', 'A')]
    expect(isSubTabLeaf(nodes, 'b')).toBe(true)
    expect(isSubTabLeaf(nodes, 'a')).toBe(true)
    expect(isSubTabLeaf(nodes, '[g]-1-group')).toBe(false)
  })
})
