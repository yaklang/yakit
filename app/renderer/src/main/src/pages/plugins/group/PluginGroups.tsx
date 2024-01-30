import React, {useMemo, useRef, useState} from "react"
import {PluginLocalList} from "./PluginLocalList"
import {PluginOnlineList} from "./PluginOnlineList"
import {useStore} from "@/store"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {PluginOnlineGroupList} from "./PluginOnlineGroupList"
import {PluginLocalGroupList} from "./PluginLocalGroupList"
import styles from "./PluginGroups.module.scss"

interface PluginGroupsProps {}

export const PluginGroups: React.FC<PluginGroupsProps> = React.memo((props) => {
    const userInfo = useStore((s) => s.userInfo)
    const [pluginGroupType, setPluginGroupType] = useState<"online" | "local">("online")
    const pluginOnlineGroupListRef = useRef<any>()
    const pluginLocalGroupListRef = useRef<any>()

    // 判断是否是 管理员或者超级管理员权限
    const judgeOnlineStatus = useMemo(() => {
        const flag = ["admin", "superadmin"].includes(userInfo.role || "")
        // INFO 暂时默认本地
        setPluginGroupType(!flag ? "online" : "local")
        return flag
    }, [userInfo.role])

    return (
        <div className={styles["plugin-groups-wrapper"]}>
            {/* 左侧插件组 */}
            <div className={styles["plugin-groups-left-wrap"]}>
                <div className={styles["plugin-groups-left-header"]}>
                    <span className={styles["plugin-groups-left-header-text"]}>插件组管理</span>
                    {judgeOnlineStatus && (
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
                    )}
                    <span className={styles["plugin-groups-number"]}>
                        {pluginGroupType === "online"
                            ? pluginOnlineGroupListRef.current?.groupListLen || 0
                            : pluginLocalGroupListRef.current?.groupListLen || 0}
                    </span>
                </div>
                <div className={styles["plugin-groups-left-body"]}>
                    <div
                        style={{
                            display: pluginGroupType === "online" && judgeOnlineStatus ? "block" : "none",
                            height: "100%"
                        }}
                    >
                        <PluginOnlineGroupList ref={pluginOnlineGroupListRef}></PluginOnlineGroupList>
                    </div>
                    <div
                        style={{
                            display: pluginGroupType === "local" ? "block" : "none",
                            height: "100%"
                        }}
                    >
                        <PluginLocalGroupList ref={pluginLocalGroupListRef}></PluginLocalGroupList>
                    </div>
                </div>
            </div>
            {/* 右侧插件列表 */}
            <div className={styles["plugin-groups-right-wrap"]}>
                <div
                    style={{
                        display: pluginGroupType === "online" && judgeOnlineStatus ? "block" : "none",
                        height: "100%"
                    }}
                >
                    <PluginOnlineList></PluginOnlineList>
                </div>
                <div
                    style={{
                        display: pluginGroupType === "local" ? "block" : "none",
                        height: "100%"
                    }}
                >
                    <PluginLocalList></PluginLocalList>
                </div>
            </div>
        </div>
    )
})
