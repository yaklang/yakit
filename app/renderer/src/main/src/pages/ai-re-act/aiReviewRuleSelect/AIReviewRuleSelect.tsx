import React, {useRef, useState} from "react"
import {AIChatSelectProps, AIReviewRuleSelectProps} from "./type"
import styles from "./AIReviewRuleSelect.module.scss"
import useAIAgentStore from "@/pages/ai-agent/useContext/useStore"
import useAIAgentDispatcher from "@/pages/ai-agent/useContext/useDispatcher"
import classNames from "classnames"
import {useClickAway, useCreation, useMemoizedFn} from "ahooks"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {AIAgentSettingDefault, AIReviewRuleOptions} from "@/pages/ai-agent/defaultConstant"
import {OutlineCodepenIcon, OutlineSirenIcon} from "@/assets/icon/outline"
import {AIStartParams} from "@/pages/ai-agent/type/aiChat"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {FormItemSlider} from "@/pages/ai-agent/AIChatSetting/AIChatSetting"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import useChatIPCDispatcher from "@/pages/ai-agent/useContext/ChatIPCContent/useDispatcher"
import useChatIPCStore from "@/pages/ai-agent/useContext/ChatIPCContent/useStore"

const AIReviewRuleSelect: React.FC<AIReviewRuleSelectProps> = React.memo((props) => {
    const {disabled} = props
    const {setting} = useAIAgentStore()
    const {setSetting} = useAIAgentDispatcher()

    const {chatIPCData} = useChatIPCStore()
    const {chatIPCEvents} = useChatIPCDispatcher()

    const [visible, setVisible] = useState<boolean>(false)

    const modelValue = useCreation(() => {
        if (chatIPCData.execute) return chatIPCEvents.fetchRequest()?.ReviewPolicy
        return setting?.ReviewPolicy || AIAgentSettingDefault.ReviewPolicy
    }, [setting?.ReviewPolicy, chatIPCData.execute, chatIPCEvents.fetchRequest])

    const aiReviewRiskControlScore = useCreation(() => {
        return setting?.AIReviewRiskControlScore || AIAgentSettingDefault.AIReviewRiskControlScore
    }, [setting?.AIReviewRiskControlScore])

    const onSelectModel = useMemoizedFn((value: AIStartParams["ReviewPolicy"]) => {
        if (disabled) return
        setSetting && setSetting((old) => ({...old, ReviewPolicy: value}))
    })

    const onSetAIReviewRiskControlScore = useMemoizedFn((value: number) => {
        if (disabled) return
        setSetting && setSetting((old) => ({...old, AIReviewRiskControlScore: value}))
    })

    const onVisibleChange = useMemoizedFn(() => {
        if (disabled) return
        setVisible((v) => !v)
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
                disabled={disabled}
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
                    <YakitButton type='text2' isHover={visible} icon={<OutlineSirenIcon />} disabled={disabled} />
                </YakitPopover>
            )}
        </>
    )
})

export default AIReviewRuleSelect

export const AIChatSelect: React.FC<AIChatSelectProps> = React.memo((props) => {
    const {getList, dropdownRender, children, ...rest} = props
    const [open, setOpen] = useState<boolean>(false)

    const selectWrapperRef = useRef<HTMLDivElement>(null)
    const dropdownRenderRef = useRef<HTMLDivElement>(null)
    const isHoveringByDropdown = useRef<boolean>(false)

    useClickAway(() => {
        setOpen(false)
    }, [selectWrapperRef])

    const onMouseEnterDropdown = useMemoizedFn(() => {
        isHoveringByDropdown.current = true
    })
    const onMouseLeaveDropdown = useMemoizedFn((e) => {
        setOpen(false)
        isHoveringByDropdown.current = false
    })
    const onSelectWrapperClick = useMemoizedFn(() => {
        onOpen()
    })
    const onMouseEnterSelectWrapper = useMemoizedFn((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        onOpen()
    })
    const onMouseLeaveSelectWrapper = useMemoizedFn(() => {
        setTimeout(() => {
            if (!isHoveringByDropdown.current) setOpen(false)
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
