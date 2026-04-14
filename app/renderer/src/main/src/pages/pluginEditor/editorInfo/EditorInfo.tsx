import React, { ForwardedRef, forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { useDebounceEffect, useMemoizedFn, usePrevious, useUpdateEffect } from 'ahooks'
import { OutlineCloseIcon, OutlineIdentificationIcon, OutlineTagIcon } from '@/assets/icon/outline'
import { Form, Tooltip } from 'antd'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { YakitSelectProps } from '@/components/yakitUI/YakitSelect/YakitSelectType'
import { DefaultTypeList } from '@/pages/plugins/builtInData'
import cloneDeep from 'lodash/cloneDeep'
import {
  CodecTypePluginSwitchs,
  PluginEditorBuiltInTags,
  PluginSwitchTagToContent,
  YakTypePluginSwitchs,
} from '../defaultconstants'
import { YakitPluginBaseInfo } from '../base'
import { yakitNotify } from '@/utils/notification'
import { YakitHint } from '@/components/yakitUI/YakitHint/YakitHint'
import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { getTempExampleList, TempExampleHelp, TempExampleInfo } from './TempExampleHelp'
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import { Qadocument, qaDocumentLableList } from './Qadocument'

import classNames from 'classnames'
import '../../plugins/plugins.scss'
import styles from './EditorInfo.module.scss'
import { AIPluginComponent } from './AIPluginComponent'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
export interface EditorInfoFormRefProps {
  onSubmit: () => Promise<YakitPluginBaseInfo | undefined>
  setNameForm: (name: string) => void
  setHelpForm: (help: string) => void
}
export interface EditorBaseInfoProps {
  ref?: ForwardedRef<EditorInfoFormRefProps>
  isEdit?: boolean
  /** 初始默认数据 */
  data?: YakitPluginBaseInfo
  /** 初始插件类型 */
  initType?: string
  setType: (type: string) => void
  setName: (name: string) => void
  getCodeContent: () => string | undefined
}

interface EditorInfoProps extends EditorBaseInfoProps {
  expand: boolean
  onExpand: (val: boolean) => void
}
export const EditorInfo: React.FC<EditorInfoProps> = memo(
  forwardRef((props, ref) => {
    const { expand, onExpand, ...rest } = props
    const {t} = useI18nNamespaces(["plugin"])

    const [visible, setVisible] = useState<boolean>(false)
    const handleFold = useMemoizedFn(() => {
      if (!expand) return
      setVisible(false)
      onExpand(false)
    })

    useImperativeHandle(
      ref,
      () => ({
        onSubmit: handleSubmit,
        setNameForm: updateName,
        setHelpForm: updateHelp,
      }),
      [],
    )

    const formRef = useRef<EditorInfoFormRefProps>(null)
    // 表单提交
    const handleSubmit: () => Promise<YakitPluginBaseInfo | undefined> = useMemoizedFn(() => {
      return new Promise(async (resolve, reject) => {
        if (!formRef || !formRef.current) {
          yakitNotify('error', t("EditorInfo.functionError"))
          resolve(undefined)
        }
        try {
          const info = await formRef.current?.onSubmit()
          resolve(info)
        } catch (error) {
          resolve(undefined)
        }
      })
    })

    // 更新Name
    const updateName = useMemoizedFn((name: string) => {
      if (!formRef || !formRef.current) return
      formRef.current.setNameForm(name)
    })
    // 更新Help
    const updateHelp = useMemoizedFn((help: string) => {
      if (!formRef || !formRef.current) return
      formRef.current.setHelpForm(help)
    })

    return (
      <div
        className={classNames(styles['editor-info'], {
          [styles['editor-info-show']]: expand,
          [styles['editor-info-hidden']]: !expand,
        })}
      >
        <div className={styles['editor-info-header']}>
          {t("EditorInfo.basicInfo")}
          <Tooltip
            title={t("EditorInfo.collapseBasicInfo")}
            overlayClassName="plugins-tooltip"
            visible={visible}
            onVisibleChange={(show) => setVisible(show)}
          >
            <div className={styles['expand-btn']} onClick={handleFold}>
              <OutlineCloseIcon />
            </div>
          </Tooltip>
        </div>

        <div className={styles['editor-info-body']}>
          <EditorInfoForm ref={formRef} {...rest} />
        </div>
      </div>
    )
  }),
)

interface EditorInfoFormProps extends EditorBaseInfoProps {}
/** @name 插件基础信息表单 */
export const EditorInfoForm: React.FC<EditorInfoFormProps> = memo(
  forwardRef((props, ref) => {
    const { isEdit, data, initType, setType, setName, getCodeContent } = props
    const {t} = useI18nNamespaces(["plugin", "yakitUi"])

    const [form] = Form.useForm()
    useImperativeHandle(
      ref,
      () => ({
        onSubmit: handleFormSubmit,
        setNameForm: (name: string) => form.setFieldsValue({ ScriptName: name }),
        setHelpForm: (help: string) => form.setFieldsValue({ Help: help }),
      }),
      [form],
    )

    useEffect(() => {
      if (data) {
        if (!form) return
        form.resetFields()
        const filterTag = YakTypePluginSwitchs.concat(CodecTypePluginSwitchs)
        const newTags = data.Tags.map((item, index, self) => {
          if (filterTag.includes(item)) return { key: item, label: PluginSwitchTagToContent[item] }
          return item
        })
        form.setFieldsValue({ ...data, Tags: [...newTags] })
        setEnablePluginSelector(data.EnablePluginSelector || false)
      } else {
        form.setFieldsValue({ Type: initType || '' })
      }
    }, [data])

    /** ---------- 表单相关方法 Start ---------- */
    // 判断值为 string 还是 {key, label}，专用于 tags
    const toTagKey = useMemoizedFn((tags: any[]) => {
      return tags.map((item) => {
        if (typeof item === 'string') return item
        return item.key as string
      })
    })
    // 获取表单数据
    const handleGetData = useMemoizedFn(() => {
      if (!form) return undefined
      const data = form.getFieldsValue()
      const info: YakitPluginBaseInfo = {
        Type: data.Type || '',
        ScriptName: (data.ScriptName || '').trim(),
        Help: (data.Help || '').trim() || undefined,
        Tags: toTagKey(data.Tags || []),
        EnablePluginSelector: EnablePluginSelector,
        PluginSelectorTypes: data.PluginSelectorTypes || (EnablePluginSelector ? [] : undefined),
        YakitPluginAIBaseInfo: data.YakitPluginAIBaseInfo,
      }
      if (!info.Type || !info.ScriptName) return undefined

      return info
    })
    // 表单提交
    const handleFormSubmit: () => Promise<YakitPluginBaseInfo | undefined> = useMemoizedFn(() => {
      return new Promise((resolve, reject) => {
        if (!form) return resolve(undefined)
        form
          .validateFields()
          .then(() => {
            resolve(handleGetData())
          })
          .catch(() => {
            resolve(undefined)
          })
      })
    })
    // 更新 form 里的数据
    const updateFormData = useMemoizedFn((value: Record<string, any>) => {
      if (form) {
        form.setFieldsValue({ ...form.getFieldsValue(), ...cloneDeep(value) })
      }
    })
    /** ---------- 表单相关方法  End ---------- */

    /** ---------- 插件类型变化时的数据更新 Start ---------- */
    const type = Form.useWatch('Type', form)
    const [typeSwitchPopShow, setTypeSwitchPopShow] = useState<boolean>(false)
    const tempType = useRef<string>('')
    const previousType = usePrevious(type)

    // 类型影响 tags 的部分数据更新
    useUpdateEffect(() => {
      if (type === 'yak') {
        const newTags = (handleGetData()?.Tags || []).filter(
          (item) => !handleTypeFilterTag(item, CodecTypePluginSwitchs),
        )
        updateFormData({ Tags: cloneDeep(newTags) })
      } else if (type === 'codec') {
        const newTags = (handleGetData()?.Tags || []).filter((item) => !handleTypeFilterTag(item, YakTypePluginSwitchs))
        setEnablePluginSelector(false)
        updateFormData({ Tags: cloneDeep(newTags), PluginSelectorTypes: [] })
      } else {
        const filterTags = YakTypePluginSwitchs.concat(CodecTypePluginSwitchs)
        const newTags = (handleGetData()?.Tags || []).filter((item) => !handleTypeFilterTag(item, filterTags))
        setEnablePluginSelector(false)
        updateFormData({ Tags: cloneDeep(newTags), PluginSelectorTypes: [] })
      }
    }, [type])
    /** ---------- 插件类型变化时的数据更新 End ---------- */

    /** ---------- 插件名字变化的数据更新 Start ---------- */
    const name = Form.useWatch('ScriptName', form)
    useDebounceEffect(
      () => {
        setName(name)
      },
      [name],
      { wait: 300 },
    )
    /** ---------- 插件名字变化的数据更新 Start ---------- */

    /** ---------- 插件 tags 变化的数据更新 Start ---------- */
    const tags = Form.useWatch('Tags', form) || []
    // 过滤开关 tag 的方法(传入过滤项)
    const handleFilterTag = useMemoizedFn((tag, compareTag) => {
      if (typeof tag === 'string') return tag === compareTag
      try {
        return tag.key === compareTag
      } catch (error) {
        return false
      }
    })
    // 过滤开关 tag 的方法(传入过滤数组)
    const handleTypeFilterTag = useMemoizedFn((tag, filterTags) => {
      if (typeof tag === 'string') return filterTags.includes(tag)
      try {
        return filterTags.includes(tag.key)
      } catch (error) {
        return false
      }
    })
    /** ---------- 插件 tags 变化的数据更新 End ---------- */

    /** ----------  插件配置逻辑 Start ---------- */
    const [EnablePluginSelector, setEnablePluginSelector] = useState<boolean>(false)
    // 插件联动开关更新数据
    const handleEnablePluginSelector = useMemoizedFn((check) => {
      if (!check) {
        updateFormData({ PluginSelectorTypes: [] })
      }
      setEnablePluginSelector(check)
    })

    // 配置开关影响 tags 变化的数据更新
    const handleSwitchToTags = useMemoizedFn((check: boolean, value: string) => {
      try {
        if (check) {
          updateFormData({ Tags: [...tags, { key: value, label: PluginSwitchTagToContent[value] || value }] })
        } else {
          updateFormData({
            Tags: tags.filter((item) => {
              return !handleFilterTag(item, value)
            }),
          })
        }
      } catch (error) {}
    })
    /** ---------- 插件配置逻辑 End ---------- */

    /** ---------- 案例文档 Start ---------- */
    const [documentType, setDocumentType] = useState<number>(1)
    const [searchTempExampleVal, setSearchTempExampleVal] = useState<string>('')
    const renderTempExampleList = useMemo(() => {
      return searchTempExampleVal
        ? getTempExampleList(t).filter((v) => v.label.toLocaleLowerCase().includes(searchTempExampleVal.toLocaleLowerCase()))
        : getTempExampleList(t)
    }, [searchTempExampleVal, getTempExampleList])
    const onOpenHelpModal = (tempExampleItem: TempExampleInfo) => {
      const m = showYakitModal({
        title: t("EditorInfo.templateExamples"),
        type: 'white',
        width: '60vw',
        centered: true,
        cancelButtonProps: { style: { display: 'none' } },
        onOkText: t("YakitButton.iKnow"),
        onOk: () => m.destroy(),
        bodyStyle: { padding: '8px 24px' },
        content: <TempExampleHelp tempExampleItem={tempExampleItem} />,
      })
    }

    const [searchQaDocumentVal, setSearchQaDocumentVal] = useState<string>('')
    const renderQaDocumentList = useMemo(() => {
      return searchQaDocumentVal
        ? qaDocumentLableList.filter((label) =>
            label.toLocaleLowerCase().includes(searchQaDocumentVal.toLocaleLowerCase()),
          )
        : qaDocumentLableList
    }, [searchQaDocumentVal, qaDocumentLableList])
    const onOpenQaDocModal = (label: string) => {
      const m = showYakitModal({
        title: t("EditorInfo.faq"),
        type: 'white',
        width: '60vw',
        centered: true,
        cancelButtonProps: { style: { display: 'none' } },
        onOkText: t("YakitButton.iKnow"),
        onOk: () => m.destroy(),
        bodyStyle: { padding: '8px 24px' },
        content: <Qadocument label={label} />,
      })
    }
    /** ---------- 案例文档 End ---------- */

    return (
      <div className={styles['editor-info-form']}>
        <Form className={styles['editor-info-form-global']} form={form} layout="vertical">
          <Form.Item
            label={
              <>
                {t("EditorInfo.scriptType")}<span className="form-item-required">*</span>:
              </>
            }
            name="Type"
            rules={[{ required: true, message: t("EditorInfo.scriptTypeRequired") }]}
          >
            <PluginTypeSelect
              size="large"
              disabled={!!isEdit}
              onChange={(value) => {
                tempType.current = value
                setTypeSwitchPopShow(true)
              }}
            />
          </Form.Item>

          <Form.Item
            label={
              <>
                {t("EditorInfo.pluginName")}<span className="form-item-required">*</span>:
              </>
            }
            name="ScriptName"
            required={true}
            rules={[
              {
                validator: async (_, value) => {
                  if (!value || !value.trim()) return Promise.reject(new Error(t("EditorInfo.pluginNameRequired")))
                  if (value.trim().length > 100) return Promise.reject(new Error(t("EditorInfo.nameMaxLength")))
                },
              },
            ]}
          >
            <YakitInput
              wrapperClassName={styles['item-input']}
              placeholder={t("YakitInput.please_enter")}
              size="large"
              prefix={<OutlineIdentificationIcon />}
              maxLength={100}
            />
          </Form.Item>

          <Form.Item label={t("EditorInfo.descriptionLabel")} name="Help">
            <YakitInput.TextArea rows={2} placeholder={t("YakitInput.please_enter")} />
          </Form.Item>

          <Form.Item
            label={
              <>
                Tags<span className="form-item-required">*</span>:
              </>
            }
          >
            <Form.Item noStyle name="Tags" rules={[{ required: true, message: t("EditorInfo.tagsRequired") }]}>
              <YakitSelect wrapperClassName={styles['item-select']} mode="tags" allowClear size="large">
                {PluginEditorBuiltInTags.map((item) => {
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

          <div
            className={classNames(styles['item-setting'], {
              // [styles["hidden"]]: !["yak", "codec"].includes(type)
            })}
          >
            <div className={styles['item-setting-header']}>{t("EditorInfo.pluginConfig")}</div>

            <div className={styles['item-switch-group']}>
              {/* yak 插件专用 ↓↓↓ */}
              {type === 'yak' && (
                <>
                  <div className={styles['switch-wrapper']}>
                    <YakitSwitch checked={EnablePluginSelector} onChange={handleEnablePluginSelector} />
                    {t("EditorInfo.enablePluginSelectorUI")}
                  </div>
                  {EnablePluginSelector && (
                    <Form.Item
                      name="PluginSelectorTypes"
                      label={
                        <>
                          {t("EditorInfo.linkedPluginType")}<span className="form-item-required">*</span>:
                        </>
                      }
                      required={true}
                      rules={[{ required: true, message: t("EditorInfo.linkedPluginTypeRequired") }]}
                      style={{ width: '100%', marginBottom: 0 }}
                    >
                      <YakitSelect
                        wrapperClassName={styles['linkage-plugin-type-select']}
                        mode="tags"
                        allowClear
                        size="large"
                      >
                        <YakitSelect.Option value="mitm">MITM</YakitSelect.Option>
                        <YakitSelect.Option value="port-scan">端口扫描</YakitSelect.Option>
                      </YakitSelect>
                    </Form.Item>
                  )}

                  {YakTypePluginSwitchs.map((item) => {
                    const check = tags.findIndex((tag) => {
                      return handleFilterTag(tag, item)
                    })
                    return (
                      <div key={item} className={styles['switch-wrapper']}>
                        <YakitSwitch
                          checked={check !== -1}
                          onChange={(check) => {
                            handleSwitchToTags(check, item)
                          }}
                        />
                        {PluginSwitchTagToContent[item] || t("EditorInfo.invalidItem")}
                      </div>
                    )
                  })}
                </>
              )}
              {/* codec 插件专用 ↓↓↓ */}
              {type === 'codec' && (
                <>
                  {CodecTypePluginSwitchs.map((item) => {
                    const check = tags.findIndex((tag) => {
                      return handleFilterTag(tag, item)
                    })
                    return (
                      <div key={item} className={styles['switch-wrapper']}>
                        <YakitSwitch
                          checked={check !== -1}
                          onChange={(check) => {
                            handleSwitchToTags(check, item)
                          }}
                        />
                        {PluginSwitchTagToContent[item] || t("EditorInfo.invalidItem")}
                      </div>
                    )
                  })}
                </>
              )}

              <Form.Item name="YakitPluginAIBaseInfo" noStyle>
                <AIPluginComponent getCodeContent={getCodeContent} />
              </Form.Item>
            </div>
          </div>
        </Form>

        {/* 案例文档 */}
        <div className={styles['temp-example-wrapper']}>
          <div className={styles['temp-example-title-wrapper']}>
            <YakitRadioButtons
              size="small"
              value={documentType}
              onChange={(e) => {
                setDocumentType(e.target.value)
              }}
              buttonStyle="solid"
              options={[
                {
                  value: 1,
                  label: t("EditorInfo.templateExamples"),
                },
                {
                  value: 2,
                  label: t("EditorInfo.faq"),
                },
              ]}
            />
          </div>
          {documentType === 1 ? (
            <>
              <div className={styles['temp-example-search-wrapper']}>
                <YakitInput.Search onSearch={(value) => setSearchTempExampleVal(value)} allowClear />
              </div>
              <div className={styles['temp-example-list-wrapper']}>
                {renderTempExampleList.length ? (
                  <>
                    {renderTempExampleList.map((item) => (
                      <div
                        className={styles['temp-example-list-item']}
                        key={item.label}
                        onClick={() => onOpenHelpModal(item)}
                      >
                        <div className={styles['temp-example-item-left-wrapper']}>
                          <div className={styles['temp-example-item-label']} title={item.label}>
                            {item.label}
                          </div>
                        </div>
                        <div className={styles['temp-example-item-desc']}>{item.desc}</div>
                      </div>
                    ))}
                  </>
                ) : (
                  <YakitEmpty></YakitEmpty>
                )}
              </div>
            </>
          ) : (
            <>
              <div className={styles['temp-example-search-wrapper']}>
                <YakitInput.Search onSearch={(value) => setSearchQaDocumentVal(value)} allowClear />
              </div>
              <div className={styles['document-list-wrapper']}>
                {renderQaDocumentList.length ? (
                  <>
                    {renderQaDocumentList.map((label) => (
                      <div className={styles['document-list-item']} key={label} onClick={() => onOpenQaDocModal(label)}>
                        <div className={styles['document-item-left-wrapper']}>
                          <div className={styles['document-item-label']} title={label}>
                            {label}
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <YakitEmpty></YakitEmpty>
                )}
              </div>
            </>
          )}
        </div>
        <YakitHint
          visible={typeSwitchPopShow}
          title={t("EditorInfo.switchScriptType")}
          content={t("EditorInfo.switchScriptTypeContent")}
          onOk={() => {
            setType(tempType.current)
            setTypeSwitchPopShow(false)
          }}
          onCancel={() => {
            form.setFieldsValue({ Type: previousType })
            setTypeSwitchPopShow(false)
          }}
        />
      </div>
    )
  }),
)

/** @name 插件类型下拉框组件 */
export const PluginTypeSelect: React.FC<YakitSelectProps> = memo((props) => {
  const { dropdownClassName, wrapperClassName, ...rest } = props

  return (
    <YakitSelect
      {...rest}
      wrapperClassName={classNames(styles['plugin-type-select'], wrapperClassName)}
      dropdownClassName={classNames(styles['plugin-type-select-dropdown'], dropdownClassName)}
    >
      {DefaultTypeList.map((item, index) => {
        return (
          <YakitSelect.Option key={item.key} disabled={item.key === 'lua'}>
            <div key={item.key} className={styles['plugin-type-select-option']}>
              <div className={styles['header-icon']}>{item.icon}</div>
              <div className={styles['type-content']}>
                <div
                  className={classNames(styles['name-style'], {
                    [styles['disable-color']]: item.key === 'lua',
                  })}
                >
                  {item.name}
                </div>
                <div
                  className={classNames(styles['description-style'], {
                    [styles['disable-color']]: item.key === 'lua',
                  })}
                >
                  {item.description}
                </div>
              </div>
            </div>
          </YakitSelect.Option>
        )
      })}
    </YakitSelect>
  )
})
