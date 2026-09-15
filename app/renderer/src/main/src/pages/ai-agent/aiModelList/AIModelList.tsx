import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type {
  AILocalModelListItemPromptHintProps,
  AILocalModelListItemProps,
  AILocalModelListProps,
  AILocalModelListWrapperProps,
  AIModelFreeTagProps,
  AIOnlineModelListItemProps,
  AIOnlineModelProps,
  OutlineAtomIconByStatusProps,
} from './AIModelListType'
import styles from './AIModelList.module.scss'
import { useCreation, useMemoizedFn, useUpdateEffect } from 'ahooks'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import {
  type AIGlobalConfig,
  type AIModelConfig,
  getModelName,
  grpcAIConfigHealthCheck,
  grpcCancelStartLocalModel,
  grpcDeleteLocalModel,
  grpcGetSupportedLocalModels,
  grpcIsLlamaServerReady,
  grpcIsLocalModelReady,
  grpcSetAIGlobalConfig,
  grpcStopLocalModel,
} from './utils'
import { resetForcedAIModalFlag } from './utils'
import type { LocalModelConfig } from '../type/aiModel'
import type { ModalProps } from 'antd'
import { yakitNotify } from '@/utils/notification'
import { CopyComponents, YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import {
  AtomOutlined,
  ChatOutlined,
  ClipboardCopyOutlined,
  CloudDownloadOutlined,
  DotsVerticalOutlined,
  ExclamationOutlined,
  LightBulbOutlined,
  PencilAltOutlined,
  PlayOutlined,
  RefreshOutlined,
  TrashOutlined,
  SpeechToTextOutlined,
  CheckOutlined,
  FigmaIcon28011794Outlined,
  FigmaIcon4866167279Outlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import { CheckCircleSolid } from '@yakit-libs/yakit-ui-icons/solid'

import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import {
  DownloadLlamaServerModelPrompt,
  InstallLlamaServer,
  InstallLlamaServerModelPrompt,
} from './installLlamaServerModelPrompt/InstallLlamaServerModelPrompt'
import { YakitDropdownMenu } from '@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu'
import type { YakitMenuItemType } from '@/components/yakitUI/YakitMenu/YakitMenu'
import {
  AILocalModelTypeEnum,
  AIModelPolicyEnum,
  AIModelTypeEnum,
  type AIModelTypeEnumType,
  AIOnlineModelIconMap,
} from '../defaultConstant'
import { randomString } from '@/utils/randomUtil'
import { AIStartModelForm } from './aiStartModelForm/AIStartModelForm'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import { AddAIModel } from './addAIModel/AddAIModel'
import type { ThirdPartyApplicationConfig } from '@/components/configNetwork/ConfigNetworkPage'
import classNames from 'classnames'
import { YakitHint } from '@/components/yakitUI/YakitHint/YakitHint'
import { YakitCheckbox } from '@/components/yakitUI/YakitCheckbox/YakitCheckbox'
import { onOpenLocalFileByPath } from '@/pages/notepadManage/notepadManage/utils'
import emiter from '@/utils/eventBus/eventBus'
import { getMainOperatorPageBodyContainerOrBody } from '@/utils/getMainOperatorPageBodyContainer'
import {
  AIModelCheckResult,
  AIModelForm,
  buildAIConfigHealthCheckConfig,
  getModelTypeByFileName,
} from './aiModelForm/AIModelForm'
import type { AIModelFormProps } from './aiModelForm/AIModelFormType'
import { type TFunction, useI18nNamespaces } from '@/i18n/useI18nNamespaces'

export const setAIModal = (params: {
  modelType?: AIModelFormProps['aiModelType']
  item?: AIModelFormProps['item']
  onSuccess: () => void
  mountContainer?: ModalProps['getContainer']
  t: TFunction
}) => {
  const { modelType, item, onSuccess, mountContainer, t } = params
  const m = showYakitModal({
    title: (modalT) => modalT('AIModelList.addThirdPartyApp'),
    width: 600,
    footer: null,
    closable: true,
    maskClosable: false,
    keyboard: false,
    getContainer: mountContainer,
    onCancel: () => {
      m.destroy()
    },
    content: (
      <>
        <AIModelForm
          item={item}
          aiModelType={modelType || AIModelTypeEnum.TierIntelligent}
          onClose={() => {
            m.destroy()
          }}
          onSuccess={() => {
            resetForcedAIModalFlag()
            onSuccess()
          }}
        />
      </>
    ),
  })
}

/** 编辑ai model */
export const onEditAIModel = (data: {
  aiGlobalConfig: AIGlobalConfig
  index: number
  fileName: string
  mountContainer?: ModalProps['getContainer']
  onSuccess: () => void
  t: TFunction
}) => {
  const { aiGlobalConfig, index, fileName, mountContainer, onSuccess, t } = data
  try {
    if (!aiGlobalConfig) return
    const currentItem = aiGlobalConfig[fileName][index]
    const modelType = getModelTypeByFileName(fileName)
    if (!currentItem || !modelType) {
      yakitNotify(
        'error',
        `${t(
          'AIOnlineModeSetting.configErrorEdit',
        )}:modelType:${modelType};fileName:${fileName};currentItem:${JSON.stringify(currentItem)}`,
      )
      return
    }
    setAIModal({
      item: currentItem,
      modelType,
      mountContainer,
      t,
      onSuccess: () => {
        onSuccess()
      },
    })
  } catch (error) {}
}

/** 删除 ai model */
export const onRemoveAIModel = (data: {
  aiGlobalConfig: AIGlobalConfig
  index: number
  fileName: string
  onSuccess: () => void
}) => {
  try {
    const { fileName, index, aiGlobalConfig, onSuccess } = data
    if (!aiGlobalConfig) return
    const newAIGlobalConfig = { ...aiGlobalConfig }
    const list = newAIGlobalConfig[fileName].filter((_, i) => i !== index)
    newAIGlobalConfig[fileName] = [...list]
    grpcSetAIGlobalConfig(newAIGlobalConfig).then(() => {
      onSuccess()
    })
  } catch (error) {}
}

/** 选中得model,设置为该类型得第一位 */
export const onSelectAIModel = (data: {
  aiGlobalConfig: AIGlobalConfig
  item: AIModelConfig
  index: number
  fileName: string
  onSuccess: () => void
}) => {
  try {
    const { fileName, item, index, aiGlobalConfig, onSuccess } = data
    if (!aiGlobalConfig) return
    const newAIGlobalConfig = { ...aiGlobalConfig }
    newAIGlobalConfig[fileName].splice(index, 1)
    newAIGlobalConfig[fileName].unshift(item)
    grpcSetAIGlobalConfig(newAIGlobalConfig).then(() => {
      onSuccess()
    })
    emiter.emit('onRefreshAvailableAIModelList')
  } catch (error) {}
}

export const getTipByType = (routingPolicy: AIModelPolicyEnum, t: TFunction) => {
  switch (routingPolicy) {
    case AIModelPolicyEnum.PolicyAuto:
      return t('AIModelList.policyAuto')
    case AIModelPolicyEnum.PolicyPerformance:
      return t('AIModelList.policyPerformance')
    case AIModelPolicyEnum.PolicyCost:
      return t('AIModelList.policyCost')
    case AIModelPolicyEnum.PolicyBalance:
      return t('AIModelList.policyBalance')

    default:
      return null
  }
}

export const AIOnlineModel: React.FC<AIOnlineModelProps> = React.memo((props) => {
  const { title, subTitle, list, onEdit, onRemove, onSelect, modelType, checkedVariant } = props

  return (
    <div className={styles['ai-online-model']}>
      {title && (
        <div className={styles['ai-online-model-header']}>
          <div className={styles['ai-online-model-header-title']}>{title}</div>
          <div className={styles['ai-online-model-header-subtitle']}>{subTitle}</div>
        </div>
      )}
      <div className={styles['ai-online-model-list']}>
        {list.map((item, index) => (
          <div
            key={index}
            className={classNames(styles['ai-online-model-list-row'])}
            onClick={() => onSelect(item, index)}
          >
            <AIOnlineModelListItem
              item={item}
              onEdit={() => onEdit(index)}
              onRemove={() => onRemove(index)}
              checked={index === 0}
              modelType={modelType}
              checkedVariant={checkedVariant}
            />
          </div>
        ))}
      </div>
    </div>
  )
})
const AIOnlineModelListItem: React.FC<AIOnlineModelListItemProps> = React.memo((props) => {
  const { item, checked, onEdit, onRemove, modelType, checkedVariant } = props

  const [testLoading, setTestLoading] = useState<boolean>(false)

  const config: ThirdPartyApplicationConfig = useCreation(() => {
    return item.Provider
  }, [item.Provider])
  const onEditClick = useMemoizedFn((e) => {
    e.stopPropagation()
    onEdit(item)
  })
  const onRemoveClick = useMemoizedFn((e) => {
    e.stopPropagation()
    onRemove(item)
  })

  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi', 'projectManage'])
  const onApplyRecommendConfig = useMemoizedFn((config: ThirdPartyApplicationConfig) => {
    const newItem: AIModelConfig = {
      ProviderId: item.ProviderId,
      Provider: config,
      ModelName: item.ModelName,
      ExtraParams: item.ExtraParams,
      ...(item.IsOnline ? { IsOnline: true } : {}),
    }
    setAIModal({
      item: newItem,
      modelType: modelType as AIModelTypeEnumType,
      t,
      onSuccess: () => {
        emiter.emit('onRefreshAIModelList')
      },
    })
  })

  const onCheckModel = useMemoizedFn((e) => {
    e.stopPropagation()
    setTestLoading(true)
    const value = {
      Type: item.Provider.Type,
      api_key: item.Provider.APIKey,
      domain: item.Provider.Domain,
      proxy: item.Provider.Proxy,
      no_https: item.Provider.NoHttps,
      api_type: item.Provider.APIType,
      base_url: item.Provider.BaseURL,
      endpoint: item.Provider.Endpoint,
      enable_endpoint: item.Provider.EnableEndpoint,
      Headers: item.Provider.Headers,
      model: item.ModelName,
      model_type: modelType,
    }
    const config = buildAIConfigHealthCheckConfig(value)
    grpcAIConfigHealthCheck({
      Config: config,
      Content: '测试成功',
    })
      .then((response) => {
        const aiModelType = (modelType || AIModelTypeEnum.TierIntelligent) as AIModelTypeEnumType
        const m = showYakitModal({
          hiddenHeader: true,
          type: 'white',
          onOk: () => m.destroy(),
          width: 600,
          content: (
            <AIModelCheckResult
              testResult={response}
              onClose={() => m.destroy()}
              onApplyRecommendConfig={(config) => {
                onApplyRecommendConfig(config)
                m.destroy()
              }}
              aiModelType={aiModelType}
              model={item?.ModelName}
            />
          ),
        })
      })
      .finally(() => {
        setTimeout(() => {
          setTestLoading(false)
        }, 200)
      })
  })
  const modelName = useCreation(() => {
    return getModelName(item.ModelName)
  }, [item.ModelName])

  // 判断是否显示删除按钮,如果是内置模型,不显示删除按钮
  const isShowRemove = useCreation(() => {
    return item.ExtraParams.find((param) => param.Key === 'isBuildin')?.Value !== 'true'
  }, [item.ExtraParams])
  return (
    <div className={styles['ai-online-model-list-item']}>
      <div className={styles['ai-online-model-list-item-header']}>
        {AIOnlineModelIconMap[config.Type] || <OutlineAtomIconByStatus />}
        <div className={styles['ai-online-model-list-item-type']}>{modelName}</div>

        <div className={styles['ai-online-model-list-item-model']}>
          <AtomOutlined className={styles['atom-icon']} color="currentColor" />
          <span className={styles['ai-online-model-list-item-model-text']}>{config.Type}</span>
        </div>
        {!isShowRemove && (
          <div className={styles['ai-online-model-list-item-model']}>
            <span className={styles['ai-online-model-list-item-model-text']}>{t('ProjectManage.builtin')}</span>
          </div>
        )}
        {item?.IsOnline ? (
          <YakitTag size="small" color="warning" fullRadius className={styles['ai-online-model-list-item-info']}>
            {t('ProjectManage.server')}
          </YakitTag>
        ) : null}
      </div>
      <div className={styles['ai-online-model-list-item-extra']}>
        <div className={styles['ai-online-model-list-item-extra-edit']}>
          <YakitButton
            type="text2"
            icon={<FigmaIcon4866167279Outlined color="currentColor" />}
            onClick={onCheckModel}
            loading={testLoading}
          />
          <YakitButton
            type="text2"
            icon={<PencilAltOutlined color="currentColor" />}
            onClick={onEditClick}
            disabled={item?.IsOnline}
          />
          {isShowRemove && (
            <YakitPopconfirm
              title={`确定要删除厂商${config.Type},模型名称为${modelName} 吗？`}
              onConfirm={onRemoveClick}
              onCancel={(e) => {
                e?.stopPropagation()
              }}
            >
              <YakitButton
                type="text2"
                icon={<TrashOutlined color="currentColor" />}
                className={styles['trash-icon']}
                onClick={(e) => {
                  e.stopPropagation()
                }}
              />
            </YakitPopconfirm>
          )}
        </div>
        {checked &&
          (checkedVariant === 'circle' ? (
            <CheckCircleSolid className={styles['check-icon-circle']} color="currentColor" />
          ) : (
            <CheckOutlined className={styles['check-icon']} color="currentColor" />
          ))}
      </div>
    </div>
  )
})
export const AILocalModelList: React.FC<AILocalModelListProps> = React.memo(
  forwardRef((props, ref) => {
    const { setLocalTotal } = props
    const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
    const [spinning, setSpinning] = useState<boolean>(false)
    const [isRef, setIsRef] = useState<boolean>(false)
    const [supportedModelsUser, setSupportedModelsUser] = useState<LocalModelConfig[]>([])
    const [supportedModels, setSupportedModels] = useState<LocalModelConfig[]>([])

    const [llamaServerReady, setLlamaServerReady] = useState<boolean>(false)
    const [llamaServerChecking, setLlamaServerChecking] = useState<boolean>(true)
    const [visible, setVisible] = useState<boolean>(false)

    const tokenRef = useRef(randomString(60))
    useImperativeHandle(
      ref,
      () => ({
        onRefresh: () => {
          init()
        },
      }),
      [],
    )

    useEffect(() => {
      init()
    }, [])
    const init = useMemoizedFn(() => {
      setLlamaServerChecking(true)
      grpcIsLlamaServerReady()
        .then((res) => {
          setLlamaServerReady(res.Ok)
          if (res.Ok) {
            getList()
          } else {
            yakitNotify('error', t('AILocalModelList.llamaServerNotReady', { reason: res.Reason }))
          }
        })
        .finally(() => {
          setTimeout(() => {
            setLlamaServerChecking(false)
          }, 200)
        })
    })
    const getList = useMemoizedFn(() => {
      setSpinning(true)
      grpcGetSupportedLocalModels()
        .then((response) => {
          const userModels: LocalModelConfig[] = []
          const defaultModels: LocalModelConfig[] = []
          setLocalTotal(response?.length || 0)
          response?.forEach((model) => {
            if (model.IsLocal) {
              userModels.push(model)
            } else {
              defaultModels.push(model)
            }
          })
          setSupportedModelsUser(userModels)
          setSupportedModels(defaultModels)
        })
        .finally(() => {
          setTimeout(() => {
            setSpinning(false)
            setIsRef(!isRef)
          }, 200)
        })
    })

    const installLlamaServer = useMemoizedFn(() => {
      const m = showYakitModal({
        title: (modalT) => modalT('AILocalModelList.installLlamaServer'),
        width: '50%',
        maskClosable: false,
        type: 'white',
        content: (
          <InstallLlamaServerModelPrompt
            token={tokenRef.current}
            onStart={() => {
              m.destroy()
              setVisible(true)
            }}
          />
        ),
        footer: null,
      })
    })
    const installFinished = useMemoizedFn(() => {
      setVisible(false)
      init()
    })
    const installCancel = useMemoizedFn(() => {
      setVisible(false)
    })
    const code = useCreation(() => {
      return 'sudo xattr -r -d com.apple.quarantine ~/yakit-projects/projects/libs/llama-server'
    }, [])
    return llamaServerReady ? (
      <YakitSpin spinning={spinning}>
        {supportedModelsUser.length > 0 && (
          <AILocalModelListWrapper
            title={t('AILocalModelList.myAdded')}
            list={supportedModelsUser}
            onRefresh={getList}
          />
        )}
        <AILocalModelListWrapper
          title={t('AILocalModelList.recommendedModels')}
          list={supportedModels}
          onRefresh={getList}
        />
      </YakitSpin>
    ) : (
      <YakitSpin spinning={llamaServerChecking}>
        <div className={styles['ai-local-model-empty']}>
          <div className={styles['ai-local-model-notice']}>
            <div className={styles['notice-title']}>
              <LightBulbOutlined color="currentColor" />
              {t('AILocalModelList.notice')}
            </div>
            <div>
              {t('AILocalModelList.macNotice')}
              <YakitTag color="purple">sudo xattr -r</YakitTag>
              <YakitTag color="purple">-d com.apple.quarantine ~/yakit-projects</YakitTag>
              <YakitTag color="purple">
                /projects/libs/llama-server
                <CopyComponents copyText={code} className={styles['copy']} />
              </YakitTag>
              {t('AILocalModelList.macNoticeSuffix')}
            </div>
            <div>{t('AILocalModelList.diskNotice')}</div>
          </div>
          <div className={styles['ai-list-empty-wrapper']}>
            <YakitEmpty title={t('YakitEmpty.noData')} description={t('AILocalModelList.localManagerDesc')} />
            <div className={styles['ai-list-btns-wrapper']}>
              <YakitButton type="outline1" icon={<RefreshOutlined color="currentColor" />} onClick={init}>
                {t('YakitButton.refresh')}
              </YakitButton>
              <YakitButton
                type="primary"
                icon={<CloudDownloadOutlined color="currentColor" />}
                onClick={installLlamaServer}
              >
                {t('AILocalModelList.installLlamaServer')}
              </YakitButton>
            </div>
          </div>
        </div>
        {visible && (
          <InstallLlamaServer
            grpcInterface="InstallLlamaServer"
            title={t('AILocalModelList.llamaInstalling')}
            token={tokenRef.current}
            onFinished={installFinished}
            onCancel={installCancel}
            getContainer={getMainOperatorPageBodyContainerOrBody()}
          />
        )}
      </YakitSpin>
    )
  }),
)
const AILocalModelListWrapper: React.FC<AILocalModelListWrapperProps> = React.memo((props) => {
  const { title, list, onRefresh } = props
  return (
    <div className={styles['ai-local-model-list-wrapper']}>
      <div className={styles['ai-local-model-list-title']}>
        <span>{title}</span>
        <div className={styles['ai-model-list-total']}>{list.length}</div>
      </div>
      <div className={styles['ai-local-model-list']}>
        {list.map((rowData) => (
          <div className={styles['ai-local-model-list-row']} key={rowData.Name}>
            <AILocalModelListItem item={rowData} onRefresh={onRefresh} />
          </div>
        ))}
      </div>
    </div>
  )
})

const AILocalModelListItem: React.FC<AILocalModelListItemProps> = React.memo((props) => {
  const { item, onRefresh } = props
  const { t, i18nRefresh } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const [isReady, setIsReady] = useState<boolean>(item.IsReady || false)

  const [visible, setVisible] = useState<boolean>(false)
  const [downVisible, setDownVisible] = useState<boolean>(false)
  const [removeVisible, setRemoveVisible] = useState<boolean>(false)
  const [stopVisible, setStopVisible] = useState<boolean>(false)

  const [stopLoading, setStopLoading] = useState<boolean>(false)

  const tokenRef = useRef<string>(randomString(60))
  const downTokenRef = useRef<string>(randomString(60))

  useEffect(() => {
    const token = tokenRef.current
    return () => {
      grpcCancelStartLocalModel(token)
    }
  }, [])
  useUpdateEffect(() => {
    setIsReady(item.IsReady || false)
  }, [item.IsReady])
  const getModelReady = useMemoizedFn(() => {
    grpcIsLocalModelReady({
      ModelName: item.Name,
    }).then((response) => {
      setIsReady(response?.Ok || false)
    })
  })
  const onStart = useMemoizedFn((e) => {
    e.stopPropagation()
    const m = showYakitModal({
      title: (modalT) => modalT('AILocalModelListItem.startModel', { name: item.Name }),
      width: '50%',
      content: (
        <AIStartModelForm
          item={item}
          token={tokenRef.current}
          onSuccess={() => {
            onRefresh()
            m.destroy()
          }}
        />
      ),
      footer: null,
      onCancel: () => {
        onRefresh()
        m.destroy()
      },
    })
  })
  const onStop = useMemoizedFn((e) => {
    e.stopPropagation()
    setStopLoading(true)
    grpcStopLocalModel({ ModelName: item.Name })
      .then(() => {
        onRefresh()
        setStopVisible(false)
      })
      .finally(() =>
        setTimeout(() => {
          setStopLoading(false)
        }, 200),
      )
  })
  const onDown = useMemoizedFn((e) => {
    e.stopPropagation()
    const m = showYakitModal({
      title: (modalT) => modalT('AILocalModelListItem.downloadModel'),
      subTitle: item.Name,
      width: '50%',
      content: (
        <DownloadLlamaServerModelPrompt
          modelName={item.Name}
          onStart={() => {
            m.destroy()
            setDownVisible(true)
          }}
          token={downTokenRef.current}
        />
      ),
      footer: null,
    })
  })
  const menuSelect = useMemoizedFn((key: string) => {
    switch (key) {
      case 'edit':
        onEdit()
        break
      case 'delete':
        setRemoveVisible(true)
        break
      case 'path':
        if (item.Path) onOpenLocalFileByPath(item.Path)
        break
      default:
        break
    }
    setVisible(false)
  })
  const onEdit = useMemoizedFn(() => {
    const m = showYakitModal({
      title: (modalT) => modalT('AILocalModelListItem.editLocalModel'),
      width: '50%',
      content: (
        <AddAIModel
          defaultValues={{
            Name: item.Name,
            ModelType: item.Type,
            Path: item.Path || '',
            Description: item.Description || '',
          }}
          onCancel={() => {
            onRefresh()
            m.destroy()
          }}
        />
      ),
      footer: null,
    })
  })
  const installFinished = useMemoizedFn(() => {
    setDownVisible(false)
    getModelReady()
  })
  const installCancel = useMemoizedFn(() => {
    setDownVisible(false)
  })
  const onDelete = useMemoizedFn((deleteSourceFile) => {
    return grpcDeleteLocalModel({ Name: item.Name, DeleteSourceFile: deleteSourceFile }).then(() => {
      onRefresh()
      setRemoveVisible(false)
      emiter.emit('onRefreshAvailableAIModelList')
    })
  })
  const onCancelRemove = useMemoizedFn(() => {
    setRemoveVisible(false)
  })
  const typeNode = useCreation(() => {
    switch (item.Type) {
      case AILocalModelTypeEnum.AIChat:
        return (
          <YakitTag size="small" color="blue" className={styles['ai-local-model-type-tag']}>
            <ChatOutlined className={styles['type-icon']} color="currentColor" />
            AIChat
          </YakitTag>
        )
      case AILocalModelTypeEnum.Embedding:
        return (
          <YakitTag size="small" color="purple" className={styles['ai-local-model-type-tag']}>
            <ExclamationOutlined className={styles['type-icon']} color="currentColor" />
            Embedding
          </YakitTag>
        )
      case AILocalModelTypeEnum.SpeechToText:
        return (
          <YakitTag size="small" color="bluePurple" className={styles['ai-local-model-type-tag']}>
            <SpeechToTextOutlined className={styles['type-icon']} color="currentColor" />
            Speech-to-text
          </YakitTag>
        )
      default:
        return <></>
    }
  }, [item.Type])
  const isRunning = useCreation(() => {
    return item?.Status?.Status === 'running'
  }, [item?.Status?.Status])
  const localModelMenu: YakitMenuItemType[] = useCreation(() => {
    let menu: YakitMenuItemType[] = [
      {
        key: 'path',
        label: t('YakitButton.openFileLocation'),
        itemIcon: <ClipboardCopyOutlined color="currentColor" />,
      },
    ]
    const noEdit = ['starting', 'running', 'stopping'].includes(item.Status?.Status || '')
    if (item.IsLocal && !noEdit) {
      menu = menu.concat([
        {
          key: 'edit',
          label: t('YakitButton.edit'),
          itemIcon: <PencilAltOutlined color="currentColor" />,
        },
        {
          key: 'delete',
          label: t('YakitButton.delete'),
          type: 'danger',
          itemIcon: <TrashOutlined color="currentColor" />,
        },
      ])
    }
    return menu
  }, [item.IsLocal, item?.Status?.Status, i18nRefresh])
  const isShowEnable = useCreation(() => {
    return !isReady && !item.IsLocal
  }, [isReady, item.IsLocal])

  return (
    <div className={styles['ai-local-model-list-item']}>
      <div className={styles['ai-local-model-heard']}>
        <div className={styles['ai-local-model-heard-left']}>
          <OutlineAtomIconByStatus isReady={isShowEnable} isRunning={isRunning} />
          <div className={styles['ai-local-model-heard-left-name']}>{item.Name}</div>
          {typeNode}
        </div>

        <div className={styles['ai-local-model-heard-extra']}>
          {isShowEnable ? (
            <YakitButton type="text" onClick={onDown} icon={<CloudDownloadOutlined color="currentColor" />}>
              {t('YakitButton.download')}
            </YakitButton>
          ) : (
            <div
              className={classNames(styles['ai-local-model-heard-extra-btns'], {
                [styles['ai-local-model-heard-extra-btns-hover']]: visible || stopVisible,
              })}
            >
              {isRunning ? (
                <YakitPopconfirm
                  title={t('AILocalModelListItem.disableConfirm', { name: item.Name })}
                  onConfirm={onStop}
                  onCancel={() => setStopVisible(false)}
                  open={stopVisible}
                  onOpenChange={setStopVisible}
                  trigger={'click'}
                  okButtonProps={{ loading: stopLoading }}
                >
                  <YakitButton type="text" colors="danger" icon={<FigmaIcon28011794Outlined color="currentColor" />}>
                    {t('YakitButton.deactivated')}
                  </YakitButton>
                </YakitPopconfirm>
              ) : (
                <YakitButton type="text" onClick={onStart} icon={<PlayOutlined color="currentColor" />}>
                  {t('YakitButton.enable')}
                </YakitButton>
              )}
              <YakitDropdownMenu
                menu={{
                  data: localModelMenu,
                  onClick: (e) => {
                    e.domEvent.stopPropagation()
                    menuSelect(e.key)
                  },
                }}
                dropdown={{
                  trigger: ['click', 'contextMenu'],
                  placement: 'bottomLeft',
                  open: visible,
                  onOpenChange: setVisible,
                }}
              >
                <YakitButton
                  isActive={visible}
                  type="text2"
                  size="small"
                  icon={<DotsVerticalOutlined color="currentColor" />}
                  onClick={(e) => e.stopPropagation()}
                />
              </YakitDropdownMenu>
            </div>
          )}
        </div>
      </div>
      <div className={styles['ai-local-model-description']}>{item.Description}</div>
      {isRunning && (
        <div className={styles['ai-local-model-footer']}>
          <YakitTag size="small" className={styles['ai-local-model-type-tag']} color="green">
            {t('YakitButton.enabled')}
          </YakitTag>
          <div>
            {t('AILocalModelListItem.ipPort', { host: item?.Status?.Host || '', port: item?.Status?.Port || '' })}
          </div>
        </div>
      )}
      {downVisible && (
        <InstallLlamaServer
          grpcInterface="DownloadLocalModel"
          title={t('AILocalModelListItem.downloadingModel', { name: item.Name })}
          token={downTokenRef.current}
          onFinished={installFinished}
          onCancel={installCancel}
          getContainer={getMainOperatorPageBodyContainerOrBody()}
        />
      )}
      {removeVisible && (
        <AILocalModelListItemPromptHint
          title={t('AILocalModelListItem.deleteModel')}
          content={t('AILocalModelListItem.deleteModelConfirm', { name: item.Name })}
          onOk={onDelete}
          onCancel={onCancelRemove}
        />
      )}
    </div>
  )
})
export const OutlineAtomIconByStatus: React.FC<OutlineAtomIconByStatusProps> = React.memo((props) => {
  const { isReady, isRunning, iconClassName, size } = props
  return (
    <div
      className={classNames(
        styles['ai-local-model-icon'],
        {
          [styles['ai-local-model-icon-ready']]: isReady,
          [styles['ai-local-model-icon-running']]: isRunning,
          [styles['ai-local-model-icon-small']]: size === 'small',
        },
        iconClassName,
      )}
    >
      <AtomOutlined color="currentColor" />
    </div>
  )
})
export const AILocalModelListItemPromptHint: React.FC<AILocalModelListItemPromptHintProps> = React.memo((props) => {
  const { title, content, onOk, onCancel } = props
  const [checked, setChecked] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)

  const handleOK = useMemoizedFn(() => {
    setLoading(true)
    onOk(checked).finally(() => {
      setTimeout(() => {
        setLoading(false)
      }, 200)
    })
  })
  const handleCancel = useMemoizedFn(() => {
    onCancel()
  })

  return (
    <YakitHint
      visible={true}
      title={title}
      content={content}
      okButtonProps={{ loading }}
      onOk={handleOK}
      onCancel={handleCancel}
      footerExtra={
        <YakitCheckbox checked={checked} onChange={(e) => setChecked(e.target.checked)}>
          是否删除源文件
        </YakitCheckbox>
      }
    />
  )
})

export const AIModelFreeTag: React.FC<AIModelFreeTagProps> = React.memo((props) => {
  return <div className={styles['ai-model-free-tag']}>Free</div>
})
