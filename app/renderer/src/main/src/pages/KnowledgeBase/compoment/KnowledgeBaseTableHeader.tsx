import { type Dispatch, type SetStateAction, useEffect, useMemo, type FC } from 'react'
import type { KnowledgeBaseTableProps } from './KnowledgeBaseTable'
import { LightningBoltIcon, OutlineTimeIcon } from '@yakit-libs/yakit-ui-icons/oldicon'

import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import {
  ExternalLinkOutlined,
  PencilAltOutlined,
  RefreshOutlined,
  TrashOutlined,
  FigmaIcon5237120699Outlined,
  FigmaIcon2017756Outlined,
  ChevronDownOutlined,
  PlusOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'

import styles from '../knowledgeBase.module.scss'
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import { type tableHeaderGroupOptions } from '../utils'
import { useMemoizedFn, useSafeState } from 'ahooks'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'

import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'

import { PluginExecuteDetailDrawer } from './PluginExecuteDetailDrawer'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { type CheckboxOptionType, Tooltip } from 'antd'
import { InstallPluginModal } from './InstallPluginModal/InstallPluginModal'
import { reseultKnowledgePlugin, useCheckKnowledgePlugin } from '../hooks/useCheckKnowledgePlugin'

export interface KnowledgeBaseTableHeaderProps extends KnowledgeBaseTableProps {
  setTableProps: Dispatch<
    SetStateAction<{
      type: (typeof tableHeaderGroupOptions)[number]['value']
      tableTotal: number
    }>
  >
  tableProps: {
    type: (typeof tableHeaderGroupOptions)[number]['value']
    tableTotal: number
  }
  setQuery?: Dispatch<SetStateAction<string>>
  query?: string
  setSelectList: Dispatch<SetStateAction<any[]>>
  selectList: any[]
  allCheck: boolean
  setAllCheck: Dispatch<SetStateAction<boolean>>
  knowledgeBaseIndexRun?: () => void
}

const KnowledgeBaseTableHeader: FC<
  KnowledgeBaseTableHeaderProps & {
    setLinkId: Dispatch<SetStateAction<string[]>>
    structureTableHeaderGroupOptions?: Array<CheckboxOptionType | string | number>
    onOpenAddKnowledgeBaseModal: () => void
  }
> = ({
  knowledgeBaseItems,
  onDeleteVisible,
  onEditVisible,
  onExportKnowledgeBase,
  streams,
  setTableProps,
  tableProps,
  setQuery,
  setLinkId,
  setOpenQA,
  setSelectList,
  setAllCheck,
  api,
  structureTableHeaderGroupOptions,
  onOpenAddKnowledgeBaseModal,
  knowledgeBaseIndexRun,
}) => {
  const { installPlug, refresh: refreshPluginStatus, ThirdPartyBinaryRunAsync } = useCheckKnowledgePlugin()

  const [searchValue, setSearchValue] = useSafeState('')
  const [buildingDrawer, setBuildingDrawer] = useSafeState<{
    visible: boolean
    streamToken?: string
    type: string
  }>({
    visible: false,
    streamToken: '',
    type: '',
  })

  const [show, setShow] = useSafeState<boolean>(false)

  useEffect(() => {
    setQuery?.('')
    setSearchValue('')
  }, [tableProps.type, knowledgeBaseItems.ID])

  const onCloseViewBuildProcess = useMemoizedFn(() => {
    setBuildingDrawer({ visible: false, streamToken: '', type: '' })
  })

  const onViewBuildProcess = useMemoizedFn((streamToken, type) => {
    if (streams) {
      setBuildingDrawer({
        visible: true,
        streamToken,
        type,
      })
    }
  })

  const tableHeaderSpin = useMemo(() => {
    return knowledgeBaseItems?.streamstep === 2 && streams?.[knowledgeBaseItems?.streamToken] ? (
      <div
        className={styles['building-knowledge-items']}
        onClick={() => onViewBuildProcess(knowledgeBaseItems?.streamToken, 'routine')}
      >
        <FigmaIcon5237120699Outlined className={styles['loading-icon']} color="currentColor" />
        构建知识条目中，可点此查看进度
      </div>
    ) : null
  }, [knowledgeBaseItems?.streamToken, knowledgeBaseItems?.streamstep, streams])

  const tableHeaderSize = useMemo(() => {
    return (
      <div className={styles['header-left-total']}>
        <div className={styles['caption']}>Total</div>
        <div className={styles['number']}>{tableProps.tableTotal ?? 0}</div>
      </div>
    )
  }, [tableProps.tableTotal, tableProps.type])

  return (
    <div className={styles['table-header']}>
      <div className={styles['table-header-first']}>
        <div className={styles['header-left']}>
          {knowledgeBaseItems.icon ? <knowledgeBaseItems.icon className={styles['icon']} /> : null}
          <div className={styles['header-title']}>{knowledgeBaseItems?.KnowledgeBaseName}</div>
          {knowledgeBaseItems?.Tags?.length > 0 ? (
            <div className={styles['tags']}>
              {knowledgeBaseItems?.Tags?.map((it) => (
                <YakitTag className={styles['tag']} key={it}>
                  {it}
                </YakitTag>
              ))}
            </div>
          ) : null}

          {knowledgeBaseItems?.streamstep === 1 && streams?.[knowledgeBaseItems?.streamToken] ? (
            <div
              className={styles['build-tag']}
              onClick={() => onViewBuildProcess(knowledgeBaseItems?.streamToken, 'routine')}
            >
              <FigmaIcon5237120699Outlined className={styles['loading-icon']} color="currentColor" />
              知识库生成中，可点此查看进度
            </div>
          ) : null}
        </div>
        <div className={styles['header-right']}>
          {knowledgeBaseItems.historyGenerateKnowledgeList?.length > 0 ? (
            <YakitPopover
              overlayClassName={styles['knowledge-history-popover']}
              visible={show}
              onVisibleChange={(visible) => setShow(visible)}
              content={
                <div className={styles['knowledge-history-content']}>
                  <div className={styles['title']}>
                    <div>历史生成记录</div>
                    <div className={styles['history-size']}>
                      {knowledgeBaseItems.historyGenerateKnowledgeList.length}
                    </div>
                  </div>
                  {knowledgeBaseItems.historyGenerateKnowledgeList.map((it, key) => {
                    return (
                      <div
                        key={it.token}
                        className={styles['history-content']}
                        onClick={() => {
                          setShow(false)
                          onViewBuildProcess(it.token, 'historyGenerate')
                        }}
                      >
                        <div className={styles['content-first']}>
                          <div>{it.name}</div>
                          <div className={styles['tag']}>
                            <FigmaIcon5237120699Outlined className={styles['loading-icon']} color="currentColor" />
                            生成中
                          </div>
                        </div>
                        <div className={styles['content-last']}>
                          <div>{it.date}</div>
                          <ExternalLinkOutlined className={styles['external-link-icon']} color="currentColor" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              }
              trigger="click"
              placement="bottomRight"
            >
              <YakitButton icon={<OutlineTimeIcon />} type="text2">
                历史
                <ChevronDownOutlined size={16} />
              </YakitButton>
            </YakitPopover>
          ) : null}
          <div className={styles['ai-button']} onClick={() => setOpenQA?.(true)}>
            <LightningBoltIcon />
            AI 召回
          </div>
          <YakitButton
            disabled={!knowledgeBaseItems.streamstep || knowledgeBaseItems.streamstep !== 'success'}
            icon={<PlusOutlined size={16} />}
            type="secondary2"
            onClick={async () => {
              try {
                const result = await ThirdPartyBinaryRunAsync()
                const targetInstallPlugins = reseultKnowledgePlugin(result)
                targetInstallPlugins
                  ? InstallPluginModal({
                      getContainer: '#main-operator-page-body-ai-repository',
                      callback: () => {
                        refreshPluginStatus()
                      },
                    })
                  : onOpenAddKnowledgeBaseModal()
              } catch (error) {}
            }}
          >
            添加
          </YakitButton>
          <YakitButton
            icon={<FigmaIcon2017756Outlined />}
            type="secondary2"
            onClick={async () => {
              knowledgeBaseItems.ID && (await onExportKnowledgeBase?.(knowledgeBaseItems.ID))
            }}
          >
            导出
          </YakitButton>
          <YakitButton
            icon={<PencilAltOutlined color="currentColor" />}
            type="text2"
            onClick={() => onEditVisible?.(true)}
          />
          <YakitButton
            className={styles['delete']}
            icon={<TrashOutlined color="currentColor" />}
            type="text2"
            color="danger"
            onClick={() => onDeleteVisible?.(true)}
          />
        </div>
      </div>
      <div className={styles['table-header-last']}>{knowledgeBaseItems?.KnowledgeBaseDescription}</div>
      {structureTableHeaderGroupOptions && structureTableHeaderGroupOptions?.length > 0 ? (
        <div className={styles['table-content-header']}>
          <div className={styles['header-left']}>
            <YakitRadioButtons
              value={tableProps.type}
              onChange={(e) => {
                setSelectList([])
                setAllCheck(false)
                setTableProps((preValue) => ({
                  ...preValue,
                  selectAll: false,
                  type: e.target.value,
                }))
                setLinkId([])
              }}
              buttonStyle="solid"
              options={structureTableHeaderGroupOptions}
            />
            {tableHeaderSize}
            {tableHeaderSpin}
          </div>
          <div className={styles['header-right']}>
            <YakitInput.Search
              value={searchValue}
              onSearch={(value) => {
                setSearchValue(value)
                setQuery?.(value)
              }}
              allowClear
              onChange={(e) => setSearchValue?.(e.target.value)}
              placeholder="请输入搜索关键词"
              onPressEnter={(e) => {
                e.preventDefault()
                setSearchValue(e.currentTarget.value)
                setQuery?.(e.currentTarget.value)
              }}
            />
            <Tooltip title="刷新">
              <YakitButton
                icon={<RefreshOutlined color="currentColor" />}
                type="text2"
                onClick={knowledgeBaseIndexRun}
              />
            </Tooltip>
          </div>
        </div>
      ) : null}
      {buildingDrawer.visible ? (
        <PluginExecuteDetailDrawer
          buildingDrawer={buildingDrawer}
          onCloseViewBuildProcess={onCloseViewBuildProcess}
          streams={streams}
          api={api}
          title={'知识条目构建详情'}
          knowledgeBaseItems={knowledgeBaseItems}
        />
      ) : null}
    </div>
  )
}

export { KnowledgeBaseTableHeader }
