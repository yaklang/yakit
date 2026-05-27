import React, { useEffect, useRef, useState } from 'react'
import styles from './AIMCPToolManager.module.scss'
import classNames from 'classnames'
import { useInViewport, useMemoizedFn, useCreation } from 'ahooks'
import { Tooltip } from 'antd'
import { RollingLoadList } from '@/components/RollingLoadList/RollingLoadList'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { YakitRoundCornerTag } from '@/components/yakitUI/YakitRoundCornerTag/YakitRoundCornerTag'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { OutlineInformationcircleIcon, OutlineRefreshIcon, OutlineReplyIcon } from '@/assets/icon/outline'
import { SolidToolIcon } from '@/assets/icon/solid'
import { genDefaultPagination } from '@/pages/invoker/schema'
import { GetMCPToolListRequest, GetMCPToolListResponse, MCPToolConfig } from '../type/aiMCP'
import { grpcGetMCPToolList, grpcSetMCPToolEnabled } from './utils'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

// ---- Source filter options ----
type SourceFilter = '' | 'builtin' | 'bridge'

interface AIMCPToolManagerProps {
  onBack: () => void
}

export const AIMCPToolManager: React.FC<AIMCPToolManagerProps> = React.memo((props) => {
  const { onBack } = props
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])

  const wrapperRef = useRef<HTMLDivElement>(null)
  const [inViewPort = true] = useInViewport(wrapperRef)

  const [keyword, setKeyword] = useState<string>('')
  const [source, setSource] = useState<SourceFilter>('')
  const [spinning, setSpinning] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [hasMore, setHasMore] = useState<boolean>(false)
  const [isRef, setIsRef] = useState<boolean>(false)
  const [response, setResponse] = useState<GetMCPToolListResponse>({
    Tools: [],
    Pagination: genDefaultPagination(20),
    Total: 0,
  })

  useEffect(() => {
    getList()
  }, [inViewPort])

  const getList = useMemoizedFn(async (page?: number, overrideSource?: SourceFilter, overrideKeyword?: string) => {
    setLoading(true)
    const query: GetMCPToolListRequest = {
      Keyword: overrideKeyword !== undefined ? overrideKeyword : keyword,
      Source: overrideSource !== undefined ? overrideSource : source,
      ServerName: '',
      OnlyEnabled: false,
      Pagination: {
        ...genDefaultPagination(20),
        OrderBy: 'created_at',
        Page: page || 1,
      },
    }
    if (query.Pagination.Page === 1) {
      setSpinning(true)
    }
    try {
      const res = await grpcGetMCPToolList(query)
      if (!res.Tools) res.Tools = []
      const newPage = +res.Pagination.Page
      const length = newPage === 1 ? res.Tools.length : res.Tools.length + response.Tools.length
      setHasMore(length < +res.Total)
      setResponse({
        Tools: newPage === 1 ? res.Tools : [...response.Tools, ...res.Tools],
        Pagination: res.Pagination,
        Total: res.Total,
      })
      if (newPage === 1) {
        setIsRef((v) => !v)
      }
    } catch (error) {}
    setTimeout(() => {
      setLoading(false)
      setSpinning(false)
    }, 300)
  })

  const onSearch = useMemoizedFn((val: string) => {
    setKeyword(val)
    setTimeout(() => getList(1, undefined, val), 200)
  })

  const loadMoreData = useMemoizedFn(() => {
    getList(+response.Pagination.Page + 1)
  })

  /** Called by child items after a successful toggle to sync local state. */
  const onToggleEnabled = useMemoizedFn((item: MCPToolConfig, enable: boolean) => {
    setResponse((prev) => ({
      ...prev,
      Tools: prev.Tools.map((tool) => (tool.ToolName === item.ToolName ? { ...tool, Enable: enable } : tool)),
    }))
  })

  const sourceOptions = useCreation(
    () => [
      { label: t('AIMCPToolManager.sourceAll'), value: '' },
      { label: t('AIMCPToolManager.sourceBuiltin'), value: 'builtin' },
      { label: t('AIMCPToolManager.sourceBridge'), value: 'bridge' },
    ],
    [],
  )

  return (
    <div className={styles['tool-manager-wrapper']} ref={wrapperRef}>
      <div className={styles['tool-manager-header']}>
        <div className={styles['header-left']}>
          <span>{t('AIMCPToolManager.title')}</span>
          <Tooltip title={t('AIMCPToolManager.tooltipInfo')}>
            <OutlineInformationcircleIcon className={styles['info-icon']} />
          </Tooltip>
          <YakitRoundCornerTag>{response.Total}</YakitRoundCornerTag>
        </div>
        <div className={styles['header-right']}>
          <YakitButton type="text" icon={<OutlineRefreshIcon />} loading={loading} onClick={() => getList()} />
          <YakitButton type="text" icon={<OutlineReplyIcon />} onClick={onBack}>
            {t('YakitButton.back')}
          </YakitButton>
        </div>
      </div>

      <div className={styles['tool-manager-filters']}>
        <YakitInput.Search
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onSearch={onSearch}
          onPressEnter={(e: any) => onSearch(e.target.value)}
          placeholder={t('AIMCPToolManager.searchPlaceholder')}
          allowClear
          style={{ flex: 1 }}
        />
        <YakitSelect
          value={source}
          options={sourceOptions}
          onChange={(v) => {
            const newSource = v as SourceFilter
            setSource(newSource)
            setTimeout(() => getList(1, newSource), 200)
          }}
          style={{ width: 110 }}
        />
      </div>

      <YakitSpin spinning={spinning}>
        {response.Tools.length === 0 && !spinning ? (
          <YakitEmpty title={t('YakitEmpty.noData')} />
        ) : (
          <RollingLoadList<MCPToolConfig>
            data={response.Tools}
            loadMoreData={loadMoreData}
            renderRow={(rowData: MCPToolConfig) => (
              <React.Fragment key={rowData.ToolName}>
                <AIMCPToolItem item={rowData} onToggle={onToggleEnabled} />
              </React.Fragment>
            )}
            classNameRow={styles['tool-list-row']}
            classNameList={styles['tool-list']}
            page={+response.Pagination.Page}
            hasMore={hasMore}
            loading={loading}
            defItemHeight={81}
            rowKey="ToolName"
            isRef={isRef}
          />
        )}
      </YakitSpin>
    </div>
  )
})

// ---- Single tool row ----
interface AIMCPToolItemProps {
  item: MCPToolConfig
  onToggle: (item: MCPToolConfig, enable: boolean) => void
}

const AIMCPToolItem: React.FC<AIMCPToolItemProps> = React.memo((props) => {
  const { item, onToggle } = props
  const { t } = useI18nNamespaces(['aiAgent'])

  const [switchLoading, setSwitchLoading] = useState<boolean>(false)

  const handleToggle = useMemoizedFn((checked: boolean) => {
    setSwitchLoading(true)
    grpcSetMCPToolEnabled({ ToolName: item.ToolName, Enable: checked })
      .then(() => {
        onToggle(item, checked)
      })
      .finally(() => {
        setTimeout(() => setSwitchLoading(false), 200)
      })
  })

  const sourceTagNode = useCreation(() => {
    if (item.Source === 'builtin') {
      return (
        <YakitTag size="small" color="blue" className={styles['source-tag']}>
          {t('AIMCPToolManager.sourceBuiltin')}
        </YakitTag>
      )
    }
    return (
      <YakitTag size="small" color="green" className={styles['source-tag']}>
        {t('AIMCPToolManager.sourceBridge')}
      </YakitTag>
    )
  }, [item.Source])

  return (
    <YakitPopover placement="right" content={<AIMCPToolDetailPopover item={item} />} overlayStyle={{ maxWidth: 440 }}>
      <div className={styles['tool-item']}>
        <div className={styles['tool-item-header']}>
          <div className={styles['tool-item-header-left']}>
            <SolidToolIcon className={styles['tool-icon']} />
            <span className={styles['tool-name']}>{item.ToolName}</span>
            {sourceTagNode}
            {item.Source === 'bridge' && !!item.ServerName && (
              <YakitTag size="small" color="purple" className={styles['source-tag']}>
                {item.ServerName}
              </YakitTag>
            )}
          </div>
          <div className={styles['tool-item-switch']} onClick={(e) => e.stopPropagation()}>
            <YakitSwitch size="small" checked={item.Enable} loading={switchLoading} onChange={handleToggle} />
          </div>
        </div>
        <div className={styles['tool-description']}>{item.Description}</div>
      </div>
    </YakitPopover>
  )
})

// ---- Detail popover ----
interface AIMCPToolDetailPopoverProps {
  item: MCPToolConfig
}

const AIMCPToolDetailPopover: React.FC<AIMCPToolDetailPopoverProps> = React.memo((props) => {
  const { item } = props
  const { t } = useI18nNamespaces(['aiAgent'])

  return (
    <div className={styles['detail-popover']}>
      <div className={styles['detail-title']}>{item.ToolName}</div>
      <div className={styles['detail-description']}>{item.Description}</div>
      {item.Params && item.Params.length > 0 && (
        <div className={styles['param-section']}>
          <div className={styles['param-section-title']}>{t('AIMCP.paramIntro')}</div>
          <div className={styles['param-list']}>
            {item.Params.map((p) => (
              <div key={p.Name} className={styles['param-item']}>
                <div
                  className={classNames(styles['param-item-header'], {
                    [styles['param-item-required']]: !!p.Required,
                  })}
                >
                  <span>{p.Name}</span>
                  <YakitTag color="green">{p.Type}</YakitTag>
                </div>
                <div className={styles['param-description']}>{p.Description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})
