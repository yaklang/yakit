import React, {useMemo, useRef, useState} from "react"
import {PluginDebugDrawerProps} from "./PluginDebugDrawerType"
import {usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import classNames from "classnames"
import styles from "./PluginDebugDrawer.module.scss"
import {useCreation, useMemoizedFn} from "ahooks"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {SolidStoreIcon} from "@/assets/icon/solid"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/routes/newRoute"
import {NucleiPluginTemplate} from "@/pages/pluginDebugger/defaultData"
import {PluginDebugBody} from "@/pages/plugins/pluginDebug/PluginDebug"
import {PluginDataProps} from "@/pages/plugins/pluginsType"
import {OutlineXIcon} from "@/assets/icon/outline"

const PluginDebugDrawer: React.FC<PluginDebugDrawerProps> = React.memo((props) => {
    const {route, defaultCode, visible, getContainer, setVisible} = props
    const {menuBodyHeight} = usePageInfo(
        (s) => ({
            menuBodyHeight: s.menuBodyHeight
        }),
        shallow
    )
    const [code, setCode] = useState<string>(defaultCode || NucleiPluginTemplate)

    const debuggerTypeRef = useRef("nuclei")

    const heightDrawer = useMemo(() => {
        return menuBodyHeight.firstTabMenuBodyHeight - 40
    }, [menuBodyHeight.firstTabMenuBodyHeight])
    // 关闭
    const onClose = useMemoizedFn(() => {
        setVisible(false)
    })
    // 点击存为插件 跳转新建插件页面
    const handleSkipAddYakitScriptPage = useMemoizedFn(() => {
        emiter.emit(
            "openPage",
            JSON.stringify({
                route: YakitRoute.AddYakitScript,
                params: {
                    pluginType: debuggerTypeRef.current,
                    code: code,
                    source: route
                }
            })
        )
        onClose()
    })
    /**PluginDebugBody组件中使用这个plugin 主要是为了取 Type */
    const plugin: PluginDataProps = useCreation(() => {
        const info: PluginDataProps = {
            ScriptName: "",
            Type: debuggerTypeRef.current,
            Content: code
        }
        return info
    }, [visible])
    return (
        <YakitDrawer
            getContainer={getContainer}
            placement='bottom'
            mask={false}
            closable={false}
            keyboard={false}
            height={heightDrawer}
            visible={visible}
            className={classNames(styles["plugin-debugger-drawer"])}
            title='插件调试'
            extra={
                <div className={styles["header-extra-wrapper"]}>
                    <YakitButton type='primary' icon={<SolidStoreIcon />} onClick={handleSkipAddYakitScriptPage}>
                        存为插件
                    </YakitButton>
                    <YakitButton type='text2' icon={<OutlineXIcon />} onClick={onClose} />
                </div>
            }
            onClose={onClose}
        >
            <PluginDebugBody plugin={plugin} newCode={code} setNewCode={setCode} />
        </YakitDrawer>
    )
})

export default PluginDebugDrawer
