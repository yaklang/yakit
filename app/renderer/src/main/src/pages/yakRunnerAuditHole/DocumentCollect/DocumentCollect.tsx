import type React from 'react'
import { useRef, useState } from 'react'
import {} from '@ant-design/icons'
import { useMemoizedFn } from 'ahooks'
import styles from './DocumentCollect.module.scss'
import type { DocumentCollectProps, HoleResourceType, HoleTreeNode } from './DocumentCollectType'
import { OutlineDocumentIcon, OutlineLink2Icon, OutlineVariableIcon } from '@/assets/icon/outline'
import type { SSARisksFilter } from '../YakitAuditHoleTable/YakitAuditHoleTableType'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { RefreshIcon } from '@/assets/newIcon'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { RiskTree } from '@/pages/yakRunnerAuditCode/RunnerFileTree/RunnerFileTree'
import { JSONParseLog } from '@/utils/tool'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

const renderTreeNodeIcon = (treeNodeType: HoleResourceType) => {
  const iconsEle = {
    function: <OutlineDocumentIcon className="yakitTreeNode-icon" />,
    program: <OutlineVariableIcon className="yakitTreeNode-icon" />,
    source: <OutlineLink2Icon className="yakitTreeNode-icon" />,
  }
  return iconsEle[treeNodeType] || <></>
}

export const DocumentCollect: React.FC<DocumentCollectProps> = (props) => {
  const { query, setQuery } = props
  const { t } = useI18nNamespaces(['yakRunnerAuditHole'])
  const [searchValue, setSearchValue] = useState<string>('')
  // 真实搜索请求
  const [realSearch, setRealSearch] = useState<string>('')
  // 重置
  const [init, setInit] = useState<boolean>(false)

  const refreshChildrenByParent = useMemoizedFn((origin: HoleTreeNode[], parentKey: string, nodes: HoleTreeNode[]) => {
    const arr: HoleTreeNode[] = origin.map((node) => {
      if (node.key === parentKey) {
        return {
          ...node,
          children: nodes,
        } as HoleTreeNode
      }
      if (node.children) {
        return {
          ...node,
          children: refreshChildrenByParent(node.children, parentKey, nodes),
        } as HoleTreeNode
      }
      return node
    })
    return arr
  })

  const cacheQueryRef = useRef<SSARisksFilter>({})

  // 搜索框
  const onSearchChange = useMemoizedFn((e: { target: { value: string } }) => {
    const value = e.target.value
    setSearchValue(value)
  })

  const reset = useMemoizedFn(() => {
    setSearchValue('')
    setRealSearch('')
    setInit(!init)
  })

  // 搜索树
  const onSearchTree = useMemoizedFn((value: string) => {
    setSearchValue(value)
    setRealSearch(value)
    setInit(!init)
  })

  // 刷新树
  const refreshTreeFun = useMemoizedFn(() => {
    // 当表格查询参数未完全清空时
    if (cacheQueryRef.current) {
      setQuery({ ...query, ...cacheQueryRef.current })
    }
    reset()
  })

  return (
    <div className={styles['document-collect']}>
      <div className={styles['tree-top-wrap']}>
        <YakitInput.Search
          allowClear
          wrapperStyle={{ width: 'calc(100% - 40px)', marginBottom: 15 }}
          placeholder={t('DocumentCollect.searchPlaceholder')}
          onChange={onSearchChange}
          onSearch={onSearchTree}
          value={searchValue}
        />
        <YakitButton type="text2" icon={<RefreshIcon />} onClick={refreshTreeFun} style={{ marginBottom: 15 }} />
      </div>
      <div className={styles['tree-wrap']}>
        <RiskTree
          type="risk"
          projectName="/"
          init={init}
          search={realSearch}
          onSelectedNodes={(node) => {
            const filter = node.data?.Extra.find((item) => item.Key === 'filter')?.Value
            if (filter) {
              try {
                const newParams = JSONParseLog(filter, { page: 'DocumentCollect', fun: 'onSelectedNodes' })
                setQuery({ ...query, ...cacheQueryRef.current, ...newParams })
                // 缓存选中前所更改的参数内容 将其置为空用于还原
                const cache: SSARisksFilter = {}
                Object.keys(newParams).forEach((key) => {
                  cache[key] = []
                })
                cacheQueryRef.current = cache
              } catch (_) {
                setQuery({ ...query, ...cacheQueryRef.current })
                cacheQueryRef.current = {}
              }
            } else {
              setQuery({ ...query, ...cacheQueryRef.current })
              cacheQueryRef.current = {}
            }
          }}
        />
      </div>
    </div>
  )
}
