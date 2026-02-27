import React, {useRef, useState} from "react"
import {AIChatSelectProps, AIReviewRuleSelectProps, ReviewRuleSelectProps} from "./type"
import styles from "./AIReviewRuleSelect.module.scss"
import useAIAgentStore from "@/pages/ai-agent/useContext/useStore"
import useAIAgentDispatcher from "@/pages/ai-agent/useContext/useDispatcher"
import classNames from "classnames"
import {useClickAway, useControllableValue, useCreation, useMemoizedFn} from "ahooks"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {
    AIAgentSettingDefault,
    AIReviewRuleIconMap,
    AIReviewRuleOptions,
    AIReviewRuleOptionsType
} from "@/pages/ai-agent/defaultConstant"
import {OutlineSirenIcon} from "@/assets/icon/outline"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {FormItemSlider} from "@/pages/ai-agent/AIChatSetting/AIChatSetting"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import useChatIPCDispatcher from "@/pages/ai-agent/useContext/ChatIPCContent/useDispatcher"
import useChatIPCStore from "@/pages/ai-agent/useContext/ChatIPCContent/useStore"
import {AIInputEventHotPatchTypeEnum, AIStartParams} from "../hooks/grpcApi"
import isEqual from "lodash/isEqual"
import {YakitSegmented} from "@/components/yakitUI/YakitSegmented/YakitSegmented"
import {AIAgentSetting} from "@/pages/ai-agent/aiAgentType"
import {Tooltip} from "antd"

const AIReviewRuleSelect: React.FC<ReviewRuleSelectProps> = React.memo((props) => {
    const {setting} = useAIAgentStore()
    const {setSetting} = useAIAgentDispatcher()

    const {chatIPCData} = useChatIPCStore()
    const {handleSendConfigHotpatch} = useChatIPCDispatcher()

    const [visible, setVisible] = useState<boolean>(false)
    const [open, setOpen] = useState<boolean>(false)
    const [selectAIReviewRiskControlScore, setAIReviewRiskControlScore] =
        useState<AIStartParams["AIReviewRiskControlScore"]>()

    const selectReviewPolicyRef = useRef<AIStartParams["ReviewPolicy"]>()

    const modelValue = useCreation(() => {
        return setting?.ReviewPolicy || AIAgentSettingDefault.ReviewPolicy
    }, [setting?.ReviewPolicy, chatIPCData.execute])

    const aiReviewRiskControlScore = useCreation(() => {
        return setting?.AIReviewRiskControlScore || AIAgentSettingDefault.AIReviewRiskControlScore
    }, [setting?.AIReviewRiskControlScore])

    const onSelectModel = useMemoizedFn((value: AIStartParams["ReviewPolicy"]) => {
        setSetting && setSetting((old) => ({...old, ReviewPolicy: value}))
        if (chatIPCData.execute && !isEqual(selectReviewPolicyRef.current, modelValue)) {
            handleSendConfigHotpatch({
                hotpatchType: AIInputEventHotPatchTypeEnum.HotPatchType_AgreePolicy,
                params: {
                    ReviewPolicy: modelValue
                }
            })
        }
        selectReviewPolicyRef.current = modelValue
    })

    const onSetAIReviewRiskControlScore = useMemoizedFn((value?: number) => {
        setSetting && setSetting((old) => ({...old, AIReviewRiskControlScore: value || 0}))
    })

    const onVisibleChange = useMemoizedFn((v: boolean) => {
        setVisible(v)
        if (!v && chatIPCData.execute && !isEqual(selectAIReviewRiskControlScore, aiReviewRiskControlScore)) {
            handleSendConfigHotpatch({
                hotpatchType: AIInputEventHotPatchTypeEnum.HotPatchType_RiskControlScore,
                params: {
                    AIReviewRiskControlScore: selectAIReviewRiskControlScore
                }
            })
            onSetAIReviewRiskControlScore(selectAIReviewRiskControlScore)
        }
        if (v) setAIReviewRiskControlScore(aiReviewRiskControlScore)
    })
    // const onSetOpen = useMemoizedFn((v: boolean) => {
    //     setOpen(v)
    //     if (!v && chatIPCData.execute && !isEqual(selectReviewPolicyRef.current, modelValue)) {
    //         handleSendConfigHotpatch({
    //             hotpatchType: AIInputEventHotPatchTypeEnum.HotPatchType_AgreePolicy,
    //             params: {
    //                 ReviewPolicy: modelValue
    //             }
    //         })
    //     }
    //     if (v) selectReviewPolicyRef.current = modelValue
    // })
    const getIcon = useMemoizedFn((value: AIReviewRuleOptionsType) => {
        if (modelValue === value) {
            return AIReviewRuleIconMap[value]?.activeIcon
        }
        return AIReviewRuleIconMap[value]?.icon
    })
    return (
        <div className={classNames(styles["review-rule-select-wrapper"],props.className)}>
            <YakitSegmented
                value={modelValue}
                onChange={(v) => {
                    const showType = v as AIAgentSetting["ReviewPolicy"]
                    onSelectModel(showType)
                }}
                options={AIReviewRuleOptions.map((item) => ({
                    icon: <Tooltip title={item.describe}>{getIcon(item.value)}</Tooltip>,
                    value: item.value
                }))}
                size='small'
                wrapClassName={styles["yakit-segmented-wrapper"]}
                className={styles["segmented"]}
            />
            {modelValue === "ai" && (
                <YakitPopover
                    content={
                        <div className={styles["popover-wrapper"]}>
                            <span>风险阈值：</span>
                            <FormItemSlider
                                value={selectAIReviewRiskControlScore}
                                onChange={setAIReviewRiskControlScore}
                                min={0}
                                max={1}
                                step={0.01}
                            />
                        </div>
                    }
                    trigger={["hover", "click"]}
                    visible={visible}
                    onVisibleChange={onVisibleChange}
                >
                    <YakitButton
                        type='text2'
                        isHover={visible}
                        icon={<OutlineSirenIcon className={styles["siren-icon"]} />}
                        onClick={(e) => {
                            e.stopPropagation()
                        }}
                    />
                </YakitPopover>
            )}
        </div>
    )
})
export default AIReviewRuleSelect

export const AIChatSelect: React.FC<AIChatSelectProps> = React.memo((props) => {
    const {getList, dropdownRender, children, setOpen: defSetOpen, ...rest} = props
    const [open, setOpen] = useControllableValue(props, {
        defaultValue: false,
        valuePropName: "open",
        trigger: "setOpen"
    })

    const selectWrapperRef = useRef<HTMLDivElement>(null)
    const dropdownRenderRef = useRef<HTMLDivElement>(null)
    const isHoveringByDropdown = useRef<boolean>(false)

    useClickAway(() => {
        if (open) setOpen(false)
    }, [selectWrapperRef])

    const onMouseEnterDropdown = useMemoizedFn((e) => {
        e.stopPropagation()
        isHoveringByDropdown.current = true
    })
    const onMouseLeaveDropdown = useMemoizedFn((e) => {
        e.stopPropagation()
        setOpen(false)
        isHoveringByDropdown.current = false
    })
    const onSelectWrapperClick = useMemoizedFn((e) => {
        e.stopPropagation()
        onOpen()
    })
    const onMouseEnterSelectWrapper = useMemoizedFn((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        e.stopPropagation()
        onOpen()
    })
    const onMouseLeaveSelectWrapper = useMemoizedFn((e) => {
        e.stopPropagation()
        setTimeout(() => {
            if (!isHoveringByDropdown.current && open) setOpen(false)
        }, 500)
    })
    const onOpen = useMemoizedFn(() => {
        setOpen(true)
        getList && getList()
    })
    const onDropdownRender = useMemoizedFn((menu) => (
        <div onMouseEnter={onMouseEnterDropdown} onMouseLeave={onMouseLeaveDropdown} ref={dropdownRenderRef}>
            {dropdownRender(menu, setOpen)}
        </div>
    ))
    return (
        <div
            ref={selectWrapperRef}
            className={classNames(styles["ai-chat-select-wrapper"])}
            onMouseEnter={onMouseEnterSelectWrapper}
            onMouseLeave={onMouseLeaveSelectWrapper}
            onClick={onSelectWrapperClick}
        >
            <YakitSelect
                dropdownMatchSelectWidth={false}
                size='small'
                dropdownRender={onDropdownRender}
                bordered={false}
                open={open}
                {...rest}
            >
                {children}
            </YakitSelect>
        </div>
    )
})
