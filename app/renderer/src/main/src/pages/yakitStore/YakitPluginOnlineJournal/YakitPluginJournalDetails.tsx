import { YakScriptCreatorForm } from "@/pages/invoker/YakScriptCreator"
import { Route } from "@/routes/routeSpec"
import { Card } from "antd"
import React, { useEffect, useState } from "react"
import './YakitPluginJournalDetails.scss'

const { ipcRenderer } = window.require("electron")

interface YakitPluginJournalDetailsProps {
    YakitPluginJournalDetailsId: number
}

export const YakitPluginJournalDetails: React.FC<YakitPluginJournalDetailsProps> = (props) => {
    const { YakitPluginJournalDetailsId } = props
    return (
        <div>
            <Card title="修改详情" bordered={false}>
                <YakScriptCreatorForm />
            </Card>
        </div>
    )
}
