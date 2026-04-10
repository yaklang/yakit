import React, {
  ChangeEventHandler,
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  AIForgeEditorCodeAndParamsProps,
  AIForgeEditorInfoFormProps,
  AIForgeEditorInfoFormRef,
  AIForgeEditorPromptAndActionProps,
  AIForgeEditorSkillFilesProps,
  AIForgeMilkdownBaseProps,
  AIForgeMilkdownProps,
  ConfigTypeForgePromptAction,
  EditorAIForge,
  ForgeEditorProps,
  PromptAndActiveTextareaProps,
} from './type'
import { useControllableValue, useDebounceFn, useMemoizedFn, useUpdateEffect } from 'ahooks'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import {
  OutlineChevrondownIcon,
  OutlineChevronrightIcon,
  OutlineExitIcon,
  OutlineFolderopenIcon,
  OutlineIdentificationIcon,
  OutlineInformationcircleIcon,
  OutlinePluscircleIcon,
  OutlineRefreshIcon,
  OutlineTagIcon,
} from '@/assets/icon/outline'
import { SolidStoreIcon } from '@/assets/icon/solid'
import { Form, Result, Tooltip } from 'antd'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import {
  AIForgeBuiltInTag,
  DefaultForgeConfigToCode,
  DefaultForgeTypeList,
  DefaultForgeYakToCode,
} from '../defaultConstant'
import { GetAIToolListRequest } from '@/pages/ai-agent/type/aiTool'
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import { YakitEditor } from '@/components/yakitUI/YakitEditor/YakitEditor'
import { ExecuteEnterNodeByPluginParams } from '@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard'
import { ExtraParamsNodeByType } from '@/pages/plugins/operator/localPluginExecuteDetailHeard/PluginExecuteExtraParams'
import { YakParamProps } from '@/pages/plugins/pluginsType'
import { getValueByType, onCodeToInfo, ParamsToGroupByGroupName } from '@/pages/plugins/editDetails/utils'
import cloneDeep from 'lodash/cloneDeep'
import { CustomPluginExecuteFormValue } from '@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType'
import { PageNodeItemProps, usePageInfo } from '@/store/pageInfo'
import { shallow } from 'zustand/shallow'
import { YakitRoute } from '@/enums/yakitRoute'
import { yakitNotify } from '@/utils/notification'
import { GenerateTempFilePath, grpcCreateAIForge, grpcGetAIForge, grpcUpdateAIForge } from '@/pages/ai-agent/grpc'
import emiter from '@/utils/eventBus/eventBus'
import { useSubscribeClose } from '@/store/tabSubscribe'
import { AIForgeListDefaultPagination, ReActChatEventEnum } from '@/pages/ai-agent/defaultConstant'
import { grpcGetAIToolList } from '@/pages/ai-agent/aiToolList/utils'
import { QSInputTextarea } from '@/pages/ai-agent/template/template'
import { TextAreaRef } from 'antd/lib/input/TextArea'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { AIForge } from '@/pages/ai-agent/type/forge'
import { YakitResizeBox } from '@/components/yakitUI/YakitResizeBox/YakitResizeBox'
import { YakitDropdownMenu } from '@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu'
import {
  getCodeByPath,
  getCodeSizeByPath,
  getPathJoin,
  getRelativePath,
  grpcFetchCreateFolder,
  grpcFetchDeleteFile,
  grpcFetchFileTree,
  grpcFetchSaveFile,
  MAX_FILE_SIZE_BYTES,
  monacaLanguageType,
} from '@/pages/yakRunner/utils'
import { randomString } from '@/utils/randomUtil'
import FileTreeSystemList from '@/pages/ai-agent/components/aiFileSystemList/FileTreeSystemList/FileTreeSystemList'
import { FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'
import { YakitMenuItemType } from '@/components/yakitUI/YakitMenu/YakitMenu'
import { v4 as uuidv4 } from 'uuid'
import { onOpenLocalFileByPath } from '@/pages/notepadManage/notepadManage/utils'
import { setClipboardText } from '@/utils/clipboard'
import { FileMonitorProps } from '@/utils/duplex/duplex'
import { YakitHint } from '@/components/yakitUI/YakitHint/YakitHint'
import { FileInfo, FileTreeSystemListRef } from '@/pages/ai-agent/components/aiFileSystemList/type'
import { KeyToIcon } from '@/pages/yakRunner/FileTree/icon'
import { getLocalFileName } from '@/components/MilkdownEditor/CustomFile/utils'
import { CopyComponents } from '@/components/yakitUI/YakitTag/YakitTag'
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react'
import { placeholderConfig, placeholderPlugin } from '@/components/MilkdownEditor/Placeholder'
import { Ctx } from '@milkdown/kit/ctx'
import { defaultValueCtx, Editor, editorViewCtx, editorViewOptionsCtx, rootCtx } from '@milkdown/kit/core'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { getMarkdown } from '@milkdown/kit/utils'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { gfm } from '@milkdown/kit/preset/gfm'
import { gapCursorPlugin } from '@milkdown/kit/plugin/cursor'
import { history } from '@milkdown/kit/plugin/history'
import { clipboard } from '@milkdown/kit/plugin/clipboard'
import { ProsemirrorAdapterProvider } from '@prosemirror-adapter/react'
import { parserCtx } from '@milkdown/core'
import { showByRightContext } from '@/components/yakitUI/YakitMenu/showByRightContext'

import classNames from 'classnames'
import styles from './ForgeEditor.module.scss'
const { ipcRenderer } = window.require('electron')

const ForgeEditor: React.FC<ForgeEditorProps> = memo((props) => {
  const { isModify } = props

  // #region 判断新建还是编辑-编辑下读取编辑信息
  const { queryPagesDataById, updatePagesDataCacheById } = usePageInfo(
    (s) => ({
      queryPagesDataById: s.queryPagesDataById,
      updatePagesDataCacheById: s.updatePagesDataCacheById,
    }),
    shallow,
  )

  useEffect(() => {
    if (isModify) {
      handleModifyInit()
    }
  }, [isModify])
  // #endregion

  // #region forge模板全局数据和全局功能 全局数据和全局功能方法
  /** 储存着已有ID的数据(包括编辑获取和新建保存后的数据) */
  const forgeData = useRef<AIForge>()

  const [fetchDataLoading, setFetchDataLoading] = useState(false)
  const setDelayCancelFetchDataLoading = useMemoizedFn(() => {
    setTimeout(() => {
      setFetchDataLoading(false)
    }, 200)
  })
  // 编辑页面，初始化编辑数据功能
  const handleModifyInit = useMemoizedFn(async () => {
    setFetchDataLoading(true)

    const currentItem: PageNodeItemProps | undefined = queryPagesDataById(
      YakitRoute.ModifyAIForge,
      YakitRoute.ModifyAIForge,
    )
    if (currentItem && currentItem.pageParamsInfo.modifyAIForgePageInfo) {
      const id = currentItem.pageParamsInfo.modifyAIForgePageInfo?.id
      const newCurrentItem: PageNodeItemProps = {
        ...currentItem,
        pageParamsInfo: {
          ...currentItem.pageParamsInfo,
          modifyAIForgePageInfo: undefined,
        },
      }
      updatePagesDataCacheById(YakitRoute.ModifyAIForge, { ...newCurrentItem })
      if (!id) {
        yakitNotify('error', `尝试编辑的模板异常(ID: ${id}), 请关闭页面重试`)
        return
      }

      try {
        const res = await grpcGetAIForge({ ID: id, InflateSkillPath: true })

        if (!res) {
          yakitNotify('error', '未获取到待编辑模板的详情, 请关闭页面重试')
          return
        }

        forgeData.current = cloneDeep(res)

        if (infoFormRef.current) {
          infoFormRef.current.resetFormValues()
          infoFormRef.current.setFormValues({
            ForgeType: forgeData.current.ForgeType || 'yak',
            ForgeName: forgeData.current.ForgeName || '',
            Description: forgeData.current.Description || '',
            Tag: forgeData.current.Tag || [],
            ToolNames: forgeData.current.ToolNames || [],
            ToolKeywords: forgeData.current.ToolKeywords || [],
          })
        }

        setPromptAction({
          Action: forgeData.current.Action || '',
          InitPrompt: forgeData.current.InitPrompt || '',
          PersistentPrompt: forgeData.current.PersistentPrompt || '',
          PlanPrompt: forgeData.current.PlanPrompt || '',
          ResultPrompt: forgeData.current.ResultPrompt || '',
        })

        handleChangeContent(
          forgeData.current.ForgeType === 'config'
            ? forgeData.current.ForgeContent || forgeData.current.Params || ''
            : forgeData.current.ForgeContent || '',
        )

        let skillPath = ''
        if (forgeData.current.ForgeType === 'skillmd') {
          const { SkillPath } = forgeData.current
          if (SkillPath) {
            try {
              await grpcFetchFileTree(SkillPath)
              skillPath = SkillPath
            } catch {
              skillPath = await createTemporarySkillDirectory()
            }
          } else {
            skillPath = await createTemporarySkillDirectory()
          }
        }
        setSkillPath(skillPath)
        setSkillInitPrompt(forgeData.current.InitPrompt || '')
      } catch (error) {
        yakitNotify('error', '未获取到待编辑模板的详情, 请关闭页面重试')
      } finally {
        setDelayCancelFetchDataLoading()
      }
    }
  })

  const [saveLoading, setSaveLoading] = useState(false)
  // 保存功能
  const handleSave = useMemoizedFn(() => {
    return new Promise<void>(async (resolve, reject) => {
      if (saveLoading) {
        reject()
        return
      }

      setSaveLoading(true)

      try {
        if (infoFormRef.current) {
          const formData = await infoFormRef.current.getFormValues()
          if (!formData) {
            reject()
            return
          }
          formData.ForgeContent = content || ''
          if (formData.ForgeType === 'config') {
            formData.InitPrompt = promptAction.InitPrompt ?? ''
            formData.PersistentPrompt = promptAction.PersistentPrompt ?? ''
            formData.PlanPrompt = promptAction.PlanPrompt ?? ''
            formData.ResultPrompt = promptAction.ResultPrompt ?? ''
            formData.Action = promptAction.Action ?? ''
          }
          if (formData.ForgeType === 'yak') {
            formData.ToolNames = undefined
            formData.ToolKeywords = undefined
          }

          if (formData.ForgeType === 'skillmd') {
            formData.SkillPath = skillPath || (await createTemporarySkillDirectory())
            formData.ForgeContent = undefined
            formData.ParamsUIConfig = undefined
            formData.ToolNames = undefined
            formData.ToolKeywords = undefined
            formData.Action = undefined
            formData.InitPrompt = skillInitPrompt
            formData.PersistentPrompt = undefined
            formData.PlanPrompt = undefined
            formData.ResultPrompt = undefined
          }

          // 解析参数UI数据
          if (content && formData.ForgeType !== 'skillmd') {
            const codeInfo = await onCodeToInfo({ type: 'yak', code: content || '' }, true)
            if (codeInfo) {
              const params = codeInfo.CliParameter || []
              formData.ParamsUIConfig = params.length === 0 ? undefined : JSON.stringify(params ?? [])
            } else {
              formData.ParamsUIConfig = undefined
            }
          } else {
            formData.ParamsUIConfig = undefined
          }

          // 生成最终需要保存的数据
          const requestData: AIForge = { ...(forgeData.current || {}), ...formData } as AIForge
          // 清除无用字段里的内容
          requestData.Params = undefined

          const apiFunc = requestData.Id ? grpcUpdateAIForge : grpcCreateAIForge
          apiFunc(requestData)
            .then(async (res) => {
              let resInfo: AIForge = cloneDeep(requestData)
              if (!resInfo.Id) {
                const resID = Number(res?.CreateID) || 0
                if (resID) resInfo.Id = resID
                else {
                  yakitNotify('error', `新建模板异常, 创建并未生成唯一ID号`)
                  reject()
                  return
                }
              }
              forgeData.current = cloneDeep(resInfo)
              emiter.emit('onTriggerRefreshForgeList', `${resInfo.Id}`)
              yakitNotify('success', '保存成功')
              resolve()
            })
            .catch(() => {
              reject()
            })
        } else {
          yakitNotify('error', '未获取到模板信息表单，请关闭页面重试')
          reject()
          return
        }
      } catch (error) {
        reject()
      } finally {
        setTimeout(() => {
          setSaveLoading(false)
        }, 200)
      }
    })
  })
  // 保存并执行功能
  const handleSaveAndRun = useMemoizedFn(() => {
    handleSave()
      .then(() => {
        if (!forgeData.current) {
          yakitNotify('warning', '保存成功但未获取到执行的模板数据')
          return
        }
        emiter.emit('menuOpenPage', JSON.stringify({ route: YakitRoute.AI_Agent }))
        setTimeout(() => {
          emiter.emit(
            'onReActChatEvent',
            JSON.stringify({
              type: ReActChatEventEnum.OPEN_FORGE_FORM,
              params: { value: forgeData.current },
            }),
          )
        }, 100)
      })
      .catch(() => {})
  })
  // #endregion

  // #region forge 基础信息相关逻辑
  const infoFormRef = useRef<AIForgeEditorInfoFormRef>(null)
  const [type, setType] = useState<AIForge['ForgeType']>('yak')
  // #endregion

  // #region forge prompt和源码信息相关逻辑
  // 简易模板下的 promopt 信息和 action 信息
  const [promptAction, setPromptAction] = useState<ConfigTypeForgePromptAction>({})

  // yak 模板下的源码或者简易模板下的参数代码
  const [content, setContent] = useState(DefaultForgeYakToCode)
  const [triggerParseContent, setTriggerParseContent] = useState(false)
  const handleChangeContent = useMemoizedFn((value: string) => {
    setContent(value)
    setTriggerParseContent((old) => !old)
  })
  // #endregion

  // #region 简易模式、技能模板的右侧 Head-UI
  const [advanceMode, setAdvanceMode] = useState(false)
  const handleChangeAdvanceMode = useMemoizedFn((bool: boolean) => {
    setConfigTypeActiveTab(bool ? 'code' : 'prompt')
    setAdvanceMode(bool)
  })
  const [configTypeActiveTab, setConfigTypeActiveTab] = useState<'prompt' | 'code'>('prompt')
  const [skillTab, setSkillTab] = useState<'content' | 'files'>('content')

  const configHeadUI = useMemo(() => {
    if (type === 'yak') return null

    if (type === 'skillmd') {
      return (
        <div className={styles['right-header']}>
          <div className={styles['header-left']}>
            <YakitRadioButtons
              buttonStyle="solid"
              value={skillTab}
              options={[
                { value: 'content', label: '正文' },
                { value: 'files', label: '文件' },
              ]}
              onChange={(e) => setSkillTab(e.target.value)}
            />
          </div>
        </div>
      )
    }

    return (
      <div className={styles['right-header']}>
        <div className={styles['header-left']}>
          {advanceMode ? (
            <YakitRadioButtons
              buttonStyle="solid"
              value={configTypeActiveTab}
              options={[
                { value: 'code', label: '源码' },
                { value: 'prompt', label: 'Prompt' },
              ]}
              onChange={(e) => setConfigTypeActiveTab(e.target.value)}
            />
          ) : (
            <div className={styles['left-title']}>Prompt</div>
          )}
        </div>

        <div className={styles['header-right']}>
          <div className={styles['switch-wrapper']}>
            <YakitSwitch size="small" checked={advanceMode} onChange={handleChangeAdvanceMode} />
            <div>高级模式</div>
          </div>
        </div>
      </div>
    )
  }, [type, advanceMode, configTypeActiveTab, skillTab])

  const isShowCode = useMemo(() => {
    if (type === 'yak') return true
    if (type === 'skillmd') return false
    return configTypeActiveTab === 'code'
  }, [type, configTypeActiveTab])
  const isShowCodeBorderTop = useMemo(() => {
    if (['yak', 'skillmd'].includes(type)) return false
    return configTypeActiveTab === 'code'
  }, [type, configTypeActiveTab])
  const isShowPrompt = useMemo(() => {
    if (['yak', 'skillmd'].includes(type)) return false
    return configTypeActiveTab === 'prompt'
  }, [type, configTypeActiveTab])
  const isShowCont = useMemo(() => {
    if (['yak', 'config'].includes(type)) return false
    return skillTab === 'content'
  }, [type, skillTab])
  const isShowFile = useMemo(() => {
    if (['yak', 'config'].includes(type)) return false
    return skillTab === 'files'
  }, [type, skillTab])
  // #endregion

  // #region 注册关闭页面时的触发事件
  // 销毁保存弹窗
  const destroySaveModal = useMemoizedFn(() => {
    if (modalRef.current) {
      modalRef.current.destroy()
      modalRef.current = null
    }
  })
  // 保存并退出
  const handleSaveAndExit = useMemoizedFn((isModify?: boolean) => {
    handleSave()
      .then(() => {
        destroySaveModal()
        emiter.emit(
          'closePage',
          JSON.stringify({ route: !!isModify ? YakitRoute.ModifyAIForge : YakitRoute.AddAIForge }),
        )
      })
      .catch(() => {})
  })
  // 是否保存并打开触发编辑的模板信息
  const handleSaveAndOpen = useMemoizedFn(async (isSave?: boolean) => {
    try {
      if (isSave) await handleSave()
      destroySaveModal()
      handleModifyInit()
    } catch (error) {}
  })
  const { setSubscribeClose, removeSubscribeClose } = useSubscribeClose()
  // 二次提示框的实例
  const modalRef = useRef<any>(null)
  useEffect(() => {
    if (isModify) {
      setSubscribeClose(YakitRoute.ModifyAIForge, {
        close: async () => {
          return {
            title: '模板未保存',
            content: '是否要将模板保存?',
            maskClosable: false,
            confirmLoading: saveLoading,
            cancelText: '不保存',
            okText: '保存',
            footerExtra: (
              <YakitButton type="outline2" onClick={destroySaveModal}>
                取消
              </YakitButton>
            ),
            onOk: (m) => {
              handleSaveAndExit(true)
            },
            onCancel: (m) => {
              destroySaveModal()
              emiter.emit('closePage', JSON.stringify({ route: YakitRoute.ModifyAIForge }))
            },
            getModal: (m) => {
              modalRef.current = m
            },
          }
        },
        reset: async () => {
          return {
            title: '模板未保存',
            content: '是否要将当前模板保存，并编辑点击的模板?',
            maskClosable: false,
            confirmLoading: saveLoading,
            cancelText: '不保存',
            okText: '保存',
            footerExtra: (
              <YakitButton type="outline2" onClick={destroySaveModal}>
                取消
              </YakitButton>
            ),
            onOk: (m) => {
              handleSaveAndOpen(true)
            },
            onCancel: (m) => {
              handleSaveAndOpen()
            },
            getModal: (m) => {
              modalRef.current = m
            },
          }
        },
      })

      return () => {
        removeSubscribeClose(YakitRoute.ModifyAIForge)
      }
    } else {
      setSubscribeClose(YakitRoute.AddAIForge, {
        close: async () => {
          return {
            title: '模板未保存',
            content: '是否要将模板保存?',
            confirmLoading: saveLoading,
            maskClosable: false,
            cancelText: '不保存',
            okText: '保存',
            footerExtra: (
              <YakitButton type="outline2" onClick={destroySaveModal}>
                取消
              </YakitButton>
            ),
            onOk: (m) => {
              handleSaveAndExit()
            },
            onCancel: () => {
              destroySaveModal()
              emiter.emit('closePage', JSON.stringify({ route: YakitRoute.AddAIForge }))
            },
            getModal: (m) => {
              modalRef.current = m
            },
          }
        },
      })
      return () => {
        removeSubscribeClose(YakitRoute.AddAIForge)
      }
    }
  }, [isModify])
  // #endregion

  // #region 技能模板相关逻辑
  const [skillInitPrompt, setSkillInitPrompt] = useState<string>('')
  const [skillPath, setSkillPath] = useState('')
  const createTemporarySkillDirectory = useMemoizedFn(async (): Promise<string> => {
    try {
      const path = await GenerateTempFilePath(`skill-${Date.now()}-${randomString(6)}`)
      await grpcFetchCreateFolder(path)
      return path
    } catch (error) {
      return ''
    }
  })
  // #endregion

  return (
    <div className={styles['forge-editor']}>
      <YakitSpin spinning={fetchDataLoading}>
        <div className={styles['forge-editor-wrapper']}>
          <div className={styles['forge-editor-header']}>
            <div className={styles['header-title']}>{isModify ? '编辑模板' : '新建模板'}</div>

            <div className={styles['header-btn-group']}>
              <YakitButton loading={saveLoading} type="outline1" icon={<OutlineExitIcon />} onClick={handleSaveAndRun}>
                保存并执行
              </YakitButton>
              <YakitButton loading={saveLoading} icon={<SolidStoreIcon />} onClick={handleSave}>
                保存
              </YakitButton>
            </div>
          </div>

          <div className={styles['forge-editor-body']}>
            <AIForgeEditorInfoForm
              ref={infoFormRef}
              setType={setType}
              setContent={handleChangeContent}
              skillPath={skillPath}
              setSkillPath={setSkillPath}
              createTemporarySkillDirectory={createTemporarySkillDirectory}
            />

            <div className={styles['forge-editor-right']}>
              {configHeadUI}

              <div className={styles['right-body']}>
                <div
                  tabIndex={isShowCode ? 1 : -1}
                  className={classNames(styles['right-pane'], {
                    [styles['right-pane-hidden']]: !isShowCode,
                  })}
                >
                  <AIForgeEditorCodeAndParams
                    className={isShowCodeBorderTop ? styles['right-pane-code-and-params'] : undefined}
                    content={content}
                    setContent={handleChangeContent}
                    triggerParse={triggerParseContent}
                  />
                </div>

                <div
                  tabIndex={isShowPrompt ? 1 : -1}
                  className={classNames(styles['right-pane'], {
                    [styles['right-pane-hidden']]: !isShowPrompt,
                  })}
                >
                  <AIForgeEditorPromptAndAction promptAction={promptAction} setPromptAction={setPromptAction} />
                </div>

                <div
                  tabIndex={isShowCont ? 1 : -1}
                  className={classNames(styles['right-pane'], {
                    [styles['right-pane-hidden']]: !isShowCont,
                  })}
                >
                  <AIForgeMilkdown
                    defaultValue={forgeData.current?.InitPrompt || ''}
                    onUpdateContent={setSkillInitPrompt}
                  />
                </div>

                <div
                  tabIndex={isShowFile ? 1 : -1}
                  className={classNames(styles['right-pane'], {
                    [styles['right-pane-hidden']]: !isShowFile,
                  })}
                >
                  <AIForgeEditorSkillFiles
                    skillPath={skillPath}
                    setSkillPath={setSkillPath}
                    createTemporarySkillDirectory={createTemporarySkillDirectory}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </YakitSpin>
    </div>
  )
})

export default ForgeEditor

/** @name 基础信息表单 */
const AIForgeEditorInfoForm: React.FC<AIForgeEditorInfoFormProps> = memo(
  forwardRef((props, ref) => {
    const { setType, setContent, skillPath, setSkillPath, createTemporarySkillDirectory } = props

    useImperativeHandle(
      ref,
      () => ({
        setFormValues: handleSetFormValues,
        resetFormValues: handleResetFormValues,
        getFormValues: handleGetFormValues,
      }),
      [],
    )

    const [expand, setExpand] = useState(true)
    const handleChangeExpand = useMemoizedFn(() => {
      setExpand((old) => !old)
    })

    const [form] = Form.useForm()

    const handleSetFormValues = useMemoizedFn((values: any) => {
      const data = cloneDeep(values)
      if (form) {
        form.setFieldsValue(data)
      }
    })
    const handleResetFormValues = useMemoizedFn(() => {
      if (form) {
        form.resetFields()
      }
    })
    const handleGetFormValues = useMemoizedFn(() => {
      return new Promise<EditorAIForge | null>(async (resolve, reject) => {
        try {
          if (!form) {
            yakitNotify('error', '获取不到表单实例数据, 请关闭页面后重试')
            resolve(null)
          }

          await form.validateFields()
          const formData = form.getFieldsValue()
          const info: EditorAIForge = {
            ForgeType: formData.ForgeType ?? '',
            ForgeName: formData.ForgeName ?? '',
            Description: formData.Description ?? undefined,
            Tag: formData.Tag ?? [],
            ToolNames: formData.ToolNames ?? [],
            ToolKeywords: formData.ToolKeywords ?? [],
          }
          if (!info.ForgeType || !info.ForgeName) {
            yakitNotify('error', '类型和名称不能为空')
            resolve(null)
            return
          }
          resolve(info)
        } catch (error) {
          if (!expand) setExpand(true)
          resolve(null)
        }
      })
    })

    /** forge-类型 */
    const type = Form.useWatch('ForgeType', form)
    useUpdateEffect(() => {
      setType(type)
    }, [type])
    /** 是否是简易模板类型 */
    const isTypeToConfig = useMemo(() => {
      return type === 'config'
    }, [type])

    const handleTypeChange = useMemoizedFn(async (type: AIForge['ForgeType']) => {
      if (type === 'yak') {
        setContent(DefaultForgeYakToCode)
      } else if (type === 'config') {
        setContent(DefaultForgeConfigToCode)
      } else {
        if (!skillPath) {
          const path = await createTemporarySkillDirectory()
          if (path) {
            setSkillPath(path)
          }
        }
      }
    })

    // #region tools
    const [tools, setTools] = useState<{ label: string; value: string }[]>([])
    const [fetchToolLoading, setFetchToolLoading] = useState(false)
    const handleFetchTools = useMemoizedFn(async (search?: string) => {
      setFetchToolLoading(true)
      const request: GetAIToolListRequest = {
        Pagination: {
          ...AIForgeListDefaultPagination,
          OrderBy: 'created_at',
          Limit: 50,
        },
        Query: search || '',
        ToolName: '',
        OnlyFavorites: false,
      }
      try {
        const res = await grpcGetAIToolList(request)
        if (res?.Tools) {
          setTools(res.Tools.map((item) => ({ label: item.Name, value: item.Name })))
        }
      } catch (error) {
      } finally {
        setTimeout(() => {
          setFetchToolLoading(false)
        }, 300)
      }
    })
    const handleSearchTool = useDebounceFn(
      (search?: string) => {
        handleFetchTools(search)
      },
      { wait: 300 },
    ).run

    useEffect(() => {
      handleFetchTools()
    }, [])
    // #endregion

    return (
      <div
        className={classNames(styles['ai-forge-editor-info-form'], {
          [styles['ai-forge-editor-info-hidden']]: !expand,
        })}
      >
        <div className={styles['editor-info-form']}>
          <div className={styles['editor-info-form-header']} onClick={handleChangeExpand}>
            <YakitButton
              type="outline2"
              size="small"
              className={styles['expand-btn']}
              icon={<OutlineChevronrightIcon />}
            />

            <div className={styles['header-title']}>基础信息</div>
          </div>

          <div className={styles['editor-info-form-body']}>
            <Form
              className={styles['form-container']}
              form={form}
              layout="vertical"
              initialValues={{ ForgeType: 'yak' }}
            >
              <Form.Item
                label={
                  <>
                    模板类型<span className="form-item-required">*</span>:
                  </>
                }
                name="ForgeType"
                rules={[{ required: true, message: '模板类型必填' }]}
              >
                <YakitSelect
                  wrapperClassName={styles['forge-type-select']}
                  dropdownClassName={styles['forge-type-select-dropdown']}
                  onChange={handleTypeChange}
                >
                  {DefaultForgeTypeList.map((item, index) => {
                    return (
                      <YakitSelect.Option key={item.key}>
                        <div key={item.key} className={styles['forge-type-select-option']}>
                          <div className={styles['header-icon']}>{item.icon}</div>
                          <div className={styles['type-content']}>{item.name}</div>
                        </div>
                      </YakitSelect.Option>
                    )
                  })}
                </YakitSelect>
              </Form.Item>

              <Form.Item
                label={
                  <>
                    模板名称<span className="form-item-required">*</span>:
                  </>
                }
                name="ForgeName"
                required={true}
                rules={[
                  {
                    validator: async (_, value) => {
                      if (!value || !value.trim()) return Promise.reject(new Error('模板名称必填'))
                      if (value.trim().length > 100) return Promise.reject(new Error('名称最长100位'))
                    },
                  },
                ]}
              >
                <YakitInput
                  wrapperClassName={styles['item-input']}
                  placeholder="请输入..."
                  size="large"
                  prefix={<OutlineIdentificationIcon />}
                  maxLength={100}
                />
              </Form.Item>

              <Form.Item
                label={
                  <>
                    描述<span className="form-item-required">*</span>:
                  </>
                }
                name="Description"
                required={true}
                rules={[
                  {
                    validator: async (_, value) => {
                      if (!value || !value.trim()) return Promise.reject(new Error('描述必填'))
                      // if (value.trim().length > 100)
                      //     return Promise.reject(new Error("描述最长100位"))
                    },
                  },
                ]}
              >
                <YakitInput.TextArea rows={2} placeholder="请输入..." />
              </Form.Item>

              <Form.Item
                label={
                  <>
                    Tag<span className="form-item-required">*</span>:
                  </>
                }
              >
                <Form.Item noStyle name="Tag" rules={[{ required: true, message: 'Tag必填' }]}>
                  <YakitSelect wrapperClassName={styles['item-select']} mode="tags" allowClear size="large">
                    {AIForgeBuiltInTag.map((item) => {
                      return (
                        <YakitSelect.Option key={item} value={item}>
                          {item}
                        </YakitSelect.Option>
                      )
                    })}
                  </YakitSelect>
                </Form.Item>
                <div className={styles['item-select-prefix-icon']}>
                  <OutlineTagIcon />
                </div>
              </Form.Item>

              {isTypeToConfig && (
                <>
                  <Form.Item name="ToolNames" label="工具名称">
                    <YakitSelect
                      mode="multiple"
                      allowClear
                      size="large"
                      showSearch={true}
                      filterOption={false}
                      options={tools}
                      notFoundContent={fetchToolLoading ? '搜索中...' : '无匹配结果'}
                      onSearch={handleSearchTool}
                    ></YakitSelect>
                  </Form.Item>

                  <Form.Item name="ToolKeywords" label="工具关键词">
                    <YakitSelect mode="tags" allowClear size="large"></YakitSelect>
                  </Form.Item>
                </>
              )}
            </Form>
          </div>
        </div>

        <div className={styles['editor-side-bar']}>
          <div className={styles['editor-side-bar-header']} onClick={handleChangeExpand}>
            <YakitButton
              type="outline2"
              size="small"
              className={styles['expand-btn']}
              icon={<OutlineChevrondownIcon />}
            />
            <div className={styles['header-title']}>基础信息</div>
          </div>
        </div>
      </div>
    )
  }),
)

/** @name prompt和action内容的输入框 */
const PromptAndActiveTextarea: React.FC<PromptAndActiveTextareaProps> = memo((props) => {
  const { title, hint, placeholder } = props

  const textareaRef = useRef<TextAreaRef>(null)
  const [focus, setFocus] = useState(false)
  const handleWrapperFocus = useMemoizedFn(() => {
    if (textareaRef && textareaRef.current) {
      textareaRef.current.focus()
    }
    setFocus(true)
  })
  const handleBlur = useMemoizedFn(() => {
    setFocus(false)
  })

  const [question, setQuestion] = useControllableValue<string>(props, {
    defaultValue: '',
  })
  const handleTextareaChange: ChangeEventHandler<HTMLTextAreaElement> = useMemoizedFn((e) => {
    const content = e.target.value
    setQuestion(content)
  })

  return (
    <div
      className={classNames(styles['prompt-and-action-textarea'], {
        [styles['prompt-and-action-textarea-focus']]: focus,
      })}
      onClick={handleWrapperFocus}
    >
      <div className={styles['textarea-header']}>
        <div className={styles['header-title']}>{title}</div>
        <Tooltip overlayClassName={styles['textarea-hint-icon-tooltip']} title={hint}>
          {!!hint && <OutlineInformationcircleIcon className={styles['header-hint-icon']} />}
        </Tooltip>
      </div>

      <QSInputTextarea
        ref={textareaRef}
        className={classNames(styles['textarea-body'])}
        placeholder={placeholder ?? '请输入...'}
        value={question}
        onBlur={handleBlur}
        onChange={handleTextareaChange}
      />
    </div>
  )
})

/** @name prompt和action展示 */
const AIForgeEditorPromptAndAction: React.FC<AIForgeEditorPromptAndActionProps> = memo((props) => {
  const [promptAction, setPromptAction] = useControllableValue<ConfigTypeForgePromptAction>(props, {
    defaultValue: {},
    valuePropName: 'promptAction',
    trigger: 'setPromptAction',
  })
  const handleChangePromptAction = useMemoizedFn((key: keyof ConfigTypeForgePromptAction, value: string) => {
    setPromptAction((old) => ({ ...old, [key]: value }))
  })

  return (
    <div className={styles['ai-forge-editor-prompt-and-action']}>
      <PromptAndActiveTextarea
        title="初始"
        value={promptAction.InitPrompt ?? ''}
        onChange={(value) => handleChangePromptAction('InitPrompt', value)}
      />
      <PromptAndActiveTextarea
        title="计划"
        value={promptAction.PlanPrompt ?? ''}
        onChange={(value) => handleChangePromptAction('PlanPrompt', value)}
      />
      <PromptAndActiveTextarea
        title="持久记忆"
        value={promptAction.PersistentPrompt ?? ''}
        onChange={(value) => handleChangePromptAction('PersistentPrompt', value)}
      />
      <PromptAndActiveTextarea
        title="结果"
        value={promptAction.ResultPrompt ?? ''}
        onChange={(value) => handleChangePromptAction('ResultPrompt', value)}
      />
      <PromptAndActiveTextarea
        title="结果提取"
        hint={`用于指定需提取的 action 名称，应与“结果 Prompt”中定义的 action 保持一致。系统会根据此配置\n从 AI 的输出结果中自动提取对应的结构化数据，作为生成总结报告、\n构建数据结构或驱动后续任务的依据。支持多个 action，多个 action之间通过英文逗号分隔。`}
        placeholder="要提取多个字段则逗号分隔输入多个字段名..."
        value={promptAction.Action ?? ''}
        onChange={(value) => handleChangePromptAction('Action', value)}
      />
    </div>
  )
})

/** @name 源码和参数展示 */
const AIForgeEditorCodeAndParams: React.FC<AIForgeEditorCodeAndParamsProps> = memo((props) => {
  const { triggerParse, className } = props

  const [content, setContent] = useControllableValue<string>(props, {
    defaultValue: '',
    valuePropName: 'content',
    trigger: 'setContent',
  })

  useEffect(() => {
    handleFetchParams()
  }, [triggerParse])

  const [form] = Form.useForm()

  // #region 获取参数
  const [fetchParamsLoading, setFetchParamsLoading] = useState(false)
  const [params, setParams] = useState<YakParamProps[]>([])

  const handleFetchParams = useDebounceFn(
    async () => {
      if (fetchParamsLoading) return

      setFetchParamsLoading(true)
      try {
        const codeInfo = await onCodeToInfo({ type: 'yak', code: content || '' }, true)
        if (codeInfo) {
          setParams([...codeInfo.CliParameter])
        }
      } catch (error) {
      } finally {
        setFetchParamsLoading(false)
      }
    },
    { wait: 300 },
  ).run

  const handleInitFormValue = useMemoizedFn(() => {
    if (!params || params.length === 0) {
      !!form && form.resetFields()
    } else {
      // 表单内数据
      let formData: CustomPluginExecuteFormValue = {}
      if (form) formData = (form.getFieldsValue() || {}) as CustomPluginExecuteFormValue

      let defaultValue: CustomPluginExecuteFormValue | undefined = { ...formData }

      let newFormValue: CustomPluginExecuteFormValue = {}
      params.forEach((ele) => {
        let initValue = formData[ele.Field] || ele.Value || ele.DefaultValue
        const value = getValueByType(initValue, ele.TypeVerbose)
        newFormValue = {
          ...newFormValue,
          [ele.Field]: value,
        }
      })
      form.setFieldsValue({ ...cloneDeep(defaultValue || {}), ...newFormValue })
    }
  })

  useEffect(() => {
    // 填充表单默认值
    handleInitFormValue()
  }, [params])

  /** 必要参数 */
  const requiredParams = useMemo(() => {
    return params.filter((item) => !!item.Required) || []
  }, [params])
  /** 选填参数 */
  const groupParams = useMemo(() => {
    const arr = params.filter((item) => !item.Required) || []
    return ParamsToGroupByGroupName(arr)
  }, [params])
  // #endregion

  return (
    <div className={classNames(styles['ai-forge-editor-code-and-params'], className)}>
      <div className={styles['editor-code-wrapper']}>
        <YakitEditor type={'yak'} value={content} setValue={setContent} />
      </div>

      <div className={styles['editor-params-preview-wrapper']}>
        <div className={styles['params-preview-header']}>
          <div className={styles['header-title']}>参数预览</div>
          <div className={styles['header-extra']}>
            <YakitButton type="text" loading={fetchParamsLoading} onClick={handleFetchParams}>
              获取参数
              <OutlineRefreshIcon />
            </YakitButton>
          </div>
        </div>

        <div className={styles['params-preview-container']}>
          <Form
            form={form}
            onFinish={() => {}}
            size="small"
            labelCol={{ span: 8 }}
            wrapperCol={{ span: 16 }}
            labelWrap={true}
            validateMessages={{
              /* eslint-disable no-template-curly-in-string */
              required: '${label} 是必填字段',
            }}
          >
            <div className={styles['custom-params-wrapper']}>
              <ExecuteEnterNodeByPluginParams paramsList={requiredParams} pluginType={'yak'} isExecuting={false} />
            </div>

            {groupParams.length !== 0 && (
              <div className={styles['additional-params-divider']}>
                <div className={styles['text-style']}>额外参数 (非必填)</div>
                <div className={styles['divider-style']}></div>
              </div>
            )}
            <ExtraParamsNodeByType extraParamsGroup={groupParams} pluginType={'yak'} />

            <div className={styles['to-end']}>已经到底啦～</div>
          </Form>
        </div>
      </div>
    </div>
  )
})

/** @name 正文md */
const AIForgeMilkdownBase: React.FC<AIForgeMilkdownBaseProps> = memo((props) => {
  const { readonly, defaultValue, onUpdateContent, onUpdateEditor, classNameWrapper } = props
  const { get, loading } = useEditor(
    (root) => {
      const placeholder = [
        placeholderConfig,
        placeholderPlugin,
        (ctx: Ctx) => () => {
          ctx.update(placeholderConfig.key, (prev) => ({
            ...prev,
            text: 'Please enter...',
          }))
        },
      ]

      return (
        Editor.make()
          .config((ctx) => {
            ctx.set(rootCtx, root)
            // 配置为只读
            ctx.set(editorViewOptionsCtx, {
              editable: () => !readonly,
            })
            ctx.set(defaultValueCtx, defaultValue || '')

            const listener = ctx.get(listenerCtx)
            listener.markdownUpdated((ctx, nextMarkdown, prevMarkdown) => {
              const isSave = nextMarkdown !== prevMarkdown
              if (isSave) {
                onUpdateContent?.(nextMarkdown)
              }
            })
          })
          .use(commonmark)
          .use(gfm)
          .use(gapCursorPlugin)
          .use(history)
          .use(clipboard)
          // placeholder
          .use(placeholder)
          // listener
          .use(listener)
      )
    },
    [readonly, defaultValue],
  )

  const editorRef = useRef<Editor | null>(null)
  useEffect(() => {
    if (loading) return
    const editor = get()
    if (!editor) return

    editorRef.current = editor
    onUpdateEditor?.(editor)

    let cleanup: (() => void) | undefined

    editor.action((ctx) => {
      const dom = ctx.get(editorViewCtx).dom

      const handler = (e: MouseEvent) => {
        e.preventDefault()
        onEditorContextMenu(e)
      }

      dom.addEventListener('contextmenu', handler)

      cleanup = () => {
        dom.removeEventListener('contextmenu', handler)
      }
    })

    return () => {
      cleanup?.()
    }
  }, [loading, get])

  const onEditorContextMenu = (event: React.MouseEvent | MouseEvent) => {
    showByRightContext(
      {
        data: [{ label: '转为纯文本后按 Markdown 解析', key: 'pasteMarkdown' }],
        onClick: ({ key }) => {
          if (key === 'pasteMarkdown') {
            handlePasteMarkdown()
          }
        },
      },
      event.clientX,
      event.clientY,
    )
  }

  const handlePasteMarkdown = useMemoizedFn(async () => {
    const editor = editorRef.current
    if (!editor) return

    let text = ''
    try {
      text = await navigator.clipboard.readText()
    } catch (e) {
      yakitNotify('error', '读取剪贴板失败')
      return
    }

    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      const parser = ctx.get(parserCtx)
      const doc = parser(text)
      view.dispatch(view.state.tr.replaceSelectionWith(doc))
    })
  })

  useEffect(() => {
    return () => {
      const value = get()?.action(getMarkdown()) || ''
      onUpdateContent?.(value)
    }
  }, [])

  return (
    <div className={classNames(styles['ai-forge-editor-skill-milkdown'], classNameWrapper)}>
      <Milkdown />
    </div>
  )
})
const AIForgeMilkdown: React.FC<AIForgeMilkdownProps> = React.memo((props) => {
  return (
    <MilkdownProvider>
      <ProsemirrorAdapterProvider>
        <AIForgeMilkdownBase {...props} />
      </ProsemirrorAdapterProvider>
    </MilkdownProvider>
  )
})

/** @name 文件树和代码展示 */
const AIForgeEditorSkillFiles: React.FC<AIForgeEditorSkillFilesProps> = memo((props) => {
  const { skillPath, setSkillPath, createTemporarySkillDirectory } = props
  const treeRef = useRef<FileTreeSystemListRef>(null)
  const operatingNode = useRef<FileNodeProps>()
  const [selected, setSelected] = useState<FileNodeProps>()
  const watchToken = useRef<string>()
  const updateWatchTokenFun = useMemoizedFn((token: string) => {
    watchToken.current = token
  })
  const firstOpenRef = useRef<boolean>(false)

  const updateTreeData = useMemoizedFn<React.Dispatch<React.SetStateAction<FileNodeProps[]>>>((value) => {
    if (!value.length) {
      setSkillPath('')
    } else {
      if (!firstOpenRef.current) {
        firstOpenRef.current = true
        positioningSKILLFile(value[0].path)
      }
      setSkillPath(value[0].path)
    }
  })

  const positioningSKILLFile = useMemoizedFn(async (basePath) => {
    try {
      await treeRef.current?.loadFolder(basePath)
      const path = await getPathJoin(basePath, 'SKILL.md')
      const node = treeRef.current?.getDetailMap(path)
      if (node) {
        const event: FileMonitorProps = {
          Id: watchToken.current!,
          CreateEvents: [],
          DeleteEvents: [],
          ChangeEvents: [
            {
              Op: 'markReadOnly',
              Path: node.path,
              IsDir: node.isFolder,
            },
          ],
        }
        emiter.emit('onRefreshYakRunnerFileTree', JSON.stringify(event))
        setSelected({ ...node, isReadOnly: true })
      }
    } catch (error) {}
  })

  const menuData = useMemo(
    () => [
      { key: 'createFile', label: '新建文件', disabled: !skillPath },
      { key: 'createFolder', label: '新建文件夹' },
    ],
    [skillPath],
  )
  const handleMenuSelect = useMemoizedFn(async (key: string) => {
    switch (key) {
      case 'createFile':
        creatTempTreeNode(false)
        break
      case 'createFolder':
        if (!skillPath) {
          const path = await createTemporarySkillDirectory()
          if (path) {
            setSkillPath(path)
          }
        } else {
          creatTempTreeNode(true)
        }
        break
      default:
        break
    }
  })

  const creatTempTreeNode = useMemoizedFn(async (isFolder: boolean) => {
    let basePath: string = skillPath
    if (selected?.path) {
      basePath = selected.isFolder ? selected.path : selected.parent || skillPath
    }
    try {
      // 先加载当前文件夹
      await treeRef.current?.loadFolder(basePath)
      let path = await getPathJoin(basePath, `${uuidv4()}-create`)
      if (!path.length) return
      // 通知新增临时文件夹或文件
      const event: FileMonitorProps = {
        Id: watchToken.current!,
        CreateEvents: [
          {
            Path: path,
            Op: 'createTemp',
            IsDir: isFolder,
          },
        ],
        DeleteEvents: [],
        ChangeEvents: [],
      }
      emiter.emit('onRefreshYakRunnerFileTree', JSON.stringify(event))
    } catch (error) {}
  })

  const treeMenuData = useMemoizedFn((node) => {
    return [
      {
        key: 'openFolder',
        label: '在文件夹中显示',
      },
      {
        key: 'path',
        label: '复制路径',
      },
      {
        key: 'relativePath',
        label: '复制相对路径',
      },
      {
        type: 'divider',
      },
      {
        key: 'delete',
        label: <span style={{ color: 'var(--Colors-Use-Error-Primary)' }}>删除</span>,
      },
      {
        key: 'rename',
        label: '重命名',
      },
    ] satisfies YakitMenuItemType[]
  })
  const handleTreeDropdown = useMemoizedFn(async (treeNode: FileNodeProps, key: string) => {
    operatingNode.current = treeNode
    switch (key) {
      case 'openFolder':
        onOpenLocalFileByPath(treeNode.path)
        break
      case 'path':
        setClipboardText(treeNode.path)
        break
      case 'relativePath':
        const relativePath = await getRelativePath(skillPath, treeNode.path)
        setClipboardText(relativePath)
        break
      case 'delete':
        setShowDelete(true)
        break
      case 'rename':
        const event: FileMonitorProps = {
          Id: watchToken.current!,
          CreateEvents: [],
          DeleteEvents: [],
          ChangeEvents: [
            {
              Op: 'renameFront',
              Path: treeNode.path,
              IsDir: treeNode.isFolder,
            },
          ],
        }
        emiter.emit('onRefreshYakRunnerFileTree', JSON.stringify(event))
        break
      default:
        break
    }
  })

  const [showDelete, setShowDelete] = useState<boolean>(false)
  const onDelete = useMemoizedFn(async () => {
    try {
      if (!operatingNode.current) return
      const { path, isFolder } = operatingNode.current
      await grpcFetchDeleteFile(path)
      const event: FileMonitorProps = {
        Id: watchToken.current!,
        CreateEvents: [],
        DeleteEvents: [
          {
            Path: path,
            Op: 'delete',
            IsDir: isFolder,
          },
        ],
        ChangeEvents: [],
      }
      emiter.emit('onRefreshYakRunnerFileTree', JSON.stringify(event))
      yakitNotify('success', '删除成功')
    } catch (error) {
      yakitNotify('error', '删除失败')
    } finally {
      operatingNode.current = undefined
      setShowDelete(false)
    }
  })
  const onTreeNodeDelFun = useMemoizedFn((path: string) => {
    if (path === skillPath) {
      setSelected(undefined)
      setSkillPath('')
    }
  })

  const filePreviewData = useMemo(() => {
    if (selected?.isFolder) return undefined
    return selected
  }, [selected])

  return (
    <div className={styles['ai-forge-editor-skill-files']}>
      <YakitResizeBox
        isVer={false}
        lineDirection="left"
        firstNode={
          <div className={styles['fileTree-wrapper']}>
            <div className={styles['fileTree-header']}>
              <div className={styles['title-style']}>文件列表</div>
              <div className={styles['extra']}>
                <Tooltip title={'刷新'}>
                  <YakitButton
                    type="text2"
                    icon={<OutlineRefreshIcon />}
                    onClick={() => {
                      treeRef.current?.onResetTreeList()
                    }}
                  />
                </Tooltip>
                <YakitDropdownMenu
                  menu={{
                    data: menuData,
                    onClick: ({ key, keyPath }) => handleMenuSelect(key),
                  }}
                  dropdown={{
                    trigger: ['click'],
                    placement: 'bottomLeft',
                  }}
                >
                  <YakitButton type="text2" icon={<OutlinePluscircleIcon />} />
                </YakitDropdownMenu>
              </div>
            </div>
            <div className={styles['fileTree-tree']}>
              <FileTreeSystemList
                ref={treeRef}
                key={skillPath}
                updateWatchTokenFun={updateWatchTokenFun}
                onTreeNodeDelFun={onTreeNodeDelFun}
                path={skillPath}
                setTreeData={updateTreeData}
                isOpen={false}
                isFolder={true}
                selected={selected}
                setSelected={setSelected}
                treeMenuData={treeMenuData}
                handleTreeDropdown={handleTreeDropdown}
              />
              <YakitHint
                visible={showDelete}
                title={`是否要删除${operatingNode.current?.name}`}
                content={`确认删除后将会彻底删除（windows系统将会移入回收站）`}
                onOk={onDelete}
                onCancel={() => setShowDelete(false)}
              />
            </div>
          </div>
        }
        firstRatio="15%"
        firstMinSize="300px"
        secondNode={<AIForgeSkillFileCont data={filePreviewData} />}
        secondRatio="85%"
        secondMinSize="400px"
      ></YakitResizeBox>
    </div>
  )
})
/** @name 文件树代码展示 */
const AIForgeSkillFileCont: React.FC<{ data?: FileNodeProps }> = ({ data }) => {
  const path = data?.path ?? ''
  const name = data?.name ?? ''
  const icon = data?.icon ?? 'default'
  const isReadOnly = data?.isReadOnly ?? false

  const [value, setValue] = useState<string>('')
  const [showFileHint, setShowFileHint] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const [isBinary, setIsBinary] = useState(false)

  const iconPath = useMemo(() => {
    return KeyToIcon[icon]?.iconPath ?? ''
  }, [icon])

  const fetchFileInfo = useMemoizedFn(async (targetPath: string) => {
    if (!targetPath) return
    try {
      // 取消上一次请求
      if (loading) {
        ipcRenderer.invoke('cancel-ReadFile')
      }
      setLoading(true)
      const { size, isPlainText } = await getCodeSizeByPath(targetPath)
      if (size > MAX_FILE_SIZE_BYTES) {
        setFileInfo(null)
        setShowFileHint(true)
        return
      }
      setIsBinary(!isPlainText)
      const content = await getCodeByPath(targetPath)
      const file = await getLocalFileName(targetPath)
      setFileInfo({ path: targetPath, size, isPlainText, content, language: monacaLanguageType(file.suffix) })
    } catch (err) {
      yakitNotify('error', `Failed to load file:${err}`)
    } finally {
      setLoading(false)
    }
  })

  useEffect(() => {
    setFileInfo(null)
    setShowFileHint(false)
    if (path) {
      fetchFileInfo(path)
    }
  }, [path])

  useEffect(() => {
    if (fileInfo?.content) {
      setValue(fileInfo?.content)
    } else {
      setValue('')
    }
  }, [fileInfo])

  // 自动保存
  const autoSaveCurrentFile = useDebounceFn(
    (content: string) => {
      grpcFetchSaveFile(path, content)
    },
    {
      wait: 500,
    },
  )
  const updateAreaInputInfo = useMemoizedFn((content: string) => {
    autoSaveCurrentFile.run(content)
  })

  if (!data) {
    return <></>
  }

  return (
    <div className={styles['ai-forge-skill-file-cont']}>
      <div className={styles['ai-forge-skill-file-cont-title']}>
        <div className={styles['ai-forge-skill-file-cont-title-icon']}>
          <div className={styles['ai-forge-skill-file-cont-title-icon-left']}>
            <img src={iconPath} alt="" />
            <span>{data.isDelete ? <del>{name}</del> : name}</span>
          </div>
          <div className={styles['ai-forge-skill-file-cont-title-icon-right']}>
            <CopyComponents copyText={fileInfo?.content || ''} iconColor="var(--Colors-Use-Neutral-Text-3-Secondary)" />
            <YakitButton
              type="text2"
              size="middle"
              icon={<OutlineFolderopenIcon />}
              onClick={() => onOpenLocalFileByPath(path)}
            />
          </div>
        </div>
        <div className={styles['ai-forge-skill-file-cont-title-path']}>{path}</div>
      </div>
      <div className={styles['ai-forge-skill-file-cont-content']}>
        <YakitSpin spinning={loading}>
          {isBinary ? (
            <Result
              status={'warning'}
              subTitle={'此文件是二进制文件或使用了不受支持的文本编码，所以无法在文本编辑器中显示。'}
              extra={[
                <YakitButton size="max" type="primary" onClick={() => setIsBinary(false)}>
                  仍然打开
                </YakitButton>,
              ]}
            />
          ) : (
            <YakitEditor
              key={fileInfo?.path || 'skill-empty-editor'}
              value={value}
              setValue={updateAreaInputInfo}
              type={fileInfo?.language || 'plaintext'}
              readOnly={isReadOnly}
            />
          )}
        </YakitSpin>

        {/* 文件过大弹窗 */}
        <YakitHint
          visible={showFileHint}
          title="文件警告"
          content="文件过大，无法预览"
          cancelButtonProps={{ style: { display: 'none' } }}
          onOk={() => {
            setFileInfo(null)
            setShowFileHint(false)
          }}
          okButtonText={'知道了'}
        />
      </div>
    </div>
  )
}
