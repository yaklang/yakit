import React, {useEffect, useState} from "react"
import {ResizeBox} from "../../../components/ResizeBox"
import {QueryYakScriptParamSelector, SimpleQueryYakScriptSchema} from "./QueryYakScriptParam"
import {BatchExecuteByFilter, NewTaskHistoryProps} from "./BatchExecuteByFilter"
import { FieldName, Fields } from "../../risks/RiskTable"
import { useMemoizedFn } from "ahooks"

const {ipcRenderer} = window.require("electron");

export interface BatchExecutorPageExProp {}

export const BatchExecutorPageEx: React.FC<BatchExecutorPageExProp> = (props) => {
    const [simpleQuery, setSimpleQuery] = useState<SimpleQueryYakScriptSchema>({
        exclude: [],
        include: [],
        tags: "",
        type: "mitm,port-scan,nuclei"
    })
    const [loading, setLoading] = useState<boolean>(false)
    const [allTag, setAllTag] = useState<FieldName[]>([])
    const [isAll, setIsAll] = useState<boolean>(false)
    const [historyTask, setHistoryTask] = useState<string>("")

    useEffect(() => updateAllTag(), [])

    const updateAllTag = () => {
        setLoading(true)
        ipcRenderer.invoke("GetAvailableYakScriptTags", {}).then((data: Fields) => {
            if(data && data.Values) setAllTag(data.Values)
        }).catch(e => console.info(e))
        .finally(() => setTimeout(() => setLoading(false), 300))
    }

    const executeHistory = useMemoizedFn((info: NewTaskHistoryProps) => {
        setLoading(true)
        setSimpleQuery(info.simpleQuery)
        setIsAll(info.isAll)
        setHistoryTask(info.simpleQuery.tags)
        setTimeout(() => setLoading(false), 300);
    })

    return (
        <ResizeBox
            firstNode={
                <>
                    <QueryYakScriptParamSelector
                        params={simpleQuery}
                        onParams={(param) => {
                            setSimpleQuery({...param})
                        }}
                        loading={loading}
                        allTag={allTag}
                        onAllTag={updateAllTag}
                        isAll={isAll}
                        onIsAll={setIsAll}
                        historyTask={historyTask}
                    />
                </>
            }
            firstMinSize={300}
            firstRatio={"300px"}
            secondNode={<BatchExecuteByFilter 
                simpleQuery={simpleQuery} 
                allTag={allTag} 
                isAll={isAll}
                executeHistory={executeHistory}
            />}
        ></ResizeBox>
    )
}
