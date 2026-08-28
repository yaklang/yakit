import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import { Form, Tooltip } from 'antd'
import { OutlinePencilaltIcon, OutlineRefreshIcon } from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitEditor } from '@/components/yakitUI/YakitEditor/YakitEditor'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import PluginTabs from '@/components/businessUI/PluginTabs/PluginTabs'
import useHoldGRPCStream from '@/hook/useHoldGRPCStream/useHoldGRPCStream'
import { YakitRoute } from '@/enums/yakitRoute'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { usePageInfo } from '@/store/pageInfo'
import type { YakExecutorParam } from '@/pages/invoker/YakExecutorParams'
import type { YakScript } from '@/pages/invoker/schema'
import { PluginDetailHeader } from '@/pages/plugins/baseTemplate'
import '@/pages/plugins/plugins.scss'
import detailStyles from '@/pages/plugins/local/PluginsLocalDetail.module.scss'
import { ExpandAndRetract } from '@/pages/plugins/operator/expandAndRetract/ExpandAndRetract'
import { PluginExecuteResult } from '@/pages/plugins/operator/pluginExecuteResult/PluginExecuteResult'
import {
  ExecuteEnterNodeByPluginParams,
  PluginExecuteProgress,
} from '@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard'
import PluginExecuteExtraParams from '@/pages/plugins/operator/localPluginExecuteDetailHeard/PluginExecuteExtraParams'
import type {
  CustomPluginExecuteFormValue,
  YakExtraParamProps,
} from '@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType'
import type { YakParamProps } from '@/pages/plugins/pluginsType'
import { ParamsToGroupByGroupName, getValueByType, getYakExecutorParam } from '@/pages/plugins/editDetails/utils'
import type { ModifyPluginCallback } from '@/pages/pluginEditor/pluginEditor/PluginEditor'
import { ModifyYakitPlugin } from '@/pages/pluginEditor/modifyYakitPlugin/ModifyYakitPlugin'
import { grpcFetchLocalPluginDetail } from '@/pages/pluginHub/utils/grpc'
import { randomString } from '@/utils/randomUtil'
import { yakitNotify } from '@/utils/notification'
import { cancelContextMenuAction, executeContextMenuAction } from './api'
import { getContextMenuExecution, removeContextMenuExecution, updateContextMenuExecution } from './executionRegistry'
import type { ContextMenuActionEvent, ContextMenuPacketActionResult } from './types'
import { YakitAlert } from '@/components/yakitUI/YakitAlert/YakitAlert'
import styles from './ContextMenuActionExecution.module.scss'

const { ipcRenderer } = window.require('electron')

const ExecutionStatus = {
  /** 初始/重新发起，等待引擎响应 */
  Waiting: 'Waiting',
  /** 引擎已开始执行 */
  Running: 'Running',
  /** 正常结束 */
  Completed: 'Completed',
  /** 用户取消 / 引擎取消 */
  Cancelled: 'Cancelled',
  /** 超时结束 */
  Timeout: 'Timeout',
  /** 执行出错 */
  Failed: 'Failed',
  /** registry 里的执行上下文已失效（如 Tab 恢复后找不到） */
  Expired: 'Expired',
} as const

export const ContextMenuActionExecution: React.FC<{ pageId: string; mode: 'dialog' | 'drawer' | 'tab' }> = React.memo(
  ({ pageId, mode }) => {
    const { t, i18nRefresh } = useI18nNamespaces(['manageRightClickPlugins', 'yakitUi'])
    // #region 执行上下文：从 pageInfo 缓存按 pageId 读取 executionID
    const pageInfo = usePageInfo((s) => {
      const currentItem = s.pages.get(YakitRoute.ContextMenuResult)?.pageList?.find((item) => item.pageId === pageId)
      return currentItem?.pageParamsInfo?.contextMenuResultPageInfo
    })
    const executionID = pageInfo?.executionID || ''
    /** registry 刷新版本：插件编辑/刷新后回写 registry 并自增，驱动 execution 重新读取与表单重建 */
    const [registryVersion, setRegistryVersion] = useState(0)
    const execution = getContextMenuExecution(executionID)
    // #endregion

    // #region 执行状态与流
    const token = useRef<string>(randomString(40))
    const [runtimeID, setRuntimeID] = useState('')
    const [loading, setLoading] = useState(true)
    const [status, setStatus] = useState<string>(ExecutionStatus.Waiting)
    const [packetResult, setPacketResult] = useState<ContextMenuPacketActionResult>()
    const [packetApplied, setPacketApplied] = useState(false)
    /** 是否已发起过执行（Tab 内只自动执行一次，后续由用户手动触发） */
    const startedRef = useRef(false)
    /** 用户已请求取消（流 onEnd/onError 时用于区分「已取消」与「失败」） */
    const cancelRequestedRef = useRef(false)

    const [streamInfo, streamActions] = useHoldGRPCStream({
      taskName: execution?.action.PluginName || t('ContextMenuActionExecution.pluginFallbackName'),
      apiKey: 'ExecuteContextMenuAction',
      token: token.current,
      waitTime: 200,
      isShowEnd: false,
      isShowError: false,
      setRuntimeId: setRuntimeID,
      onEnd: () => {
        setLoading(false)
        if (cancelRequestedRef.current) setStatus(ExecutionStatus.Cancelled)
      },
      onError: (error) => {
        setLoading(false)
        if (cancelRequestedRef.current) {
          setStatus(ExecutionStatus.Cancelled)
        } else {
          setStatus(ExecutionStatus.Failed)
          yakitNotify('error', error + '')
        }
      },
    })
    // #endregion

    // #region 参数表单状态与派生
    const [form] = Form.useForm()
    /** 参数区展开/收起（执行成功后自动收起，头部点击切换） */
    const [isExpand, setIsExpand] = useState(false)
    /** 额外参数抽屉可见性 */
    const [extraParamsVisible, setExtraParamsVisible] = useState(false)
    /** 抽屉里保存的选填参数值（提交时与必填表单值合并） */
    const [customExtraParamsValue, setCustomExtraParamsValue] = useState<CustomPluginExecuteFormValue>({})
    /** json 类型参数的初始值（key = 参数 Field，value = JSON 字符串），不走 antd form */
    const [jsonSchemaInitial, setJsonSchemaInitial] = useState<{ [key: string]: any }>({})
    const jsonSchemaListRef = useRef<{
      [key: string]: any
    }>({})

    /** 必填参数：内联展示（memo 保持引用稳定，避免子组件 React.memo 失效） */
    const requiredParams: YakParamProps[] = useMemo(
      () => execution?.action.Params?.filter((item) => item.Required) || [],
      [execution?.action.Params],
    )
    /** 选填参数：按参数组分到额外参数抽屉 */
    const customParams: YakParamProps[] = useMemo(
      () => execution?.action.Params?.filter((item) => !item.Required) || [],
      [execution?.action.Params],
    )
    const extraParamsGroup: YakExtraParamProps[] = useMemo(() => ParamsToGroupByGroupName(customParams), [customParams])
    // #endregion

    // #region 插件详情（源码 Tab / 编辑弹窗 / 头部作者与更新时间）
    const [plugin, setPlugin] = useState<YakScript | null>(null)
    const [pluginLoading, setPluginLoading] = useState(false)
    const [editHint, setEditHint] = useState(false)
    /** 页面根容器：作为编辑抽屉的 getContainer，抽屉高度跟随容器*/
    const pageWrapperRef = useRef<HTMLDivElement>(null)
    // #endregion

    // #region Tab 切换
    const [activeTab, setActiveTab] = useState('execute')
    // #endregion

    // #region 执行控制
    /** 发起执行：重置状态与流，调用 ExecuteContextMenuAction（params 不传则用触发时的参数） */
    const startExecute = useMemoizedFn((params?: YakExecutorParam[]) => {
      if (!execution) return
      cancelRequestedRef.current = false
      setLoading(true)
      setStatus(ExecutionStatus.Waiting)
      setPacketResult(undefined)
      setPacketApplied(false)
      setRuntimeID('')
      streamActions.reset()
      streamActions.start()
      executeContextMenuAction(
        {
          ...execution.request,
          PluginUUID: execution.action.PluginUUID,
          ActionID: execution.action.ActionID,
          Params: params ?? execution.params ?? [],
        },
        token.current,
      ).catch((error) => {
        setStatus(ExecutionStatus.Failed)
        setLoading(false)
        yakitNotify('error', error + '')
      })
    })

    const onStopExecute = useMemoizedFn((e) => {
      e.stopPropagation()
      cancelRequestedRef.current = true
      cancelContextMenuAction(token.current)
      setStatus(ExecutionStatus.Cancelled)
      setLoading(false)
    })

    /** 表单提交：必填表单值 + 抽屉选填值合并转 YakExecutorParam[] 后执行 */
    const onStartExecute = useMemoizedFn((value) => {
      startExecute(getYakExecutorParam({ ...value, ...customExtraParamsValue }))
      setIsExpand(false)
    })

    /** 头部顶部的执行按钮：先走表单校验，校验失败则展开表单让用户补参 */
    const onExecuteInTop = useMemoizedFn((e) => {
      e.stopPropagation()
      form
        .validateFields()
        .then(onStartExecute)
        .catch(() => {
          setIsExpand(true)
        })
    })

    /** 头部点击展开/收起参数表单 */
    const onExpand = useMemoizedFn((e) => {
      e.stopPropagation()
      setIsExpand(!isExpand)
    })

    /** 应用插件返回的数据包修改（版本校验通过后回填到原编辑器） */
    const applyPacketResult = useMemoizedFn((result: ContextMenuPacketActionResult) => {
      if (!execution?.onPacketResult || packetApplied) return
      const applied = execution.onPacketResult(result)
      if (applied !== false) {
        setPacketApplied(true)
        yakitNotify('info', t('ContextMenuActionExecution.packetAppliedNotify'))
      }
    })
    // #endregion

    // #region 插件详情加载与编辑
    const loadPlugin = useMemoizedFn(() => {
      if (!execution?.action.PluginName) return
      setPluginLoading(true)
      grpcFetchLocalPluginDetail({ Name: execution.action.PluginName, UUID: execution.action.PluginUUID }, true)
        .then((res) => {
          setPlugin(res)
          if (execution.action.PluginUUID !== res.UUID) return
          // 定义有变化（编辑过插件）才回写 registry 并重建表单；无变化的刷新不打扰已填的表单值
          const changed = JSON.stringify(res.Params || []) !== JSON.stringify(execution.action.Params || [])
          if (!changed) return
          updateContextMenuExecution(executionID, {
            action: { ...execution.action, Params: res.Params || [] },
          })
          setRegistryVersion((v) => v + 1)
          // 回到执行之前：展开表单等待重新填参，隐藏上次执行的结果
          setIsExpand(true)
          setStatus(ExecutionStatus.Waiting)
          setRuntimeID('')
          setPacketResult(undefined)
          setPacketApplied(false)
        })
        .catch(() => setPlugin(null))
        .finally(() => setPluginLoading(false))
    })

    const onRefreshPlugin = useMemoizedFn((e: React.MouseEvent) => {
      e.stopPropagation()
      loadPlugin()
    })

    const handleOpenEdit = useMemoizedFn((e: React.MouseEvent) => {
      e.stopPropagation()
      if (!plugin) return
      if (editHint) return
      setEditHint(true)
    })

    const handleEditCallback = useMemoizedFn((isSuccess: boolean, data?: ModifyPluginCallback) => {
      if (isSuccess && data) {
        const { opType } = data
        if (['save', 'saveAndExit', 'upload', 'submit'].includes(opType)) {
          loadPlugin()
        }
        if (opType !== 'save') {
          setEditHint(false)
        }
      } else {
        setEditHint(false)
      }
    })

    useEffect(() => {
      loadPlugin()
    }, [execution?.action.PluginUUID])
    // #endregion

    // #region 副作用：表单回显 / 执行事件监听与自动执行
    /** 初始化表单：参数默认值打底，触发时传入的参数值覆盖（必填进 form，选填进抽屉 state，json 参数走 jsonSchemaInitial） */
    useEffect(() => {
      if (!execution) return
      const actionParams = execution.action.Params || []
      const initFormValue: CustomPluginExecuteFormValue = {}
      actionParams.forEach((item) => {
        initFormValue[item.Field] = getValueByType(item.DefaultValue, item.TypeVerbose)
      })
      const jsonInitial: { [key: string]: any } = {}
      ;(execution.params || []).forEach((item) => {
        if (Object.prototype.hasOwnProperty.call(initFormValue, item.Key)) {
          initFormValue[item.Key] = item.Value
        }
        // json 参数值不走 antd form，单独作为 JsonFormWrapper 的初始值
        const matched = actionParams.find((p) => p.Field === item.Key && p.TypeVerbose === 'json')
        if (matched) jsonInitial[item.Key] = item.Value
      })
      form.setFieldsValue(initFormValue)
      setJsonSchemaInitial(jsonInitial)
      const optionalValue: CustomPluginExecuteFormValue = {}
      customParams.forEach((item) => {
        optionalValue[item.Field] = initFormValue[item.Field]
      })
      setCustomExtraParamsValue(optionalValue)
    }, [executionID, registryVersion])

    /** 监听主进程转发的执行事件（状态/packet-result），mount 时自动执行一次，卸载时清理 */
    useEffect(() => {
      if (!execution) {
        setLoading(false)
        setStatus(ExecutionStatus.Expired)
        return
      }

      const eventChannel = `${token.current}-context-menu-event`
      const errorChannel = `${token.current}-context-menu-error`
      const onEvent = (_event, data: ContextMenuActionEvent) => {
        if (data.RuntimeID) setRuntimeID(data.RuntimeID)
        switch (data.Status) {
          case 'started':
            setStatus(ExecutionStatus.Running)
            break
          case 'packet-result':
            if (data.PacketResult) {
              setPacketResult(data.PacketResult)
              if (!data.PacketResult.RequireConfirmation) applyPacketResult(data.PacketResult)
            }
            break
          case 'completed':
            setStatus(ExecutionStatus.Completed)
            setLoading(false)
            break
          case 'cancelled':
            setStatus(ExecutionStatus.Cancelled)
            setLoading(false)
            break
          case 'timeout':
            setStatus(ExecutionStatus.Timeout)
            setLoading(false)
            break
          case 'failed':
            setStatus(ExecutionStatus.Failed)
            setLoading(false)
            break
          default:
            break
        }
      }
      const onError = (_event, error: string) => {
        if (cancelRequestedRef.current) {
          setStatus(ExecutionStatus.Cancelled)
        } else {
          setStatus(ExecutionStatus.Failed)
        }
        setLoading(false)
      }
      ipcRenderer.on(eventChannel, onEvent)
      ipcRenderer.on(errorChannel, onError)

      if (!startedRef.current) {
        startedRef.current = true
        startExecute()
      }

      return () => {
        ipcRenderer.removeListener(eventChannel, onEvent)
        ipcRenderer.removeListener(errorChannel, onError)
        cancelContextMenuAction(token.current)
        removeContextMenuExecution(executionID)
      }
    }, [executionID])
    // #endregion

    // #region 渲染物料：头部信息与操作按钮
    const headerProps = useMemo(
      () => ({
        pluginName: execution?.action.PluginName || '',
        help: execution?.action.Help || '',
        tags: plugin?.Tags || '',
        img: plugin?.HeadImg || execution?.action.HeadImg || '',
        user: plugin?.Author || '-',
        pluginId: execution?.action.PluginUUID || '',
        updated_at: plugin?.UpdatedAt || 0,
        prImgs: (plugin?.CollaboratorInfo || []).map((ele) => ({
          headImg: ele.HeadImg,
          userName: ele.UserName,
        })),
      }),
      [execution?.action, plugin],
    )

    /** 头部右侧的刷新/编辑按钮（执行/停止按钮在 extraNode 内单独拼装） */
    const headExtraNode = useMemo(
      () => (
        <>
          <Tooltip title={t('ContextMenuActionExecution.refreshPluginData')}>
            <YakitButton
              type="text2"
              icon={<OutlineRefreshIcon />}
              onClick={onRefreshPlugin}
              disabled={pluginLoading}
            />
          </Tooltip>
          <div className="divider-style" />
          <Tooltip title={t('YakitButton.edit')}>
            <YakitButton type="text2" icon={<OutlinePencilaltIcon />} onClick={handleOpenEdit} />
          </Tooltip>
        </>
      ),
      [pluginLoading, i18nRefresh],
    )
    // #endregion

    if (!execution) {
      return <YakitEmpty title={t('ContextMenuActionExecution.executionExpiredEmpty')}></YakitEmpty>
    }

    return (
      <div
        ref={pageWrapperRef}
        className={classNames(styles['execution'], detailStyles['details-content-wrapper'])}
        data-mode={mode}
      >
        <PluginTabs
          activeKey={activeTab}
          tabPosition="right"
          onTabClick={(key) => {
            setActiveTab(key)
          }}
        >
          {/* 执行 Tab：头部 + 参数表单 + packet 回填 + 结果区 */}
          <PluginTabs.TabPane tab={t('YakitButton.execute')} key="execute">
            <div className={detailStyles['plugin-execute-wrapper']}>
              <ExpandAndRetract
                isExpand={isExpand}
                onExpand={onExpand}
                status={
                  loading
                    ? 'process'
                    : status === ExecutionStatus.Failed
                      ? 'error'
                      : status === ExecutionStatus.Completed
                        ? 'finished'
                        : 'default'
                }
              >
                <PluginDetailHeader
                  {...headerProps}
                  tagMinWidth={120}
                  type={execution.action.PluginType || 'context-menu'}
                  extraNode={
                    <div className={styles['plugin-head-executing']}>
                      {streamInfo.progressState.length > 0 && (
                        <PluginExecuteProgress
                          percent={streamInfo.progressState[streamInfo.progressState.length - 1].progress}
                          name={streamInfo.progressState[streamInfo.progressState.length - 1].id}
                        />
                      )}
                      {loading ? (
                        <YakitButton danger onClick={onStopExecute}>
                          {t('YakitButton.stop')}
                        </YakitButton>
                      ) : (
                        !isExpand && (
                          <YakitButton type="primary" onClick={onExecuteInTop}>
                            {t('YakitButton.execute')}
                          </YakitButton>
                        )
                      )}
                      {headExtraNode}
                    </div>
                  }
                />
              </ExpandAndRetract>

              <div
                className={classNames(styles['execution-form-wrapper'], {
                  [styles['execution-form-wrapper-hidden']]: !isExpand,
                })}
              >
                <Form
                  form={form}
                  onFinish={onStartExecute}
                  labelCol={{ span: 6 }}
                  wrapperCol={{ span: 12 }}
                  validateMessages={{
                    /* eslint-disable no-template-curly-in-string */
                    required: t('ContextMenuActionExecution.requiredField'),
                  }}
                  labelWrap={true}
                >
                  <ExecuteEnterNodeByPluginParams
                    paramsList={requiredParams}
                    pluginType="context-menu"
                    isExecuting={loading}
                    jsonSchemaListRef={jsonSchemaListRef}
                    jsonSchemaInitial={jsonSchemaInitial}
                    isInline
                  />
                  <Form.Item colon={false} label={' '} style={{ marginBottom: 0 }}>
                    <div className={styles['execution-form-operate']}>
                      {loading ? (
                        <YakitButton danger onClick={onStopExecute} size="large">
                          {t('YakitButton.stop')}
                        </YakitButton>
                      ) : (
                        <YakitButton className={styles['execution-form-operate-start']} htmlType="submit" size="large">
                          {t('YakitButton.start_execution')}
                        </YakitButton>
                      )}
                      {extraParamsGroup.length > 0 && (
                        <YakitButton
                          type="text"
                          onClick={() => setExtraParamsVisible(true)}
                          disabled={loading}
                          size="large"
                        >
                          {t('ContextMenuActionExecution.extraParams')}
                        </YakitButton>
                      )}
                    </div>
                  </Form.Item>
                </Form>
              </div>

              {packetResult && packetResult.RequireConfirmation && !packetApplied && (
                <YakitAlert
                  type={'warning'}
                  description={
                    <div className={styles['packet-confirm-wraper']}>
                      <div className={styles['packet-confirm']}>
                        <strong>{t('ContextMenuActionExecution.packetModifyTitle')}</strong>
                        <span>{t('ContextMenuActionExecution.packetModifyDesc')}</span>
                      </div>
                      <YakitButton
                        type="primary"
                        disabled={!execution.onPacketResult}
                        onClick={() => {
                          applyPacketResult(packetResult)
                          if (!execution.onPacketResult) {
                            yakitNotify('warning', t('ContextMenuActionExecution.packetPageClosed'))
                          }
                        }}
                      >
                        {t('ContextMenuActionExecution.applyChanges')}
                      </YakitButton>
                    </div>
                  }
                  style={{ margin: 12, marginBottom: 0 }}
                />
              )}
              {(loading || !!runtimeID) && (
                <PluginExecuteResult
                  streamInfo={streamInfo}
                  runtimeId={runtimeID}
                  loading={loading}
                  pluginType="context-menu"
                  pluginExecuteResultWrapper={detailStyles['plugin-execute-result-wrapper']}
                />
              )}
            </div>
          </PluginTabs.TabPane>

          {/* 源码 Tab：插件信息头 + 只读源码 */}
          <PluginTabs.TabPane tab={t('ContextMenuActionExecution.sourceTab')} key="code">
            <div className={detailStyles['plugin-info-wrapper']}>
              <PluginDetailHeader
                {...headerProps}
                type={plugin?.Type || execution.action.PluginType || 'context-menu'}
                extraNode={<div className={detailStyles['extra']}>{headExtraNode}</div>}
              />
              <div className={detailStyles['details-editor-wrapper']}>
                {pluginLoading ? (
                  <YakitSpin />
                ) : plugin ? (
                  <YakitEditor type={plugin.Type} value={plugin.Content} readOnly={true} />
                ) : (
                  <YakitEmpty description={t('ContextMenuActionExecution.sourceCodeNotFound')} />
                )}
              </div>
            </div>
          </PluginTabs.TabPane>
        </PluginTabs>

        {/* 编辑插件弹窗 */}
        {editHint && plugin && (
          <ModifyYakitPlugin
            getContainer={pageWrapperRef.current || undefined}
            plugin={plugin}
            visible={editHint}
            onCallback={handleEditCallback}
          />
        )}

        {/* 额外参数抽屉（选填参数按组折叠） */}
        <PluginExecuteExtraParams
          pluginType="context-menu"
          customPluginParams={customParams}
          extraParamsValue={customExtraParamsValue}
          extraParamsGroup={extraParamsGroup}
          visible={extraParamsVisible}
          setVisible={setExtraParamsVisible}
          onSave={(value) => {
            setCustomExtraParamsValue(value.customValue)
            setExtraParamsVisible(false)
          }}
          jsonSchemaListRef={jsonSchemaListRef}
          jsonSchemaInitial={jsonSchemaInitial}
        />
      </div>
    )
  },
)

export default ContextMenuActionExecution
