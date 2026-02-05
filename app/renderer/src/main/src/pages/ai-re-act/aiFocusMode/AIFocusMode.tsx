import React, {useEffect, useRef, useState} from "react"
import {AIFocusModeProps} from "./type"
import {OutlineMicroscopeIcon, OutlineXIcon} from "@/assets/icon/outline"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import useChatIPCStore from "@/pages/ai-agent/useContext/ChatIPCContent/useStore"
import {useInViewport, useMemoizedFn} from "ahooks"
import classNames from "classnames"
import {AIChatSelect} from "../aiReviewRuleSelect/AIReviewRuleSelect"
import {AIInputEvent} from "../hooks/grpcApi"
import styles from "./AIFocusMode.module.scss"
import {grpcQueryAIFocus} from "@/pages/ai-agent/grpc"
import {AIFocus} from "@/pages/ai-agent/type/forge"
import {YakitSelectProps} from "@/components/yakitUI/YakitSelect/YakitSelectType"

export const AIFocusMode: React.FC<AIFocusModeProps> = React.memo((props) => {
    const {value, onChange} = props

    const [focusModeList, setFocusModeList] = useState<YakitSelectProps["options"]>([])
    const [open, setOpen] = useState<boolean>(false)
    const ref = useRef<HTMLDivElement>(null)

    const [inViewPort = true] = useInViewport(ref)

    useEffect(() => {
        if (inViewPort) getFocusMode()
    }, [inViewPort])
    const getFocusMode = useMemoizedFn(() => {
        grpcQueryAIFocus().then((res) => {
            const list = (res?.Data || []).map((item: AIFocus) => ({label: item.Name, value: item.Name}))
            setFocusModeList(list)
        })
    })
    const onSelectModel = useMemoizedFn((value: AIInputEvent["FocusModeLoop"]) => {
        onChange(value)
    })

    const onSetOpen = useMemoizedFn((v: boolean) => {
        setOpen(v)
    })
    return (
        <div ref={ref}>
            <AIChatSelect
                dropdownRender={(menu) => {
                    return (
                        <div className={styles["drop-select-wrapper"]}>
                            <div className={styles["select-title"]}>
                                <OutlineMicroscopeIcon />
                                专注模式
                            </div>
                            {menu}
                        </div>
                    )
                }}
                value={value}
                onSelect={onSelectModel}
                optionLabelProp='label'
                open={open}
                setOpen={onSetOpen}
            >
                {focusModeList?.map((item) => (
                    <YakitSelect.Option
                        key={item.value}
                        value={item.value}
                        label={
                            <div className={styles["select-option"]}>
                                <OutlineMicroscopeIcon className={styles["icon-wrapper"]} />
                                {/* data-label='true' 有该属性的元素，在footer-left-btns-default下有样式需求 */}
                                <span
                                    data-label='true'
                                    className={styles["select-option-text"]}
                                    title={`${item.label}`}
                                >
                                    {item.label}
                                </span>
                                <OutlineXIcon className={styles["icon-wrapper"]} onClick={() => onChange(undefined)} />
                            </div>
                        }
                    >
                        <div
                            className={classNames(styles["select-option-wrapper"], {
                                [styles["select-option-active-wrapper"]]: item.value === value
                            })}
                        >
                            <div className={styles["text"]}>{item.label}</div>
                            <div className={styles["describe"]}> {item.describe}</div>
                        </div>
                    </YakitSelect.Option>
                ))}
            </AIChatSelect>
        </div>
    )
})
