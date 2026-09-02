import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Dropdown } from 'antd'
import { useMemoizedFn } from 'ahooks'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import styles from './HTTPFuzzerHotPatch.module.scss'
import { yakitNotify } from '@/utils/notification'
import {
  ChevronRightOutlined,
  CloudDownloadOutlined,
  CloudUploadOutlined,
  TrashOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import { YakitEditor } from '@/components/yakitUI/YakitEditor/YakitEditor'
import classNames from 'classnames'
import type { DbOperateMessage } from '../layout/mainOperatorContent/utils'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { useStore } from '@/store'
import { NetWorkApi } from '@/services/fetch'
import type { API } from '@/services/swagger/resposeType'
import type { PluginListPageMeta } from '../plugins/baseTemplateType'
import { isEnpriTrace } from '@/utils/envfile'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { YakitHint } from '@/components/yakitUI/YakitHint/YakitHint'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { formatTemplateTeams } from '../configManagement/utils'

const { ipcRenderer } = window.require('electron')

interface HotPatchTemplateRequest {
  Name: string[]
  Type: HotCodeType
}

export interface QueryHotPatchTemplateResponse {
  Message: DbOperateMessage
  Data: HotPatchTemplate[]
}

export interface HotPatchTempItem {
  name: string
  nameUi?: string
  temp: string
  isDefault: boolean
  Tags?: string
}

interface DeleteHotPatchTemplateRequest {
  Condition: HotPatchTemplateRequest
}

interface GetOnlineHotPatchTemplateRequest extends API.HotPatchTemplateRequest, PluginListPageMeta {}

export type HotCodeType = 'fuzzer' | 'mitm' | 'httpflow-analyze' | 'global'
interface HotCodeTemplateProps {
  type: HotCodeType
  hotPatchTempLocal: HotPatchTempItem[]
  onSetHotPatchTempLocal: (hotPatchTempLocal: HotPatchTempItem[]) => void
  onClickHotCode: (temp: string, tempName?: string) => void
  dropdown?: boolean
  triggerNode?: React.ReactNode
  refreshList?: boolean
  onDeleteLocalTempOk?: () => void
}
export const HotCodeTemplate: React.FC<HotCodeTemplateProps> = React.memo((props) => {
  const {
    type,
    hotPatchTempLocal,
    onSetHotPatchTempLocal,
    onClickHotCode,
    dropdown = true,
    triggerNode,
    refreshList,
    onDeleteLocalTempOk,
  } = props
  const { t, i18n } = useI18nNamespaces(['yakitUi', 'webFuzzer'])
  const [hotCodeTempVisible, setHotCodeTempVisible] = useState<boolean>(false)
  const [tab, setTab] = useState<'local' | 'online'>('local')
  const [viewCurHotCode, setViewCurrHotCode] = useState<string>('')
  const userInfo = useStore((s) => s.userInfo)
  const hotPatchTempLocalRef = useRef<HotPatchTempItem[]>(hotPatchTempLocal)
  const [hotPatchTempOnline, setHotPatchTempOnline] = useState<HotPatchTempItem[]>([])
  const [sameNameHint, setSameNameHint] = useState<boolean>(false)
  const sameNameHintInfoRef = useRef({ title: '', content: '', onOk: () => {}, onCancel: () => {} })

  useEffect(() => {
    hotPatchTempLocalRef.current = hotPatchTempLocal
  }, [hotPatchTempLocal])

  useEffect(() => {
    if (hotCodeTempVisible || dropdown === false) {
      if (tab === 'local') {
        ipcRenderer
          .invoke('QueryHotPatchTemplate', {
            Type: type,
          })
          .then((res: QueryHotPatchTemplateResponse) => {
            const defaultItems = hotPatchTempLocalRef.current.filter(({ isDefault }) => isDefault)
            const list: HotPatchTempItem[] = (res.Data || []).map((item) => {
              const def = defaultItems.find((d) => d.name === item.Name)
              return {
                name: item.Name,
                temp: item.Content || '',
                isDefault: !!def,
                Tags: item.Tags?.join(',') || '',
              }
            })
            defaultItems.forEach((def) => {
              if (list.some((item) => item.name === def.name)) return
              list.push({
                name: def.name,
                temp: def.temp,
                isDefault: true,
                Tags: '',
              })
            })
            onSetHotPatchTempLocal(list)
          })
          .catch((error) => {
            yakitNotify('error', error + '')
          })
      } else {
        NetWorkApi<GetOnlineHotPatchTemplateRequest, API.HotPatchTemplateResponse>({
          method: 'get',
          url: 'hot/patch/template',
          data: {
            page: 1,
            limit: 1000,
            type: type,
          },
        })
          .then((res) => {
            const d = res.data || []
            // 线上模板 isDefault都默认为true
            const list = d.map((item) => ({ name: item.name, temp: item.content, isDefault: true }))
            setHotPatchTempOnline(list)
          })
          .catch((err) => {
            yakitNotify('error', t('HotCodeTemplate.fetch_online_template_list_failed') + err)
          })
      }
    }
  }, [hotCodeTempVisible, tab, dropdown, refreshList])

  const onClickHotCodeName = (item: HotPatchTempItem, click?: boolean) => {
    if (item.isDefault) {
      if (click) {
        onClickHotCode(item.temp, item.name)
        setHotCodeTempVisible(false)
      }
      setViewCurrHotCode(item.temp)
    } else {
      if (tab === 'local') {
        const params: HotPatchTemplateRequest = {
          Type: type,
          Name: [item.name],
        }
        ipcRenderer
          .invoke('QueryHotPatchTemplate', params)
          .then((res: QueryHotPatchTemplateResponse) => {
            if (click) {
              onClickHotCode(res.Data[0].Content, item.name)
              setHotCodeTempVisible(false)
            }
            setViewCurrHotCode(res.Data[0].Content)
          })
          .catch((error) => {
            setViewCurrHotCode('')
            yakitNotify('error', error + '')
          })
      }
    }
  }

  const deleteHotPatchTemplate = (item: HotPatchTempItem) => {
    if (tab === 'local') {
      const params: DeleteHotPatchTemplateRequest = {
        Condition: {
          Type: type,
          Name: [item.name],
        },
      }
      ipcRenderer
        .invoke('DeleteHotPatchTemplate', params)
        .then((res: { Message: DbOperateMessage }) => {
          onSetHotPatchTempLocal(hotPatchTempLocal.filter((i) => i.name !== item.name))
          yakitNotify('success', t('YakitNotification.deleted'))
          onDeleteLocalTempOk && onDeleteLocalTempOk()
        })
        .catch((error) => {
          yakitNotify('error', error + '')
        })
    } else {
      NetWorkApi<API.HotPatchTemplateRequest, API.ActionSucceeded>({
        method: 'delete',
        url: 'hot/patch/template',
        data: {
          type: type,
          name: item.name,
        },
      })
        .then((res) => {
          if (res.ok) {
            setHotPatchTempOnline(hotPatchTempOnline.filter((i) => i.name !== item.name))
            yakitNotify('success', t('HotCodeTemplate.online_delete_success'))
          }
        })
        .catch((err) => {
          yakitNotify('error', t('HotCodeTemplate.online_delete_failed') + err)
        })
    }
  }

  const findHotPatchTemplate = (item: HotPatchTempItem, upload: boolean) => {
    return new Promise((resolve, reject) => {
      if (upload) {
        NetWorkApi<GetOnlineHotPatchTemplateRequest, API.HotPatchTemplateResponse>({
          method: 'get',
          url: 'hot/patch/template',
          data: {
            page: 1,
            limit: 1000,
            type: type,
            name: item.name,
          },
        })
          .then((res) => {
            const d = res.data || []
            if (d.length) {
              setHotCodeTempVisible(false)
              sameNameHintInfoRef.current = {
                title: t('HotCodeTemplate.overwrite_same_name_prompt'),
                content: t('HotCodeTemplate.online_same_name_template_prompt'),
                onOk: () => {
                  resolve(true)
                },
                onCancel: () => {
                  reject(t('HotCodeTemplate.online_template_exists_same_name'))
                },
              }
              setSameNameHint(true)
            } else {
              resolve(false)
            }
          })
          .catch((err) => {
            yakitNotify('error', t('HotCodeTemplate.check_hot_reload_template_online_failed') + err)
          })
      } else {
        const index = hotPatchTempLocal.findIndex((i) => i.name === item.name)
        if (index !== -1) {
          setHotCodeTempVisible(false)
          sameNameHintInfoRef.current = {
            title: t('HotCodeTemplate.overwrite_same_name_prompt'),
            content: t('HotCodeTemplate.local_same_name_template_prompt'),
            onOk: () => {
              resolve(true)
            },
            onCancel: () => {
              reject(t('HotCodeTemplate.local_template_exists_same_name'))
            },
          }
          setSameNameHint(true)
        } else {
          resolve(false)
        }
      }
    })
  }

  const uploadHotPatchTemplateToOnline = (item: HotPatchTempItem) => {
    findHotPatchTemplate(item, true)
      .then(() => {
        ipcRenderer
          .invoke('UploadHotPatchTemplateToOnline', {
            Type: type,
            Token: userInfo.token,
            Name: item.name,
          })
          .then((res) => {
            yakitNotify('success', t('YakitNotification.uploaded'))
          })
          .catch((error) => {
            yakitNotify('error', t('YakitNotification.uploadFailed', { error: error + '' }))
          })
      })
      .catch(() => {})
  }

  const downloadHotPatchTemplate = (item: HotPatchTempItem) => {
    findHotPatchTemplate(item, false)
      .then((r) => {
        ipcRenderer
          .invoke('DownloadHotPatchTemplate', {
            Type: type,
            Name: item.name,
          })
          .then((res) => {
            if (r) {
              // 手动删除本地数据，这里不需要删掉数据库里面的
              onSetHotPatchTempLocal(hotPatchTempLocal.filter((i) => i.name !== item.name))
            }
            yakitNotify('success', t('YakitNotification.downloaded'))
          })
          .catch((error) => {
            yakitNotify('error', t('YakitNotification.downloadFailed', { error: error + '' }))
          })
      })
      .catch(() => {})
  }

  // admin、审核员 支持（本地上传，线上删除）
  const hasPermissions = useMemo(() => {
    const flag = ['admin', 'auditor'].includes(userInfo.role || '')
    return flag
  }, [userInfo])

  const renderHotCodeItem = useMemoizedFn((item: HotPatchTempItem) => (
    <div className={styles['hotCode-item']} key={item.name}>
      <YakitPopover
        trigger="hover"
        placement="right"
        classNames={{ root: styles['hotCode-popover'] }}
        content={dropdown && <YakitEditor type={'yak'} value={viewCurHotCode} readOnly={true} />}
        onOpenChange={(v) => {
          if (v) {
            onClickHotCodeName(item)
          }
        }}
        zIndex={9999}
      >
        <YakitPopconfirm
          title={t('HotCodeTemplate.confirm_overwrite_hot_reload_code')}
          onConfirm={() => {
            onClickHotCodeName(item, true)
          }}
          placement="right"
          disabled={dropdown}
        >
          <div
            className={styles['hotCode-item-cont']}
            onClick={() => {
              if (dropdown) {
                onClickHotCodeName(item, true)
              }
            }}
          >
            <div
              className={classNames(styles['hotCode-item-name'], 'content-ellipsis')}
              title={t(item.nameUi || item.name)}
            >
              {t(item.nameUi || item.name)}
            </div>
            <div className={styles['extra-opt-btns']}>
              {tab === 'local' && !item.isDefault && hasPermissions && (
                <YakitButton
                  icon={<CloudUploadOutlined color="currentColor" />}
                  type="text2"
                  onClick={(e) => {
                    e.stopPropagation()
                    uploadHotPatchTemplateToOnline(item)
                  }}
                ></YakitButton>
              )}
              {tab === 'online' && (
                <YakitButton
                  icon={<CloudDownloadOutlined color="currentColor" />}
                  type="text2"
                  onClick={(e) => {
                    e.stopPropagation()
                    downloadHotPatchTemplate(item)
                  }}
                ></YakitButton>
              )}
              {(tab === 'local' && !item.isDefault) || (tab === 'online' && hasPermissions) ? (
                <YakitButton
                  icon={<TrashOutlined color="currentColor" />}
                  type="text"
                  colors="danger"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteHotPatchTemplate(item)
                  }}
                ></YakitButton>
              ) : null}
            </div>
            {item.isDefault && (
              <YakitTag color="info" size="small">
                {t('YakitButton.builtIn')}
              </YakitTag>
            )}
          </div>
        </YakitPopconfirm>
      </YakitPopover>
    </div>
  ))

  const overlayCont = useMemo(() => {
    const teams = formatTemplateTeams(tab === 'local' ? hotPatchTempLocal : hotPatchTempOnline)
    return (
      <div
        className={styles['hotCode-list']}
        style={{
          maxHeight: dropdown ? 380 : undefined,
          padding: dropdown ? '4px 6px' : undefined,
          height: dropdown ? undefined : '100%',
        }}
      >
        {isEnpriTrace() && (
          <YakitRadioButtons
            wrapClassName={styles['hotCode-tab-btns']}
            value={tab}
            buttonStyle="solid"
            options={[
              {
                value: 'local',
                label: t('HotCodeTemplate.local_template'),
              },
              {
                value: 'online',
                label: t('HotCodeTemplate.online_template'),
              },
            ]}
            onChange={(e) => {
              setTab(e.target.value)
            }}
          />
        )}
        {teams.length ? (
          teams.map((team) =>
            team.tags ? (
              <div className={styles['hotCode-group-item']} key={`${tab}-${team.tags}`}>
                <YakitPopover
                  trigger="hover"
                  placement="right"
                  classNames={{ root: styles['hotCode-group-submenu'] }}
                  content={
                    <div className={classNames(styles['hotCode-list'], styles['hotCode-group-submenu-list'])}>
                      {team.node.map((item) => renderHotCodeItem(item))}
                    </div>
                  }
                  zIndex={9998}
                >
                  <div className={styles['hotCode-group-item-cont']}>
                    <span
                      className={classNames(styles['hotCode-group-item-name'], 'content-ellipsis')}
                      title={team.tags}
                    >
                      {team.tags}
                    </span>
                    <ChevronRightOutlined className={styles['hotCode-group-item-arrow']} color="currentColor" />
                  </div>
                </YakitPopover>
              </div>
            ) : (
              renderHotCodeItem(team.node[0])
            ),
          )
        ) : (
          <YakitEmpty></YakitEmpty>
        )}
      </div>
    )
  }, [tab, hotPatchTempLocal, hotPatchTempOnline, renderHotCodeItem, viewCurHotCode, dropdown])

  return (
    <>
      {dropdown ? (
        <Dropdown
          overlayStyle={{ borderRadius: 4, width: 250, minWidth: 250 }}
          open={hotCodeTempVisible}
          onOpenChange={(v) => {
            setHotCodeTempVisible(v)
          }}
          trigger={['click']}
          popupRender={() => overlayCont}
        >
          {triggerNode || <YakitButton type="text">{t('HotCodeTemplate.code_template')}</YakitButton>}
        </Dropdown>
      ) : (
        <div style={{ width: 250 }}>{overlayCont}</div>
      )}
      <YakitHint
        visible={sameNameHint}
        title={sameNameHintInfoRef.current.title}
        content={sameNameHintInfoRef.current.content}
        onOk={() => {
          setSameNameHint(false)
          sameNameHintInfoRef.current.onOk()
        }}
        onCancel={() => {
          setSameNameHint(false)
          sameNameHintInfoRef.current.onCancel()
        }}
      />
    </>
  )
})

interface HotPatchTemplate {
  Name: string
  Content: string
  Type: string
  Tags?: string[]
}
interface AddHotCodeTemplateProps {
  title?: string
  type: HotCodeType
  hotPatchTempLocal: HotPatchTempItem[]
  hotPatchCode: string
  visible: boolean
  onSetAddHotCodeTemplateVisible: (visible: boolean) => void
  onSaveHotCodeOk?: (tempName?: string) => void
}
export const AddHotCodeTemplate: React.FC<AddHotCodeTemplateProps> = React.memo((props) => {
  const { title, type, hotPatchTempLocal, hotPatchCode, visible, onSetAddHotCodeTemplateVisible, onSaveHotCodeOk } =
    props
  const { t, i18n } = useI18nNamespaces(['yakitUi', 'webFuzzer'])
  const addHotPatchTempNameRef = useRef<string>('')

  const onCancel = useMemoizedFn(() => {
    addHotPatchTempNameRef.current = ''
    onSetAddHotCodeTemplateVisible(false)
  })

  const onOk = useMemoizedFn(() => {
    if (!addHotPatchTempNameRef.current) {
      yakitNotify('info', t('AddHotCodeTemplate.hot_reload_template_name_empty'))
      return
    }

    const index = hotPatchTempLocal.findIndex((item) => item.name === addHotPatchTempNameRef.current)
    if (index !== -1) {
      yakitNotify('info', t('AddHotCodeTemplate.hot_reload_template_name_exists'))
      return
    }

    const params: HotPatchTemplate = {
      Type: type,
      Content: hotPatchCode,
      Name: addHotPatchTempNameRef.current,
    }
    ipcRenderer
      .invoke('CreateHotPatchTemplate', params)
      .then((res) => {
        yakitNotify('success', t('YakitNotification.saved'))
        onSaveHotCodeOk && onSaveHotCodeOk(addHotPatchTempNameRef.current)
        onSetAddHotCodeTemplateVisible(false)
        addHotPatchTempNameRef.current = ''
      })
      .catch((error) => {
        yakitNotify('error', error + '')
      })
  })

  return (
    <YakitModal
      open={visible}
      title={title || t('AddHotCodeTemplate.save_hot_reload_template')}
      width={400}
      onCancel={onCancel}
      okText={t('YakitButton.save')}
      onOk={onOk}
      destroyOnHidden
      footer={null}
    >
      <div className={styles['hotCodeTemp-save']}>
        <YakitInput.TextArea
          placeholder={t('AddHotCodeTemplate.enter_hot_reload_template_name')}
          showCount
          maxLength={50}
          onChange={(e) => {
            addHotPatchTempNameRef.current = e.target.value
          }}
        />
        <div className={styles['btn-box']}>
          <YakitButton type="outline2" onClick={onCancel}>
            {t('YakitButton.cancel')}
          </YakitButton>
          <YakitButton type="primary" onClick={onOk}>
            {t('YakitButton.save')}
          </YakitButton>
        </div>
      </div>
    </YakitModal>
  )
})
