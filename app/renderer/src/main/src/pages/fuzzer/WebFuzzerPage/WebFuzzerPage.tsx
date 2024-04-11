import React, {useEffect, useRef, useState} from "react"
import {WebFuzzerPageProps, WebFuzzerType} from "./WebFuzzerPageType"
import styles from "./WebFuzzerPage.module.scss"
import {OutlineAdjustmentsIcon, OutlineClipboardlistIcon, OutlineCollectionIcon} from "@/assets/icon/outline"
import classNames from "classnames"
import {useCreation, useInViewport, useMemoizedFn} from "ahooks"
import {YakitRoute} from "@/routes/newRoute"
import "video-react/dist/video-react.css" // import css
import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import emiter from "@/utils/eventBus/eventBus"
import {getRemoteValue} from "@/utils/kv"
import {WEB_FUZZ_Advanced_Config_Switch_Checked, WEB_FUZZ_Rule_Switch_Checked} from "../HTTPFuzzerPage"
const {ipcRenderer} = window.require("electron")

export const webFuzzerTabs = [
    {
        key: "config",
        label: "配置",
        icon: <OutlineAdjustmentsIcon />
    },
    {
        key: "rule",
        label: "规则",
        icon: <OutlineClipboardlistIcon />
    },
    {
        key: "sequence",
        label: "序列",
        icon: <OutlineCollectionIcon />
    }
]
/**包裹 配置和规则，不包裹序列 */
const WebFuzzerPage: React.FC<WebFuzzerPageProps> = React.memo((props) => {
    const webFuzzerRef = useRef<any>(null)
    const [inViewport] = useInViewport(webFuzzerRef)

    const [type, setType] = useState<WebFuzzerType>(props.defaultType || "config")
    // 监听tab栏打开或关闭 【配置】
    const [advancedConfigShow, setAdvancedConfigShow] = useState<boolean>(false)
    // 监听tab栏打开或关闭 【规则】
    const [advancedConfigRuleShow, setAdvancedConfigRuleShow] = useState<boolean>(false)

    const {selectGroupId, getPagesDataByGroupId} = usePageInfo(
        (s) => ({
            selectGroupId: s.selectGroupId.get(YakitRoute.HTTPFuzzer) || "",
            getPagesDataByGroupId: s.getPagesDataByGroupId
        }),
        shallow
    )

    useEffect(() => {
        emiter.on("onGetFuzzerAdvancedConfigShow", debounceGetFuzzerAdvancedConfigShow)
        emiter.on("onSwitchTypeWebFuzzerPage", onSwitchType)
        return () => {
            emiter.off("onGetFuzzerAdvancedConfigShow", debounceGetFuzzerAdvancedConfigShow)
            emiter.off("onSwitchTypeWebFuzzerPage", onSwitchType)
        }
    }, [])

    useEffect(() => {
        getRemoteValue(WEB_FUZZ_Advanced_Config_Switch_Checked).then((c) => {
            if (c === "") {
                setAdvancedConfigShow(true)
            } else {
                setAdvancedConfigShow(c === "true")
            }
        })
        getRemoteValue(WEB_FUZZ_Rule_Switch_Checked).then((c) => {
            if (c === "") {
                setAdvancedConfigRuleShow(true)
            } else {
                setAdvancedConfigRuleShow(c === "true")
            }
        })
    }, [])

    const onSetSequence = useMemoizedFn((key) => {
        const pageChildrenList: PageNodeItemProps[] = getPagesDataByGroupId(YakitRoute.HTTPFuzzer, selectGroupId) || []
        if (props.id && pageChildrenList.length === 0) {
            // 新建组
            onAddGroup(props.id)
        } else {
            // 设置MainOperatorContent层type变化用来控制是否展示【序列】
            ipcRenderer.invoke("send-webFuzzer-setType", {type: key})
        }
    })
    const onAddGroup = useMemoizedFn((id: string) => {
        ipcRenderer.invoke("send-add-group", {pageId: id})
    })
    /**本组件中切换tab展示的事件 */
    const onSetType = useMemoizedFn((key: WebFuzzerType) => {
        switch (key) {
            case "sequence":
                onSetSequence("sequence")
                break
            default:
                // 设置MainOperatorContent层type变化用来控制是否展示【配置】/【规则】
                ipcRenderer.invoke("send-webFuzzer-setType", {type: key})
                // 切换【配置】/【规则】的高级配置项的展示
                emiter.emit("onFuzzerAdvancedConfigShowType", JSON.stringify({type: key}))
                if (type === key) {
                    switch (key) {
                        case "config":
                            // 设置【配置】的高级配置的隐藏或显示
                            emiter.emit("onSetAdvancedConfigConfigureShow")
                            break
                        case "rule":
                            // 设置【规则】的高级配置的隐藏或显示
                            emiter.emit("onSetAdvancedConfigRuleShow")
                            break
                        default:
                            break
                    }
                }
                // 设置【配置】/【规则】选中
                setType(key)
                break
        }
    })

    const debounceGetFuzzerAdvancedConfigShow = useMemoizedFn((data) => {
        if (inViewport) {
            try {
                const value = JSON.parse(data)
                const key = value.type as WebFuzzerType
                switch (key) {
                    case "config":
                        setAdvancedConfigShow(value.checked)
                        break
                    case "rule":
                        setAdvancedConfigRuleShow(value.checked)
                        break
                    default:
                        break
                }
            } catch (error) {}
        }
    })
    /**FuzzerSequenceWrapper组件中发送的信号，切换【配置】/【规则】包裹层的type */
    const onSwitchType = useMemoizedFn((data) => {
        if (!inViewport) return
        try {
            const value = JSON.parse(data)
            const type = value.type as WebFuzzerType
            setType(type)
            // 切换【配置】/【规则】的高级配置项的展示
            emiter.emit("onFuzzerAdvancedConfigShowType", JSON.stringify({type}))
        } catch (error) {}
    })
    const isUnShow = useCreation(() => {
        switch (type) {
            case "config":
                return !advancedConfigShow
            case "rule":
                return !advancedConfigRuleShow
            default:
                return false
        }
    }, [type, advancedConfigShow, advancedConfigRuleShow])
    return (
        <div className={styles["web-fuzzer"]} ref={webFuzzerRef}>
            <div className={styles["web-fuzzer-tab"]}>
                {webFuzzerTabs.map((item) => (
                    <div
                        key={item.key}
                        className={classNames(styles["web-fuzzer-tab-item"], {
                            [styles["web-fuzzer-tab-item-active"]]: type === item.key,
                            [styles["web-fuzzer-tab-item-advanced-config-unShow"]]: item.key === type && isUnShow
                        })}
                        onClick={() => {
                            const keyType = item.key as WebFuzzerType
                            onSetType(keyType)
                        }}
                    >
                        <span className={styles["web-fuzzer-tab-label"]}>{item.label}</span>
                        {item.icon}
                    </div>
                ))}
            </div>
            <div className={classNames(styles["web-fuzzer-tab-content"])}>{props.children}</div>
        </div>
    )
})

export default WebFuzzerPage
