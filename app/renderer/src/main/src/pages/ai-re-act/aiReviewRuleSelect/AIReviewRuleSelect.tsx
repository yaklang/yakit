import React, {useRef, useState} from "react"
import {AIChatSelectProps, AIReviewRuleSelectProps} from "./type"
import styles from "./AIReviewRuleSelect.module.scss"
import useAIAgentStore from "@/pages/ai-agent/useContext/useStore"
import useAIAgentDispatcher from "@/pages/ai-agent/useContext/useDispatcher"
import classNames from "classnames"
import {useClickAway, useControllableValue, useCreation, useMemoizedFn} from "ahooks"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {AIAgentSettingDefault, AIReviewRuleOptions} from "@/pages/ai-agent/defaultConstant"
import {OutlineCodepenIcon, OutlineSirenIcon} from "@/assets/icon/outline"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {FormItemSlider} from "@/pages/ai-agent/AIChatSetting/AIChatSetting"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import useChatIPCDispatcher from "@/pages/ai-agent/useContext/ChatIPCContent/useDispatcher"
import useChatIPCStore from "@/pages/ai-agent/useContext/ChatIPCContent/useStore"
import {AIStartParams} from "../hooks/grpcApi"

const AIReviewRuleSelect: React.FC<AIReviewRuleSelectProps> = React.memo((props) => {
    const {setting} = useAIAgentStore()
    const {setSetting} = useAIAgentDispatcher()

    const {chatIPCData} = useChatIPCStore()
    const {handleSendSyncMessage} = useChatIPCDispatcher()

    const [visible, setVisible] = useState<boolean>(false)
    const [open, setOpen] = useState<boolean>(false)

    const modelValue = useCreation(() => {
        return setting?.ReviewPolicy || AIAgentSettingDefault.ReviewPolicy
    }, [setting?.ReviewPolicy, chatIPCData.execute])

    const aiReviewRiskControlScore = useCreation(() => {
        return setting?.AIReviewRiskControlScore || AIAgentSettingDefault.AIReviewRiskControlScore
    }, [setting?.AIReviewRiskControlScore])

    const onSelectModel = useMemoizedFn((value: AIStartParams["ReviewPolicy"]) => {
        setSetting && setSetting((old) => ({...old, ReviewPolicy: value}))
    })

    const onSetAIReviewRiskControlScore = useMemoizedFn((value: number) => {
        setSetting && setSetting((old) => ({...old, AIReviewRiskControlScore: value}))
    })

    const onVisibleChange = useMemoizedFn(() => {
        setVisible((v) => !v)
    })
    const onSetOpen = useMemoizedFn((v: boolean) => {
        setOpen(v)
        if (!v && chatIPCData.execute) {
            handleSendSyncMessage({
                syncType: "update_config",
                params: {
                    ReviewPolicy: modelValue
                }
            })
        }
    })
    return (
        <>
            <AIChatSelect
                dropdownRender={(menu) => {
                    return (
                        <div className={styles["drop-select-wrapper"]}>
                            <div className={styles["select-title"]}>
                                <OutlineCodepenIcon />
                                回答模式
                            </div>
                            {menu}
                        </div>
                    )
                }}
                value={modelValue}
                onSelect={onSelectModel}
                optionLabelProp='label'
                open={open}
                setOpen={onSetOpen}
            >
                {AIReviewRuleOptions.map((item) => (
                    <YakitSelect.Option
                        key={item.value}
                        value={item.value}
                        label={
                            <div className={styles["select-option"]}>
                                <OutlineCodepenIcon />
                                {item.label}
                            </div>
                        }
                    >
                        <div
                            className={classNames(styles["select-option-wrapper"], {
                                [styles["select-option-active-wrapper"]]: item.value === modelValue
                            })}
                        >
                            <div className={styles["text"]}>{item.label}</div>
                            <div className={styles["describe"]}> {item.describe}</div>
                        </div>
                    </YakitSelect.Option>
                ))}
            </AIChatSelect>
            {modelValue === "ai" && (
                <YakitPopover
                    content={
                        <div className={styles["popover-wrapper"]}>
                            <FormItemSlider
                                value={aiReviewRiskControlScore}
                                onChange={onSetAIReviewRiskControlScore}
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
                        icon={<OutlineSirenIcon />}
                        disabled={chatIPCData.execute}
                    />
                </YakitPopover>
            )}
        </>
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
