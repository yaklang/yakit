import React, { type ReactNode, useEffect, useRef, useState } from 'react'
import type {
  AIMCPListItemProps,
  AIMCPListProps,
  AIMCPProps,
  AIMCPToolItemPopoverContentProps,
  AIMCPToolItemProps,
  AIMCPToolListProps,
} from './type'
import styles from './AIMCP.module.scss'
import type {
  AddMCPServerRequest,
  GetAllMCPServersRequest,
  GetAllMCPServersResponse,
  MCPServer,
  MCPServerTool,
  UpdateMCPServerRequest,
} from '../type/aiMCP'
import { genDefaultPagination } from '@/pages/invoker/schema'
import { useCreation, useDebounce, useInViewport, useMemoizedFn } from 'ahooks'
import { getMCPServersById, grpcDeleteMCPServer, grpcGetAllMCPServers, grpcUpdateMCPServer } from './utils'
import { YakitRoundCornerTag } from '@/components/yakitUI/YakitRoundCornerTag/YakitRoundCornerTag'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { SideSettingButton } from '../aiChatWelcome/AIChatWelcomeSideSetting'
import {
  CogOutlined,
  DesktopComputerOutlined,
  GlobeAltOutlined,
  PencilOutlined,
  PlayOutlined,
  PlusSmOutlined,
  QuestionMarkCircleOutlined,
  RefreshOutlined,
  SearchOutlined,
  TrashOutlined,
  ReplyOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'

import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { RollingLoadList } from '@/components/RollingLoadList/RollingLoadList'
import { showYakitModal, YakitModalConfirm } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import classNames from 'classnames'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import YakitCollapse from '@/components/yakitUI/YakitCollapse/YakitCollapse'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { Tooltip } from 'antd'
import { AIMCPForm } from './aiMCPForm/AIMCPForm'
import { omit } from 'lodash'
import { AIMCPServerTypeEnum } from '../defaultConstant'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { yakitNotify } from '@/utils/notification'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import emiter from '@/utils/eventBus/eventBus'
import { YakitRoute } from '@/enums/yakitRoute'
import { ToolSolid } from '@yakit-libs/yakit-ui-icons/solid'

const AIMCP: React.FC<AIMCPProps> = React.memo((props) => {
  const [listType, setListType] = useState<'mcp' | 'mcp-tool'>('mcp')
  const [currentMCP, setCurrentMCP] = useState<MCPServer>()
  const onSetCurrentMCP = useMemoizedFn((item: MCPServer) => {
    setCurrentMCP(item)
    setListType('mcp-tool')
  })
  const onBack = useMemoizedFn(() => {
    setCurrentMCP(undefined)
    setListType('mcp')
  })
  const renderListContent = useMemoizedFn(() => {
    let content: ReactNode = <></>
    switch (listType) {
      case 'mcp':
        content = <AIMCPList setCurrentMCP={onSetCurrentMCP} />
        break
      case 'mcp-tool':
        content = <AIMCPToolList item={currentMCP!} onBack={onBack} />
        break
      default:
        break
    }
    return content
  })
  return <>{renderListContent()}</>
})
export default AIMCP

const AIMCPToolList: React.FC<AIMCPToolListProps> = React.memo((props) => {
  const { onBack, item } = props
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const [mcpItem, setMCPItem] = useState<MCPServer>(item)
  const [loading, setLoading] = useState<boolean>(false)
  const [updateLoading, setUpdateLoading] = useState<boolean>(false)
  // 列表数据不含工具。首次详情返回前不展示空状态，避免先闪「暂无数据」再换成工具列表
  const [toolLoaded, setToolLoaded] = useState(false)
  useEffect(() => {
    setToolLoaded(false)
    getMcpItem()
  }, [item.ID])
  const getMcpItem = useMemoizedFn(() => {
    setLoading(true)
    getMCPServersById(item.ID)
      .then((res) => {
        if (res.Enable) {
          setMCPItem(res)
        } else {
          yakitNotify('info', t('AIMCP.enableServerRefreshTools'))
        }
      })
      .finally(() =>
        setTimeout(() => {
          setLoading(false)
          setToolLoaded(true)
        }, 200),
      )
  })

  const updateMCPServer = useMemoizedFn(() => {
    setUpdateLoading(true)
    const updateValue: UpdateMCPServerRequest = {
      ...item,
      Enable: true,
    }
    // 更新
    grpcUpdateMCPServer(updateValue)
      .then(() => {
        getMCPServersById(item.ID)
          .then((res) => {
            setMCPItem(res)
          })
          .catch(() => {
            setMCPItem({ ...item, Enable: true })
          })
      })
      .finally(() =>
        setTimeout(() => {
          setUpdateLoading(false)
        }, 200),
      )
  })
  const toolLis: MCPServerTool[] = useCreation(() => {
    return mcpItem?.Tools || []
  }, [mcpItem?.Tools])
  return (
    <div className={styles['ai-mcp-list-wrapper']}>
      <div className={styles['ai-mcp-list-header']}>
        <div className={styles['ai-mcp-list-header-left']}>
          <span className={styles['ai-mcp-tool-list-name']} title={mcpItem.Name}>
            {mcpItem.Name}
          </span>
          <span className={styles['ai-mcp-tool-list-label']}>{t('AIMCP.toolList')}</span>
          <Tooltip title={t('AIMCP.protocolInfo')}>
            <QuestionMarkCircleOutlined className={styles['info-icon']} color="currentColor" />
          </Tooltip>
          <YakitRoundCornerTag>{toolLis.length}</YakitRoundCornerTag>
        </div>
        <div className={styles['ai-mcp-list-header-right']}>
          <SideSettingButton type="text2" />
          <YakitButton type="text" icon={<ReplyOutlined color="currentColor" />} iconPosition="end" onClick={onBack}>
            {t('YakitButton.back')}
          </YakitButton>
        </div>
      </div>
      <div className={styles['ai-tool-list-container']}>
        {mcpItem.Enable ? (
          <>
            {toolLis.length > 0 ? (
              <RollingLoadList<MCPServerTool>
                data={toolLis}
                renderRow={(rowData: MCPServerTool, index: number) => {
                  return (
                    <React.Fragment key={rowData.Name}>
                      <AIMCPToolItem toolItem={rowData} />
                    </React.Fragment>
                  )
                }}
                classNameRow={styles['ai-tool-list-item']}
                classNameList={styles['ai-tool-list']}
                defItemHeight={76}
                rowKey="Name"
                loadMoreData={() => {}}
                page={1}
                hasMore={false}
                loading={false}
              />
            ) : toolLoaded ? (
              <YakitEmpty title={t('YakitEmpty.noData')}>
                <div className={styles['ai-mcp-tool-empty-btns']}>
                  <YakitButton
                    type="outline1"
                    icon={<RefreshOutlined color="currentColor" />}
                    loading={loading}
                    onClick={getMcpItem}
                  >
                    {t('YakitButton.refresh')}
                  </YakitButton>
                </div>
              </YakitEmpty>
            ) : (
              <div className={styles['ai-tool-list-empty']}>
                <YakitSpin spinning />
              </div>
            )}
          </>
        ) : (
          <YakitEmpty title={t('YakitEmpty.noData')} description={t('AIMCP.disabledRefreshTools')}>
            <div className={styles['ai-mcp-tool-empty-btns']}>
              <YakitButton
                type="outline1"
                icon={<RefreshOutlined color="currentColor" />}
                loading={loading}
                onClick={getMcpItem}
              >
                {t('YakitButton.refresh')}
              </YakitButton>
              <YakitButton
                type="primary"
                icon={<PlayOutlined color="currentColor" />}
                loading={updateLoading}
                onClick={updateMCPServer}
              >
                {t('AIMCP.enableTools')}
              </YakitButton>
            </div>
          </YakitEmpty>
        )}
      </div>
    </div>
  )
})

const AIMCPToolItem: React.FC<AIMCPToolItemProps> = React.memo((props) => {
  const { toolItem } = props
  return (
    <YakitPopover
      placement="right"
      classNames={{ root: styles['ai-mcp-tool-popover'] }}
      content={<AIMCPToolItemPopoverContent toolItem={toolItem} />}
    >
      <div className={styles['ai-tool-list-item-content']}>
        <div className={styles['ai-tool-list-item-heard']}>
          <span className={styles['ai-tool-list-item-heard-name-text']}>{toolItem.Name}</span>
        </div>
        <div className={styles['ai-tool-list-item-description']}>{toolItem.Description}</div>
      </div>
    </YakitPopover>
  )
})

const AIMCPToolItemPopoverContent: React.FC<AIMCPToolItemPopoverContentProps> = React.memo((props) => {
  const { toolItem } = props
  const { t } = useI18nNamespaces(['aiAgent'])
  return (
    <div className={styles['ai-mcp-tool-popover-content']}>
      <div className={styles['ai-mcp-tool-popover-title']}>
        <ToolSolid className={styles['ai-mcp-tool-popover-icon']} color="currentColor" />
        <span>{toolItem.Name}</span>
      </div>
      <div className={styles['ai-mcp-tool-popover-section']}>
        <div className={styles['ai-mcp-tool-popover-label']}>{t('AIMCP.description')}</div>
        <div className={styles['ai-mcp-tool-popover-description']}>{toolItem.Description}</div>
      </div>
      {toolItem.Params.length > 0 && (
        <div className={styles['ai-mcp-tool-popover-section']}>
          <div className={styles['ai-mcp-tool-popover-label']}>{t('AIMCP.paramIntro')}</div>
          <div className={styles['ai-mcp-tool-param-list']}>
            {toolItem.Params.map((item) => {
              return (
                <div key={item.Name} className={styles['ai-mcp-tool-param-item']}>
                  <div className={styles['ai-mcp-tool-param-main']}>
                    <div
                      className={classNames(styles['ai-mcp-tool-param-name'], {
                        [styles['ai-mcp-tool-param-name-required']]: item.Required,
                      })}
                    >
                      {item.Name}
                    </div>
                    <div className={styles['params-description']}>{item.Description}</div>
                  </div>
                  <YakitTag color="green">{item.Type}</YakitTag>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
})

const AIMCPList: React.FC<AIMCPListProps> = React.memo((props) => {
  const { setCurrentMCP } = props
  const { t, i18nRefresh } = useI18nNamespaces(['aiAgent', 'setting', 'yakitUi'])
  const [keyWord, setKeyWord] = useState<string>('')
  const queryKeyword = useDebounce(keyWord.trim(), { wait: 300 })
  const [loading, setLoading] = useState<boolean>(false)
  const [collapsed, setCollapsed] = useState<string[]>([])
  const [response, setResponse] = useState<GetAllMCPServersResponse>({
    MCPServers: [],
    Pagination: genDefaultPagination(20),
    Total: 0,
  })
  const requestIdRef = useRef(0)
  const mcpListRef = useRef<HTMLDivElement>(null)
  const [inViewPort = true] = useInViewport(mcpListRef)
  const getList = useMemoizedFn(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    const newQuery: GetAllMCPServersRequest = {
      Keyword: queryKeyword,
      Pagination: {
        ...genDefaultPagination(20),
        OrderBy: 'updated_at',
        Page: 1,
        // 一次全量拉取：分组展示依赖完整数据，分页会把启用/停用两组按页边界截断；
        // MCP 服务器是用户自建配置（量级通常几十条），全量不会带来性能问题
        Limit: 10000,
      },
      IsShowToolList: false,
    }
    try {
      const res = await grpcGetAllMCPServers(newQuery)
      if (requestId !== requestIdRef.current) return
      if (!res.MCPServers) res.MCPServers = []
      setResponse({
        MCPServers: res.MCPServers,
        Pagination: res.Pagination || {
          ...genDefaultPagination(20),
        },
        Total: res.Total,
      })
    } catch (error) {}
    setTimeout(() => {
      if (requestId !== requestIdRef.current) return
      setLoading(false)
    }, 300)
  })
  useEffect(() => {
    if (inViewPort) getList()
  }, [inViewPort, queryKeyword])
  const onKeywordChange = useMemoizedFn((value: string) => {
    setKeyWord(value)
  })
  const openSavedServer = useMemoizedFn(async (saved?: AddMCPServerRequest) => {
    if (!saved) return
    // 独立按名定位刚保存的服务器，避免受可见列表的搜索词与分页影响
    const lookup = grpcGetAllMCPServers({
      Keyword: saved.Name,
      Pagination: {
        ...genDefaultPagination(20),
        OrderBy: 'updated_at',
        Page: 1,
      },
      IsShowToolList: false,
    }).catch(() => undefined)
    // 可见列表仍按当前过滤条件刷新
    await getList()
    if (!saved.Enable) return
    const server = ((await lookup)?.MCPServers || [])
      .filter((item) => item.Name === saved.Name)
      .sort((a, b) => b.ID - a.ID)[0]
    if (server) setCurrentMCP(server)
  })
  const handleNewAIMCP = useMemoizedFn(() => {
    const m = showYakitModal({
      title: (modalT) => modalT('AIMCP.addMcpServer'),
      width: 600,
      content: (
        <AIMCPForm
          onCancel={(created) => {
            m.destroy()
            openSavedServer(created)
          }}
        />
      ),
      footer: null,
    })
  })
  const openYakMcpSettings = useMemoizedFn(() => {
    emiter.emit('openPage', JSON.stringify({ route: YakitRoute.Settings, params: { anchor: 'yak-mcp' } }))
  })
  const onSetData = useMemoizedFn((item: MCPServer) => {
    setResponse((preV) => {
      // 迟到的启停结果可能晚于搜索词切换：当前结果不含该服务器时丢弃，避免把旧卡片插进新搜索结果
      if (!preV.MCPServers.some((ele) => ele.ID === item.ID)) return preV
      return {
        ...preV,
        // 与后端 updated_at 倒序一致：刚被操作的卡片立即移到对应分组第一位
        MCPServers: [{ ...item }, ...preV.MCPServers.filter((ele) => ele.ID !== item.ID)],
      }
    })
  })
  const groups = useCreation(() => {
    return [
      {
        key: 'running',
        label: t('AIMCP.runningGroup'),
        items: response.MCPServers.filter((item) => item.Enable),
      },
      {
        key: 'disabled',
        label: t('AIMCP.disabledGroup'),
        items: response.MCPServers.filter((item) => !item.Enable),
      },
    ].filter((group) => group.items.length > 0)
  }, [response.MCPServers, i18nRefresh])
  const showEnd = !loading && response.MCPServers.length > 0
  return (
    <div className={styles['ai-mcp-list-wrapper']} ref={mcpListRef}>
      <div className={styles['ai-mcp-list-header']}>
        <div className={styles['ai-mcp-list-header-left']}>
          <span className={styles['ai-mcp-list-header-title']}>{t('AIMCP.mcpServerConfig')}</span>
          <Tooltip title={t('AIMCP.protocolInfo')}>
            <QuestionMarkCircleOutlined className={styles['info-icon']} color="currentColor" />
          </Tooltip>
        </div>
        <div className={styles['ai-mcp-list-header-right']}>
          <SideSettingButton type="text2" />
          <YakitButton
            type="text2"
            className={styles['yak-mcp-entry']}
            onClick={openYakMcpSettings}
            iconPosition="end"
            icon={<CogOutlined color="currentColor" />}
          >
            {t('SettingsPage.item.yak-mcp')}
          </YakitButton>
          <span className={styles['header-divider']} />
          <YakitButton
            icon={<PlusSmOutlined color="currentColor" />}
            aria-label={t('AIMCP.addMcpServer')}
            onClick={handleNewAIMCP}
          />
        </div>
      </div>
      <div className={styles['ai-mcp-list-search']}>
        <YakitInput
          prefix={<SearchOutlined className={styles['search-icon']} color="currentColor" />}
          allowClear
          placeholder={t('YakitInput.searchKeyWordPlaceholder')}
          value={keyWord}
          onChange={(e) => onKeywordChange(e.target.value)}
        />
      </div>
      <div className={styles['ai-mcp-list-body']}>
        <YakitSpin spinning={loading} wrapperClassName={styles['ai-mcp-list-spin']}>
          <div className={styles['ai-mcp-list']}>
            {groups.map((group) => {
              const expanded = !collapsed.includes(group.key)
              return (
                <section key={group.key} aria-label={group.label} className={styles['mcp-group']}>
                  <YakitCollapse
                    bordered={false}
                    className={styles['mcp-group-collapse']}
                    activeKey={expanded ? [group.key] : []}
                    onChange={(keys) =>
                      setCollapsed((previous) =>
                        keys.includes(group.key)
                          ? previous.filter((key) => key !== group.key)
                          : [...previous, group.key],
                      )
                    }
                    items={[
                      {
                        key: group.key,
                        label: (
                          <div className={styles['mcp-group-header']}>
                            <span>{group.label}</span>
                            <YakitRoundCornerTag wrapperClassName={styles['mcp-group-count']}>
                              {group.items.length}
                            </YakitRoundCornerTag>
                          </div>
                        ),
                        children: (
                          <div className={styles['mcp-group-list']}>
                            {group.items.map((item) => (
                              <AIMCPListItem
                                key={item.ID}
                                item={item}
                                onRefresh={getList}
                                onSetData={onSetData}
                                setCurrentMCP={setCurrentMCP}
                              />
                            ))}
                          </div>
                        ),
                      },
                    ]}
                  />
                </section>
              )
            })}
            {showEnd && <div className={styles['list-end']}>{t('YakitEmpty.end_of_list')}</div>}
            {!loading && response.MCPServers.length === 0 && (
              <YakitEmpty title={t('YakitEmpty.noData')}>
                <div className={styles['ai-mcp-tool-empty-btns']}>
                  <YakitButton type="outline1" icon={<PlusSmOutlined color="currentColor" />} onClick={handleNewAIMCP}>
                    {t('AIMCP.addMcp')}
                  </YakitButton>
                </div>
              </YakitEmpty>
            )}
          </div>
        </YakitSpin>
      </div>
    </div>
  )
})

const AIMCPListItem: React.FC<AIMCPListItemProps> = React.memo((props) => {
  const { item, onRefresh, setCurrentMCP, onSetData } = props
  const { t, i18nRefresh } = useI18nNamespaces(['aiAgent', 'yakitUi'])

  const [stopVisible, setStopVisible] = useState<boolean>(false)
  const [stopLoading, setStopLoading] = useState<boolean>(false)
  // 用户打开任一服务器的工具页都会卸载整个列表，用于识别启用请求迟到的自动导航是否已被用户操作打断
  const aliveRef = useRef(true)
  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  const updateMCPServer = useMemoizedFn((enable: boolean) => {
    setStopLoading(true)
    const updateValue: UpdateMCPServerRequest = {
      ...item,
      Enable: enable,
    }
    // 更新
    grpcUpdateMCPServer(updateValue)
      .then(() => {
        const openToolList = (server: MCPServer) => {
          // 启用期间用户已打开其他服务器（本卡片随列表卸载）时，迟到的结果不再覆盖当前工具页
          if (!aliveRef.current) return
          onSetData(server)
        }
        const loadServer = () =>
          getMCPServersById(item.ID)
            .then(openToolList)
            .catch(() => {
              openToolList({ ...item, Enable: enable })
            })
        // 启用后后端还在异步拉取工具，立刻查询容易拿到失败结果
        if (!enable) return loadServer()
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            loadServer().finally(resolve)
          }, 1000)
        })
      })
      .finally(() =>
        setTimeout(() => {
          setStopVisible(false)
          setStopLoading(false)
        }, 200),
      )
  })

  const onEdit = useMemoizedFn((event: React.MouseEvent) => {
    event.stopPropagation()
    if (item.Enable) return
    const defaultValues: UpdateMCPServerRequest = omit(item, ['Tools'])
    const m = showYakitModal({
      title: (modalT) => modalT('AIMCP.editMcp'),
      width: '50%',
      content: (
        <AIMCPForm
          defaultValues={defaultValues}
          onCancel={(saved) => {
            m.destroy()
            if (!saved) return
            onRefresh()
          }}
        />
      ),
      footer: null,
    })
  })
  const onDelete = useMemoizedFn((event: React.MouseEvent) => {
    event.stopPropagation()
    if (item.Enable) return
    const m = YakitModalConfirm({
      width: 420,
      type: 'white',
      onCancelText: (modalT) => modalT('YakitButton.cancel'),
      onOkText: (modalT) => modalT('YakitButton.delete'),
      okButtonProps: { colors: 'danger' },
      title: (modalT) => modalT('AIMCP.deleteMcpServer'),
      content: (modalT) => modalT('AIMCP.deleteMcpServerConfirm'),
      onOk: () => {
        grpcDeleteMCPServer({ ID: item.ID }).then(() => {
          onRefresh()
          m.destroy()
        })
      },
      onCancel: () => m.destroy(),
    })
  })

  const infoByType = useCreation(() => {
    let desc: string = ''
    let typeNode: ReactNode = <></>
    const typeTagClassName = styles['ai-mcp-type-tag']
    switch (item.Type) {
      case AIMCPServerTypeEnum.SSE:
        desc = t('AIMCP.address', { url: item.URL })
        typeNode = (
          <YakitTag size="small" border={false} className={typeTagClassName}>
            <GlobeAltOutlined className={styles['type-icon']} color="currentColor" />
            sse
          </YakitTag>
        )
        break

      case AIMCPServerTypeEnum.Stdio:
        desc = t('AIMCP.command', { command: item.Command })
        typeNode = (
          <YakitTag size="small" border={false} className={typeTagClassName}>
            <DesktopComputerOutlined className={styles['type-icon']} color="currentColor" />
            stdio
          </YakitTag>
        )
        break

      default:
        break
    }
    return {
      desc,
      typeNode,
    }
  }, [item.Type, item.URL, item.Command, item.Enable, i18nRefresh])
  const switchNode = (
    <span className={styles['mcp-switch-slot']}>
      <YakitSwitch
        checked={item.Enable}
        loading={stopLoading}
        wrapperClassName={styles['mcp-switch']}
        aria-label={t(item.Enable ? 'YakitButton.deactivated' : 'YakitButton.enable')}
        onClick={(_checked, event) => event.stopPropagation()}
        onChange={(checked) => {
          if (stopLoading) return
          if (checked) updateMCPServer(true)
          else setStopVisible(true)
        }}
      />
    </span>
  )
  return (
    <div
      className={classNames(styles['mcp-card'], {
        [styles['mcp-card-inactive']]: !item.Enable,
      })}
      onClick={() => setCurrentMCP(item)}
    >
      <span
        className={classNames(styles['mcp-status-dot'], {
          [styles['mcp-status-dot-inactive']]: !item.Enable,
          [styles['mcp-status-dot-error']]: !!item.ErrorMsg,
        })}
        aria-hidden
      />
      <div className={styles['mcp-card-content']}>
        <div className={styles['mcp-card-header']}>
          <span
            className={classNames(styles['mcp-card-name'], {
              [styles['mcp-card-name-inactive']]: !item.Enable,
            })}
            title={item.ErrorMsg || item.Name}
          >
            {item.Name}
          </span>
          {infoByType.typeNode}
          {!!item.ErrorMsg && (
            <Tooltip title={item.ErrorMsg}>
              <YakitTag size="small" color="danger" fullRadius className={styles['mcp-card-error-tag']}>
                {t('AIMCP.toolFetchFailed')}
              </YakitTag>
            </Tooltip>
          )}
          <div
            className={styles['mcp-card-controls']}
            onClick={(event) => {
              event.stopPropagation()
            }}
          >
            {!item.Enable && (
              <div className={styles['mcp-card-actions']}>
                <Tooltip title={t('YakitButton.edit')}>
                  <YakitButton
                    type="text2"
                    icon={<PencilOutlined color="currentColor" />}
                    aria-label={t('YakitButton.edit')}
                    onClick={onEdit}
                  />
                </Tooltip>
                <Tooltip title={t('YakitButton.delete')}>
                  <YakitButton
                    type="text2"
                    icon={<TrashOutlined color="currentColor" />}
                    aria-label={t('YakitButton.delete')}
                    onClick={onDelete}
                  />
                </Tooltip>
              </div>
            )}
            {item.Enable ? (
              <YakitPopconfirm
                title={t('AIMCP.disableConfirm', { name: item.Name })}
                onConfirm={() => updateMCPServer(false)}
                onCancel={() => setStopVisible(false)}
                open={stopVisible}
                onOpenChange={setStopVisible}
                trigger="click"
                okButtonProps={{ loading: stopLoading }}
              >
                {switchNode}
              </YakitPopconfirm>
            ) : (
              switchNode
            )}
          </div>
        </div>
        {infoByType.desc && (
          <div
            className={classNames(styles['mcp-card-description'], {
              [styles['mcp-card-description-inactive']]: !item.Enable,
            })}
          >
            {infoByType.desc}
          </div>
        )}
      </div>
    </div>
  )
})
