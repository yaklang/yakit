import React, {useEffect, useMemo, useRef, useState, memo} from "react"
import { SequenceItemProps } from "./FuzzerSequenceType"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    useCreation,
    useHover,
    useMemoizedFn,
} from "ahooks"
import {
    OutlineArrowcirclerightIcon,
    OutlineCogIcon,
    OutlineInformationcircleIcon,
    OutlineTrashIcon,
} from "@/assets/icon/outline"
import {Divider, Form, Tooltip} from "antd"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import classNames from "classnames"
import { YakitSwitch } from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import { yakitNotify } from "@/utils/notification"
import {AdvancedConfigValueProps} from "../HttpQueryAdvancedConfig/HttpQueryAdvancedConfigType"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import emiter from "@/utils/eventBus/eventBus"
import { DefFuzzerConcurrent } from "@/defaultConstants/HTTPFuzzerPage"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import { YakitDrawer } from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import { YakitInputNumber } from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import styles from "./FuzzerSequence.module.scss"
import { YakitPopover } from "@/components/yakitUI/YakitPopover/YakitPopover"
import { InformationCircleIcon } from "@/assets/newIcon"

export type ConcurrencyAdvancedConfigValue = Pick<
    AdvancedConfigValueProps,
    'concurrent' | 'minDelaySeconds' | 'maxDelaySeconds' | 'repeatTimes' | 'disableUseConnPool' | 'matchers' | 'extractors'
> & {
    disableAdvancedSet?: boolean
}

interface AdvancedSetProps  {
    visible: boolean
    advancedConfigValue: ConcurrencyAdvancedConfigValue
    onSave: (values: ConcurrencyAdvancedConfigValue) => void
    onCancel: () => void
}

const initSetValue: ConcurrencyAdvancedConfigValue = {
    concurrent: DefFuzzerConcurrent,
    minDelaySeconds: 0,
    maxDelaySeconds: 0,
    repeatTimes: 0,
    disableUseConnPool: false,
    matchers: [],
    extractors: [],
    disableAdvancedSet: false
}


const AdvancedSet: React.FC<AdvancedSetProps> = memo((props) => {
    const { onCancel, onSave, visible, advancedConfigValue } = props
    const [form] = Form.useForm()
    const {t, i18n} = useI18nNamespaces(["yakitUi", "history","webFuzzer"])

    useEffect(()=>{
        visible && form.setFieldsValue({
            ...advancedConfigValue
        })
    },[visible])

    const handleOk = useMemoizedFn(() => {
        form.validateFields().then((values)=>{
            onSave(values)
            onCancel()
        })
    })

    const onReset = useMemoizedFn(() => {
        form.setFieldsValue(initSetValue)
    })

    return (
        <YakitDrawer
            visible={visible}
            width='25%'
            className={styles["history-advanced-set-wrapper"]}
            onClose={onCancel}
            title={
                <div className={styles["advanced-configuration-drawer-title"]}>
                    <div className={styles["advanced-configuration-drawer-title-text"]}>
                        {t("AdvancedSet.advancedConfig")}
                        <Tooltip
                            title={t("AdvancedSet.advancedConfigToolTips")}
                            placement='bottom'
                        >
                            <OutlineInformationcircleIcon />
                        </Tooltip>
                    </div>
                    <div className={styles["advanced-configuration-drawer-title-btns"]}>
                        <YakitButton type='outline2' onClick={onCancel}>
                            {t("YakitButton.cancel")}
                        </YakitButton>
                        <YakitButton type='primary' onClick={handleOk}>
                            {t("YakitButton.save")}
                        </YakitButton>
                    </div>
                </div>
            }
            maskClosable={false}
        >
                <Form
                    form={form}
                    colon={false}
                    size='small'
                    labelCol={{span: 8}}
                    wrapperCol={{span: 14}}
                    initialValues={{
                        ...advancedConfigValue
                    }}
                >
                    <Form.Item
                        label={t("HttpQueryAdvancedConfig.disable_connection_pool")}
                        className={styles['form-item-with-reset-button']}
                    >
                        <Form.Item
                            name={"disableUseConnPool"}
                            valuePropName='checked'
                        >
                            <YakitSwitch />
                        </Form.Item>
                        <YakitButton
                            type='text'
                            colors='danger'
                            onClick={onReset}
                            size='small'
                        >
                            {t("YakitButton.reset")}
                        </YakitButton>
                    </Form.Item>
                    <Form.Item
                        label={t("HttpQueryAdvancedConfig.repeat_send")}
                        name='repeatTimes'
                        help={t("HttpQueryAdvancedConfig.concurrency_test_tip")}
                    >
                        <YakitInputNumber type='horizontal' size='small' min={0} />
                    </Form.Item>
                    <Form.Item label={t("HttpQueryAdvancedConfig.concurrent_threads")} name='concurrent'>
                        <YakitInputNumber type='horizontal' size='small' min={1} />
                    </Form.Item>

                    <Form.Item label={t("HttpQueryAdvancedConfig.random_delay2")} style={{marginBottom: 0}}>
                        <div className={styles["advanced-configuration-drawer-delay"]}>
                            <Form.Item
                                name='minDelaySeconds'
                                noStyle
                                normalize={(value) => {
                                    return value.replace(/\D/g, "")
                                }}
                            >
                                <YakitInput
                                    allowClear={false}
                                    prefix='Min'
                                    suffix='s'
                                    size='small'
                                    className={styles["input-left"]}
                                />
                            </Form.Item>
                            <Form.Item
                                name='maxDelaySeconds'
                                noStyle
                                normalize={(value) => {
                                    return value.replace(/\D/g, "")
                                }}
                            >
                                <YakitInput
                                    allowClear={false}
                                    prefix='Max'
                                    suffix='s'
                                    size='small'
                                    className={styles["input-right"]}
                                />
                            </Form.Item>
                        </div>
                    </Form.Item>
                </Form>
        </YakitDrawer>
    )
})

interface AdvancedSetV2Props {
    visible: boolean
    advancedConfigValue: ConcurrencyAdvancedConfigValue
    onCancel: () => void
    children: React.ReactNode
    onSave: (values: ConcurrencyAdvancedConfigValue) => void
}

const AdvancedSetV2: React.FC<AdvancedSetV2Props> = memo((props) => {
    const {onCancel, visible, advancedConfigValue, children, onSave} = props
    const [form] = Form.useForm()
    const {t, i18n} = useI18nNamespaces(["yakitUi", "history", "webFuzzer"])

    useEffect(() => {
        visible &&
            form.setFieldsValue({
                ...advancedConfigValue
            })
    }, [visible])

    return (
        <YakitPopover
            title={t("AdvancedSet.advancedConfig")}
            onVisibleChange={(visible) => !visible && onCancel()}
            trigger='click'
            overlayInnerStyle={{width: 350}}
            overlayClassName={styles["history-advanced-set-wrapper"]}
            visible={visible}
            placement='right'
            content={
                <>
                    <Form
                        form={form}
                        colon={false}
                        size='small'
                        labelCol={{span: 8}}
                        wrapperCol={{span: 14}}
                        initialValues={{
                            ...advancedConfigValue
                        }}
                        onValuesChange={(values) => onSave({...advancedConfigValue, ...values})}
                    >
                        <Form.Item
                            label={t("HttpQueryAdvancedConfig.disable_connection_pool")}
                            className={styles["form-item-with-reset-button"]}
                            valuePropName='checked'
                            name={"disableUseConnPool"}
                        >
                            <YakitSwitch />
                        </Form.Item>
                        <Form.Item
                            label={t("HttpQueryAdvancedConfig.repeat_send")}
                            name='repeatTimes'
                            help={t("HttpQueryAdvancedConfig.concurrency_test_tip")}
                        >
                            <YakitInputNumber type='horizontal' size='small' min={0} />
                        </Form.Item>
                        <Form.Item label={t("HttpQueryAdvancedConfig.concurrent_threads")} name='concurrent'>
                            <YakitInputNumber type='horizontal' size='small' min={1} />
                        </Form.Item>

                        <Form.Item label={t("HttpQueryAdvancedConfig.random_delay2")}>
                            <div className={styles["advanced-configuration-drawer-delay"]}>
                                <Form.Item
                                    name='minDelaySeconds'
                                    noStyle
                                    normalize={(value) => {
                                        return value.replace(/\D/g, "")
                                    }}
                                >
                                    <YakitInput
                                        allowClear={false}
                                        prefix='Min'
                                        suffix='s'
                                        size='small'
                                        className={styles["input-left"]}
                                    />
                                </Form.Item>
                                <Form.Item
                                    name='maxDelaySeconds'
                                    noStyle
                                    normalize={(value) => {
                                        return value.replace(/\D/g, "")
                                    }}
                                >
                                    <YakitInput
                                        allowClear={false}
                                        prefix='Max'
                                        suffix='s'
                                        size='small'
                                        className={styles["input-right"]}
                                    />
                                </Form.Item>
                            </div>
                        </Form.Item>
                        <Form.Item
                            label={
                                    <span className={styles["advanced-config-form-label"]}>
                                        {t("HttpQueryAdvancedConfig.disable_Advanced_set")}
                                        <Tooltip
                                            title={t("HttpQueryAdvancedConfig.disable_Advanced_set_tip")}
                                        >
                                            <InformationCircleIcon className={styles["info-icon"]} />
                                        </Tooltip>
                                    </span>    
                                }
                            className={styles["form-item-with-reset-button"]}
                            name={"disableAdvancedSet"}
                            valuePropName='checked'
                            style={{marginBottom: 0}}
                        >
                            <YakitSwitch />
                        </Form.Item>
                    </Form>
                </>
            }
        >
            {children}
        </YakitPopover>
    )
})


const ConcurrencyItem: React.FC<SequenceItemProps> = memo((props) => {
    const {
        item,
        pageNodeList,
        index,
        isDragging,
        disabled,
        errorIndex,
        isSelect,
        onUpdateItemPage,
        onRemove,
        onSelect,
        onShowSetting,
        isShowSetting,
        selectedList
    } = props
    const {t, i18n} = useI18nNamespaces(["webFuzzer"])
    const [selectVisible, setSelectVisible] = useState<boolean>(false)
    const selectRef = useRef(null)
    const isHovering = useHover(selectRef)

    const options = useCreation(() => {
        return pageNodeList.map((ele) => ({
            value: ele.pageId,
            label: ele.pageName
        }))
    }, [pageNodeList])

    const onSelectSubMenuById = useMemoizedFn((pageId: string) => {
        emiter.emit("switchSubMenuItem", JSON.stringify({pageId}))
    })


    const isActive = useMemo(() => !!isShowSetting && !!isSelect, [isShowSetting, isSelect])
    
    const selectValue = useMemo(
        () => ({
            value: item.pageId,
            label: item.pageName
        }),
        [item.pageId, item.pageName]
    )
    return (
        <>
            <div
                className={styles["fuzzer-sequence-list-item-body"]}
                onClick={() => {
                    if (disabled) return
                    onSelect(item)
                }}
            >
                <div
                    className={classNames(styles["fuzzer-sequence-list-item"], {
                        [styles["fuzzer-sequence-list-item-hover-none"]]: disabled || isHovering,
                        [styles["fuzzer-sequence-list-item-disabled"]]: disabled,
                        [styles["fuzzer-sequence-list-item-isSelect"]]: isSelect,
                        [styles["fuzzer-sequence-list-item-errorIndex"]]: errorIndex === index
                    })}
                    style={{ flexDirection: 'row'}}
                >
                        <div
                            style={{ flex: 1, marginRight: 24 }}
                            ref={selectRef}
                            onClick={(e) => {
                                e.stopPropagation()
                            }}
                        >
                        <YakitSelect
                            value={selectValue}
                            labelInValue
                            onChange={(v) => onUpdateItemPage({...item, pageId: v.value, pageName: v.label})}
                            getPopupContainer={(dom) => dom}
                            disabled={disabled}
                            onDropdownVisibleChange={(v) => setSelectVisible(v)}
                            open={selectVisible && !isDragging}
                            options={options}
                        />
                           {/* {options.map(({value, label}) => {
                            const disable = selectedList.includes(value) && value !== selectValue.value;
                            return (
                                <YakitSelect.Option key={value} disabled={disable}>
                                    {label}
                                </YakitSelect.Option>
                            )
                        })}
                        </YakitSelect> */}
                        </div>
                        <div className={styles["fuzzer-sequence-list-item-heard-extra"]}>
                            <YakitButton
                                icon={<OutlineTrashIcon />}
                                type='text2'
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onRemove(item)
                                }}
                                disabled={disabled}
                            />
                            <Divider type='vertical' style={{margin: 0}} />
                            <YakitButton
                                // 添加一个不同的key 解决多次点击后 选中态不能正常显示的问题(偶发)
                                key={`cog-${item.id}-${isActive ? 'active' : 'inactive'}`}
                                icon={<OutlineCogIcon />}
                                type='text2'
                                isActive={isActive}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onShowSetting(item)
                                }}
                                disabled={disabled}
                            />
                            <Divider type='vertical' style={{margin: 0}} />
                            <Tooltip title={t("SequenceItem.go_to_fuzzer_configuration")}>
                                <YakitButton
                                    icon={<OutlineArrowcirclerightIcon />}
                                    type='text2'
                                    disabled={disabled}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        if (disabled) return
                                        if (!item.pageId) {
                                            yakitNotify("error", t("SequenceItem.please_select_page"))
                                        } else {
                                            onSelectSubMenuById(item.pageId)
                                        }
                                    }}
                                />
                            </Tooltip>
                    </div>
                </div>
            </div>
        </>
    )
})


export {
    AdvancedSet,
    ConcurrencyItem,
    initSetValue,
    AdvancedSetV2
}