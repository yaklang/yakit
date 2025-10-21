import React, {useEffect, useState} from "react"
import {AIFileSystemListProps} from "./type"
import {useCreation} from "ahooks"
import {LocalPluginLog} from "@/pages/plugins/operator/pluginExecuteResult/LocalPluginLog"

export const AIFileSystemList: React.FC<AIFileSystemListProps> = React.memo((props) => {
    const {execFileRecord} = props
    const list = useCreation(() => {
        return Array.from(execFileRecord.values())
            .flat()
            .sort((a, b) => b.order - a.order)
    }, [execFileRecord])
    return (
        <>
            <LocalPluginLog loading={false} list={list} />
        </>
    )
})
