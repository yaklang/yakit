import React, {useEffect, useRef, useState} from "react"
import {WebFuzzerPageProps, WebFuzzerType} from "./WebFuzzerPageType"
import styles from "./WebFuzzerPage.module.scss"
import {OutlineAdjustmentsIcon, OutlineClipboardlistIcon, OutlineCollectionIcon} from "@/assets/icon/outline"
import classNames from "classnames"
import {useCreation, useInViewport, useMemoizedFn} from "ahooks"
import {YakitRoute} from "@/enums/yakitRoute"
import "video-react/dist/video-react.css" // import css
import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import emiter from "@/utils/eventBus/eventBus"
import {getRemoteValue} from "@/utils/kv"
import {AdvancedConfigShowProps} from "../HTTPFuzzerPage"

import cloneDeep from "lodash/cloneDeep"
import {defaultWebFuzzerPageInfo} from "@/defaultConstants/HTTPFuzzerPage"
import {FuzzerRemoteGV} from "@/enums/fuzzer"
import ShortcutKeyFocusHook from "@/utils/globalShortcutKey/shortcutKeyFocusHook/ShortcutKeyFocusHook"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
const {ipcRenderer} = window.require("electron")

export const webFuzzerTabs = (t: (text: string) => string) => {
    return [
        {
            key: "config",
            label: t("WebFuzzerPage.config"),
            icon: <OutlineAdjustmentsIcon />
        },
        {
            key: "rule",
            label: t("WebFuzzerPage.rule"),
            icon: <OutlineClipboardlistIcon />
        },
        {
            key: "sequence",
            label: t("WebFuzzerPage.sequence"),
            icon: <OutlineCollectionIcon />
        }
    ]
}
/**包裹 配置和规则，不包裹序列 */
const WebFuzzerPage: React.FC<WebFuzzerPageProps> = React.memo((props) => {
    const {id} = props
    const {t, i18n} = useI18nNamespaces(["webFuzzer", "yakitUi"])
    const {queryPagesDataById, selectGroupId, getPagesDataByGroupId} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById,
            selectGroupId: s.selectGroupId.get(YakitRoute.HTTPFuzzer) || "",
            getPagesDataByGroupId: s.getPagesDataByGroupId
        }),
        shallow
    )
    const initWebFuzzerPageInfo = useMemoizedFn(() => {
        if (!id) {
            return cloneDeep(defaultWebFuzzerPageInfo)
        }
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(YakitRoute.HTTPFuzzer, id)
        if (currentItem && currentItem.pageParamsInfo.webFuzzerPageInfo) {
            return currentItem.pageParamsInfo.webFuzzerPageInfo
        } else {
            return cloneDeep(defaultWebFuzzerPageInfo)
        }
    })

    const webFuzzerRef = useRef<any>(null)
    const [inViewport] = useInViewport(webFuzzerRef)
    const [type, setType] = useState<WebFuzzerType>(props.defaultType || "config")
    // 高级配置的隐藏/显示
    const [advancedConfigShow, setAdvancedConfigShow] = useState<AdvancedConfigShowProps>({
        config: false,
        rule: true
    })

    useEffect(() => {
        emiter.on("onGetFuzzerAdvancedConfigShow", debounceGetFuzzerAdvancedConfigShow)
        emiter.on("sequenceSendSwitchTypeToFuzzer", onSwitchType)
        return () => {
            emiter.off("onGetFuzzerAdvancedConfigShow", debounceGetFuzzerAdvancedConfigShow)
            emiter.off("sequenceSendSwitchTypeToFuzzer", onSwitchType)
        }
    }, [])

    useEffect(() => {
        getRemoteValue(FuzzerRemoteGV.WebFuzzerAdvancedConfigShow).then((c) => {
            if (!c) return
            try {
                const newAdvancedConfigShow = initWebFuzzerPageInfo().advancedConfigShow
                if (newAdvancedConfigShow) {
                    setAdvancedConfigShow({...newAdvancedConfigShow})
                } else {
                    const value = JSON.parse(c)
                    setAdvancedConfigShow({
                        ...value
                    })
                }
            } catch (error) {}
        })
    }, [])

    const onSetSequence = useMemoizedFn(() => {
        const pageChildrenList: PageNodeItemProps[] = getPagesDataByGroupId(YakitRoute.HTTPFuzzer, selectGroupId) || []
        if (props.id && pageChildrenList.length === 0) {
            // 新建组
            onAddGroup(props.id)
        } else {
            // 设置MainOperatorContent层type变化用来控制是否展示【序列】
            emiter.emit("sendSwitchSequenceToMainOperatorContent", JSON.stringify({type: "sequence"}))
        }
    })
    const onAddGroup = useMemoizedFn((id: string) => {
        ipcRenderer.invoke("send-add-group", {pageId: id})
    })
    /**本组件中切换tab展示的事件 */
    const onSetType = useMemoizedFn((key: WebFuzzerType) => {
        switch (key) {
            case "sequence":
                onSetSequence()
                // 当前页面不在fuzzer页面
                emiter.emit("onCurrentFuzzerPage", false)
                break
            default:
                // 设置MainOperatorContent层type变化用来控制是否展示【配置】/【规则】
                emiter.emit("sendSwitchSequenceToMainOperatorContent", JSON.stringify({type: key}))
                // 发送到HTTPFuzzerPage组件中 选中【配置】/【规则】 type
                emiter.emit("onSwitchTypeWebFuzzerPage", JSON.stringify({type: key}))
                if (type === key) {
                    // 设置【配置】/【规则】的高级配置的隐藏或显示
                    emiter.emit("onSetAdvancedConfigShow", JSON.stringify({type: key}))
                }
                // 当前页面在fuzzer页面
                emiter.emit("onCurrentFuzzerPage", true)
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
                if (key === "sequence") return
                const c = value.checked
                const newValue = {
                    ...advancedConfigShow,
                    [key]: c
                }
                setAdvancedConfigShow(newValue)
            } catch (error) {}
        }
    })
    /**FuzzerSequenceWrapper组件中发送的信号，切换【配置】/【规则】包裹层的type */
    const onSwitchType = useMemoizedFn((data) => {
        if (!inViewport) return
        try {
            const value = JSON.parse(data)
            const type = value.type as WebFuzzerType
            if (type === "sequence") return
            setType(type)
            // 发送到HTTPFuzzerPage组件中 切换【配置】/【规则】tab 得选中type
            emiter.emit("onSwitchTypeWebFuzzerPage", JSON.stringify({type}))
        } catch (error) {}
    })
    const isUnShow = useCreation(() => {
        switch (type) {
            case "config":
                return !advancedConfigShow.config
            case "rule":
                return !advancedConfigShow.rule
            default:
                return false
        }
    }, [type, advancedConfigShow, advancedConfigShow])

    return (
        <ShortcutKeyFocusHook
            className={styles["web-fuzzer"]}
            boxRef={webFuzzerRef}
            focusId={props.id ? [props.id] : undefined}
            isUpdateFocus={false}
        >
            <div className={styles["web-fuzzer-tab"]}>
                {webFuzzerTabs(t).map((item) => (
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
        </ShortcutKeyFocusHook>
    )
})

export default WebFuzzerPage
