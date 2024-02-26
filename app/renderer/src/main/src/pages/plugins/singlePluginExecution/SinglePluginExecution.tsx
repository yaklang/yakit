import React, {useEffect, useState} from "react"
import {SinglePluginExecutionProps} from "./SinglePluginExecutionType"
import {useCreation, useMemoizedFn} from "ahooks"
import {PluginDetailsTab} from "../local/PluginsLocalDetail"
import {YakScript} from "@/pages/invoker/schema"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlinePencilaltIcon} from "@/assets/icon/outline"
import {apiGetYakScriptById, onToEditPlugin} from "../utils"

import styles from "./SinglePluginExecution.module.scss"

export const SinglePluginExecution: React.FC<SinglePluginExecutionProps> = React.memo((props) => {
    const {yakScriptId} = props
    const [loading, setLoading] = useState<boolean>(false)
    const [plugin, setPlugin] = useState<YakScript>()
    useEffect(() => {
        getPluginById()
    }, [yakScriptId])
    const getPluginById = useMemoizedFn(() => {
        setLoading(true)
        apiGetYakScriptById(yakScriptId)
            .then(setPlugin)
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    })
    const onEdit = useMemoizedFn((e) => {
        e.stopPropagation()
        if (!plugin) return
        onToEditPlugin(plugin)
    })
    const headExtraNode = useCreation(() => {
        return (
            <>
                <YakitButton type='text2' icon={<OutlinePencilaltIcon onClick={onEdit} />} />
            </>
        )
    }, [])
    if (!plugin) return null
    return (
        <>
            <PluginDetailsTab
                executorShow={!loading}
                plugin={plugin}
                headExtraNode={null}
                wrapperClassName={styles["single-plugin-execution-wrapper"]}
                hiddenLogIssue={true}
            />
        </>
    )
})