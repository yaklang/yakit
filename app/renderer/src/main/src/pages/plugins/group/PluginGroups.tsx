import React, {useMemo, useRef, useState} from "react"
import {PluginLocalList} from "./PluginLocalList"
import {PluginOnlineList} from "./PluginOnlineList"
import {useStore} from "@/store"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {PluginOnlineGroupList} from "./PluginOnlineGroupList"
import {PluginLocalGroupList} from "./PluginLocalGroupList"
import {GroupListItem} from "./PluginGroupList"
import {useInViewport} from "ahooks"
import {SolidQuestionmarkcircleIcon} from "@/assets/icon/solid"
import {Tooltip} from "antd"
import styles from "./PluginGroups.module.scss"

interface PluginGroupsProps {}

export const PluginGroups: React.FC<PluginGroupsProps> = React.memo((props) => {
    const userInfo = useStore((s) => s.userInfo)
    const pluginsGroupsRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(pluginsGroupsRef)
    const [pluginGroupType, setPluginGroupType] = useState<"online" | "local">("online")
    const [onlineGroupLen, setOnlineGroupLen] = useState<number>(0)
    const [localGroupLen, setLocalGroupLen] = useState<number>(0)
    const [activeLocalGroup, setActiveLocalGroup] = useState<GroupListItem>() // 当前选中本地插件组
    const [activeOnlineGroup, setActiveOnlineGroup] = useState<GroupListItem>() // 当前选中线上插件组

    // 判断是否是 管理员或者超级管理员权限
    const judgeOnlineStatus = useMemo(() => {
        const flag = ["admin", "superadmin"].includes(userInfo.role || "")
        setPluginGroupType(flag ? "online" : "local")
        return flag
    }, [userInfo.role])

    return (
        <div className={styles["plugin-groups-wrapper"]} ref={pluginsGroupsRef}>
            {/* 左侧插件组 */}
            <div className={styles["plugin-groups-left-wrap"]}>
                <div className={styles["plugin-groups-left-header"]}>
                    <span className={styles["plugin-groups-left-header-text"]}>插件组管理</span>
                    <Tooltip title='插件组只能管理除Yak和Codec类型以外的插件' placement='bottomLeft'>
                        <SolidQuestionmarkcircleIcon className={styles["pligin-group-mag-icon"]} />
                    </Tooltip>
                    {/* {judgeOnlineStatus && (
                        <YakitRadioButtons
                            style={{marginRight: 4}}
                            value={pluginGroupType}
                            onChange={(e) => setPluginGroupType(e.target.value)}
                            buttonStyle='solid'
                            options={[
                                {
                                    value: "online",
                                    label: "线上"
                                },
                                {
                                    value: "local",
                                    label: "本地"
                                }
                            ]}
                            size={"small"}
                        />
                    )} */}
                    <span className={styles["plugin-groups-number"]}>
                        {pluginGroupType === "online" ? onlineGroupLen : localGroupLen}
                    </span>
                </div>
                <div className={styles["plugin-groups-left-body"]}>
                    <div
                        style={{
                            display: pluginGroupType === "online" ? "block" : "none",
                            height: "100%"
                        }}
                    >
                        {/* {judgeOnlineStatus && (
                            <PluginOnlineGroupList
                                pluginsGroupsInViewport={inViewport}
                                onOnlineGroupLen={setOnlineGroupLen}
                                activeOnlineGroup={activeOnlineGroup}
                                onActiveGroup={setActiveOnlineGroup}
                            ></PluginOnlineGroupList>
                        )} */}
                    </div>
                    <div
                        style={{
                            display: pluginGroupType === "local" ? "block" : "none",
                            height: "100%"
                        }}
                    >
                        <PluginLocalGroupList
                            pluginsGroupsInViewport={inViewport}
                            onLocalGroupLen={setLocalGroupLen}
                            activeLocalGroup={activeLocalGroup}
                            onActiveGroup={setActiveLocalGroup}
                        ></PluginLocalGroupList>
                    </div>
                </div>
            </div>
            {/* 右侧插件列表 */}
            <div className={styles["plugin-groups-right-wrap"]}>
                <div
                    style={{
                        display: pluginGroupType === "online" ? "block" : "none",
                        height: "100%"
                    }}
                >
                    {/* {judgeOnlineStatus && activeOnlineGroup && (
                        <PluginOnlineList
                            pluginsGroupsInViewport={inViewport}
                            activeGroup={activeOnlineGroup}
                        ></PluginOnlineList>
                    )} */}
                </div>
                <div
                    style={{
                        display: pluginGroupType === "local" ? "block" : "none",
                        height: "100%"
                    }}
                >
                    {activeLocalGroup && (
                        <PluginLocalList
                            pluginsGroupsInViewport={inViewport}
                            activeGroup={activeLocalGroup}
                        ></PluginLocalList>
                    )}
                </div>
            </div>
        </div>
    )
})
