import { YakScriptFormContent } from "@/pages/invoker/YakScriptCreator"
import { Route } from "@/routes/routeSpec"
import { Card } from "antd"
import React, { useEffect, useState } from "react"
import { useCreation, useGetState, useMemoizedFn } from "ahooks"
import './YakitPluginJournalDetails.scss'
import { YakScript } from "@/pages/invoker/schema"

const { ipcRenderer } = window.require("electron")

interface YakitPluginJournalDetailsProps {
    YakitPluginJournalDetailsId: number
}

const defParams = {
    Content: "yakit.AutoInitYakit()\n\n# Input your code!\n\n",
    Tags: "",
    Author: "",
    Level: "",
    IsHistory: false,
    IsIgnore: false,
    CreatedAt: 0,
    Help: "",
    Id: 0,
    Params: [],
    ScriptName: "",
    Type: "yak",
    IsGeneralModule: false,
    PluginSelectorTypes: "mitm,port-scan",
    UserId: 0,
    OnlineId: 0,
    OnlineScriptName: "",
    OnlineContributors: "",
    GeneralModuleVerbose: "",
    GeneralModuleKey: "",
    FromGit: "",
    UUID: ""
}


export const YakitPluginJournalDetails: React.FC<YakitPluginJournalDetailsProps> = (props) => {
    const { YakitPluginJournalDetailsId } = props;
    const [params, setParams, getParams] = useGetState<YakScript>(defParams)
    return (
        <div>
            <Card title="修改详情" bordered={false}>
                <YakScriptFormContent params={params} setParams={setParams} />
            </Card>
        </div>
    )
}
