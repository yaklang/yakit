import React, {memo, useEffect, useMemo, useState} from "react"
import {AIChatSettingProps, FormItemSliderProps} from "./aiAgentType"
import useStore from "./useContext/useStore"
import useDispatcher from "./useContext/useDispatcher"
import {Form, Slider, Tooltip} from "antd"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {useMemoizedFn, useUpdateEffect} from "ahooks"
import {YakitAutoComplete} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {OutlineInformationcircleIcon} from "@/assets/icon/outline"
import cloneDeep from "lodash/cloneDeep"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {AIAgentSettingDefault} from "./defaultConstant"

// import classNames from "classnames"
import styles from "./AIAgent.module.scss"

export const AIChatSetting: React.FC<AIChatSettingProps> = memo((props) => {
    const [form] = Form.useForm()

    const {setting} = useStore()
    const {setSetting} = useDispatcher()

    useEffect(() => {
        form && form.setFieldsValue({...(setting || {})})
    }, [setting])

    const handleFormChange = useMemoizedFn((changedValues) => {
        setSetting && setSetting((old) => ({...old, ...changedValues}))
    })

    const [triggerInit, setTriggerInit] = useState(false)
    const handeReset = useMemoizedFn(() => {
        form && form.setFieldsValue(cloneDeep(AIAgentSettingDefault))
        setSetting && setSetting(cloneDeep(AIAgentSettingDefault))
        setTriggerInit((old) => !old)
    })

    const forgeList = useMemo(() => {
        return [
            {label: "fragment_summarizer", value: "fragment_summarizer"},
            {label: "long_text_summarizer", value: "long_text_summarizer"},
            {label: "xss", value: "xss"},
            {label: "sqlinject", value: "sqlinject"},
            {label: "travelmaster", value: "travelmaster"},
            {label: "pimatrix", value: "pimatrix"},
            {label: "netscan", value: "netscan"},
            {label: "recon", value: "recon"}
        ]
    }, [])

    return (
        <div className={styles["ai-chat-setting"]}>
            <div className={styles["setting-header"]}>
                <div className={styles["header-title"]}>配置</div>
                <YakitButton type='text' colors='danger' onClick={handeReset}>
                    重置
                </YakitButton>
            </div>

            <Form
                className={styles["setting-form"]}
                form={form}
                size='small'
                colon={false}
                labelCol={{span: 10}}
                labelWrap={true}
                onValuesChange={handleFormChange}
            >
                <Form.Item
                    label={
                        <>
                            禁用人机交互
                            <Tooltip overlayClassName={styles["form-info-icon-tooltip"]} title={"下一个请求"}>
                                <OutlineInformationcircleIcon className={styles["info-icon"]} />
                            </Tooltip>
                        </>
                    }
                    name='DisallowRequireForUserPrompt'
                    valuePropName='checked'
                >
                    <YakitSwitch />
                </Form.Item>
                <Form.Item label='Review 规则' name='ReviewPolicy'>
                    <YakitRadioButtons
                        buttonStyle='solid'
                        size={"small"}
                        options={[
                            {
                                value: "manual",
                                label: "Manual"
                            },
                            {
                                value: "yolo",
                                label: "Yolo"
                            },
                            {
                                value: "ai",
                                label: "AI"
                            }
                        ]}
                    />
                </Form.Item>
                <Form.Item label='激活系统文件操作权限' name='EnableSystemFileSystemOperator' valuePropName='checked'>
                    <YakitSwitch />
                </Form.Item>
                <Form.Item label='使用默认系统配置AI' name='UseDefaultAIConfig' valuePropName='checked'>
                    <YakitSwitch />
                </Form.Item>
                <Form.Item label='任务模板' name='ForgeName'>
                    <YakitAutoComplete
                        size={"small"}
                        showSearch
                        options={forgeList}
                        placeholder='请输入任务模板'
                        filterOption={true}
                    />
                </Form.Item>
                <Form.Item
                    label={
                        <>
                            风险阈值
                            <Tooltip overlayClassName={styles["form-info-icon-tooltip"]} title={"下一个请求"}>
                                <OutlineInformationcircleIcon className={styles["info-icon"]} />
                            </Tooltip>
                        </>
                    }
                    name='AIReviewRiskControlScore'
                >
                    <FormItemSlider
                        init={triggerInit}
                        defaultValue={setting.AIReviewRiskControlScore || 0}
                        min={0}
                        max={1}
                        step={0.01}
                    />
                </Form.Item>
                <Form.Item label='AI 搜索本地工具' name='EnableAISearchTool' valuePropName='checked'>
                    <YakitSwitch />
                </Form.Item>
                <Form.Item label='搜索互联网搜索引擎' name='EnableAISearchInternet' valuePropName='checked'>
                    <YakitSwitch />
                </Form.Item>
                <Form.Item
                    label={
                        <>
                            上下文压力阈值
                            <Tooltip overlayClassName={styles["form-info-icon-tooltip"]} title={"下一个请求"}>
                                <OutlineInformationcircleIcon className={styles["info-icon"]} />
                            </Tooltip>
                        </>
                    }
                    name='AITransactionRetry'
                >
                    <FormItemSlider
                        init={triggerInit}
                        defaultValue={setting.AITransactionRetry || 0}
                        min={0}
                        max={3000}
                        step={10}
                    />
                </Form.Item>
            </Form>
        </div>
    )
})

const FormItemSlider: React.FC<FormItemSliderProps> = React.memo((props) => {
    const {init, onChange, defaultValue, ...rest} = props

    const [showValue, setShowValue] = useState(defaultValue || 0)
    useUpdateEffect(() => {
        setShowValue(defaultValue || 0)
    }, [init])

    return (
        <div className={styles["form-item-slider"]}>
            <div className={styles["slider-body"]}>
                <Slider
                    tooltipVisible={false}
                    {...rest}
                    onChange={(value) => {
                        onChange && onChange(value)
                        setShowValue(value)
                    }}
                />
            </div>

            <div className={styles["slider-value"]}>{showValue}</div>
        </div>
    )
})
