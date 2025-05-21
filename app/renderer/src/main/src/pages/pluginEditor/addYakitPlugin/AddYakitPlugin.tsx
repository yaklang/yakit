import React, {memo, useEffect, useRef} from "react"
import {useInViewport, useMemoizedFn} from "ahooks"
import {PluginEditor, PluginEditorRefProps} from "../pluginEditor/PluginEditor"
import {shallow} from "zustand/shallow"
import {PageNodeItemProps, usePageInfo} from "@/store/pageInfo"
import {defaultAddYakitScriptPageInfo} from "@/defaultConstants/AddYakitScript"
import {YakitRoute} from "@/enums/yakitRoute"

import styles from "./AddYakitPlugin.module.scss"
import { registerShortcutKeyHandle, unregisterShortcutKeyHandle } from "@/utils/globalShortcutKey/utils"
import { getStorageAddYakitScriptShortcutKeyEvents } from "@/utils/globalShortcutKey/events/page/addYakitScript"
import { ShortcutKeyPage } from "@/utils/globalShortcutKey/events/pageMaps"
import useShortcutKeyTrigger from "@/utils/globalShortcutKey/events/useShortcutKeyTrigger"

interface AddYakitPluginProps {}

export const AddYakitPlugin: React.FC<AddYakitPluginProps> = memo((props) => {
    const {} = props

    const editorRef = useRef<PluginEditorRefProps>(null)

    const {queryPagesDataById} = usePageInfo(
        (s) => ({
            queryPagesDataById: s.queryPagesDataById
        }),
        shallow
    )
    // 获取新建插件-设置的初始值
    const initPageInfo = useMemoizedFn(() => {
        const currentItem: PageNodeItemProps | undefined = queryPagesDataById(
            YakitRoute.AddYakitScript,
            YakitRoute.AddYakitScript
        )
        if (currentItem && currentItem.pageParamsInfo.addYakitScriptPageInfo) {
            return currentItem.pageParamsInfo.addYakitScriptPageInfo
        } else {
            return {...defaultAddYakitScriptPageInfo}
        }
    })
    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.setNewPlugin(initPageInfo())
        }
    }, [])

    const shortcutRef = useRef<HTMLDivElement>(null)
    const [inViewport] = useInViewport(shortcutRef)
    useEffect(() => {
        if (inViewport) {
            registerShortcutKeyHandle(ShortcutKeyPage.AddYakitScript)
            getStorageAddYakitScriptShortcutKeyEvents()
            return () => {
                unregisterShortcutKeyHandle(ShortcutKeyPage.AddYakitScript)
            }
        }
    }, [inViewport])

    useShortcutKeyTrigger("save*newPlugin", () => {
        if (editorRef.current) {
            editorRef.current.onBtnLocalSave()
        }
    })

    return (
        <div className={styles["add-yakit-plugin"]} ref={shortcutRef}>
            <PluginEditor ref={editorRef} />
        </div>
    )
})
