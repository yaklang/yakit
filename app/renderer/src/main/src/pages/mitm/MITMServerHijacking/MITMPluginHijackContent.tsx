import {ArrowsExpandIcon, ArrowsRetractIcon, PlayIcon} from "@/assets/newIcon"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {MITMPluginTemplateShort} from "@/pages/invoker/data/MITMPluginTamplate"
import {YakExecutorParam} from "@/pages/invoker/YakExecutorParams"
import {EditorProps, YakCodeEditor} from "@/utils/editors"
import {useMemoizedFn} from "ahooks"
import {CheckboxChangeEvent} from "antd/lib/checkbox"
import React, {useEffect, useState} from "react"
import {
    MITMPluginLocalList,
    PluginGroup,
    PluginSearch,
    YakFilterRemoteObj,
    YakModuleListHeard
} from "./MITMPluginLocalList"
import styles from "./MITMServerHijacking.module.scss"

const {ipcRenderer} = window.require("electron")

interface MITMPluginHijackContentProps {
    checkList: string[]
    setCheckList: (s: string[]) => void
    onSubmitYakScriptId: (id: number, params: YakExecutorParam[]) => any
    status: "idle" | "hijacked" | "hijacking"
    isFullScreen: boolean
    setIsFullScreen: (b: boolean) => void
    onSelectAll: (e: CheckboxChangeEvent) => void
}
export const MITMPluginHijackContent: React.FC<MITMPluginHijackContentProps> = (props) => {
    const {onSubmitYakScriptId, status, checkList, setCheckList, isFullScreen, setIsFullScreen, onSelectAll} = props
    const [mode, setMode] = useState<"hot-patch" | "loaded" | "all">("all")
    const [tags, setTags] = useState<string[]>([])
    const [searchKeyword, setSearchKeyword] = useState<string>("")
    const [triggerSearch, setTriggerSearch] = useState<boolean>(false)
    const [isSelectAll, setIsSelectAll] = useState<boolean>(false)
    const [total, setTotal] = useState<number>(0)
    const [refreshCode, setRefreshCode] = useState<boolean>(false)
    /**
     * 选中的插件组
     */
    const [selectGroup, setSelectGroup] = useState<YakFilterRemoteObj[]>([])

    const [script, setScript] = useState(MITMPluginTemplateShort)

    const onRefresh = useMemoizedFn(() => {
        setRefreshCode(!refreshCode)
    })

    const onSearch = useMemoizedFn(() => {
        setTriggerSearch(!triggerSearch)
    })
    const onRenderHeardExtra = useMemoizedFn(() => {
        switch (mode) {
            case "hot-patch":
                return (
                    <div className={styles["hot-patch-heard-extra"]}>
                        <YakitButton type='outline1'>
                            <PlayIcon />
                            热加载
                        </YakitButton>
                        {isFullScreen ? (
                            <ArrowsRetractIcon
                                className={styles["expand-icon"]}
                                onClick={() => setIsFullScreen(false)}
                            />
                        ) : (
                            <ArrowsExpandIcon
                                className={styles["expand-icon"]}
                                onClick={() => {
                                    setIsFullScreen(true)
                                }}
                            />
                        )}
                    </div>
                )
            default:
                return (
                    <div className={styles["search-plugin-hijack-content"]}>
                        <PluginSearch
                            tag={tags}
                            setTag={setTags}
                            searchKeyword={searchKeyword}
                            setSearchKeyword={setSearchKeyword}
                            onSearch={onSearch}
                            selectSize='small'
                            inputSize='middle'
                            selectModuleTypeSize='small'
                        />
                    </div>
                )
        }
    })
    const onRenderContent = useMemoizedFn(() => {
        switch (mode) {
            case "hot-patch":
                return (
                    <div className={styles["hot-patch-code"]}>
                        {/* 用户热加载代码 */}
                        <YakCodeEditor
                            refreshTrigger={refreshCode}
                            noHeader={true}
                            noPacketModifier={true}
                            originValue={Buffer.from(script, "utf8")}
                            onChange={(e) => setScript(e.toString("utf8"))}
                            language={"yak"}
                            extraEditorProps={
                                {
                                    noMiniMap: true,
                                    noWordWrap: true
                                } as EditorProps
                            }
                        />
                    </div>
                )
            case "loaded":
                return (
                    <div className={styles["plugin-loaded-list"]}>
                        <div className={styles["plugin-loaded-list-heard"]}>
                            <div className={styles["plugin-loaded-list-heard-total"]}>
                                Total<span>&nbsp;{total}</span>
                            </div>
                            <div className={styles["plugin-loaded-list-heard-empty"]}>清空</div>
                        </div>
                        <MITMPluginLocalList
                            height='calc(100% - 52px)'
                            onSubmitYakScriptId={onSubmitYakScriptId}
                            status={status}
                            checkList={checkList}
                            setCheckList={(list) => {
                                setCheckList(list)
                            }}
                            tags={tags}
                            setTags={setTags}
                            searchKeyword={searchKeyword}
                            triggerSearch={triggerSearch}
                            setIsSelectAll={setIsSelectAll}
                            isSelectAll={isSelectAll}
                            selectGroup={selectGroup}
                            setSelectGroup={setSelectGroup}
                            setTotal={setTotal}
                        />
                    </div>
                )
            default:
                return (
                    <div className={styles["plugin-hijack-content-list"]}>
                        <PluginGroup
                            checkList={checkList}
                            selectGroup={selectGroup}
                            setSelectGroup={setSelectGroup}
                            isSelectAll={isSelectAll}
                            wrapperClassName={styles["plugin-group"]}
                        />
                        <YakModuleListHeard
                            onSelectAll={onSelectAll}
                            isSelectAll={isSelectAll}
                            total={total}
                            length={checkList.length}
                        />
                        <MITMPluginLocalList
                            height='calc(100% - 92px)'
                            onSubmitYakScriptId={onSubmitYakScriptId}
                            status={status}
                            checkList={checkList}
                            setCheckList={(list) => {
                                setCheckList(list)
                            }}
                            tags={tags}
                            setTags={setTags}
                            searchKeyword={searchKeyword}
                            triggerSearch={triggerSearch}
                            setIsSelectAll={setIsSelectAll}
                            isSelectAll={isSelectAll}
                            selectGroup={selectGroup}
                            setSelectGroup={setSelectGroup}
                            setTotal={setTotal}
                        />
                    </div>
                )
        }
    })
    return (
        <div className={styles["mitm-plugin-hijack-content"]}>
            <div className={styles["mitm-plugin-hijack-heard"]}>
                <div className={styles["mitm-plugin-hijack-heard-left"]}>
                    <YakitRadioButtons
                        buttonStyle='solid'
                        value={mode}
                        options={[
                            {label: "全部", value: "all"},
                            {label: "已启用", value: "loaded"},
                            {label: "热加载", value: "hot-patch"}
                        ]}
                        onChange={(e) => setMode(e.target.value)}
                    />
                </div>
                {onRenderHeardExtra()}
            </div>
            {onRenderContent()}
        </div>
    )
}
