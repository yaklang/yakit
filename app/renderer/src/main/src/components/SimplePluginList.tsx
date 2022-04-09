import React, {useState} from "react";
import {QueryYakScriptRequest, YakScript} from "../pages/invoker/schema";
import {PluginList} from "./PluginList";
import {useGetState, useMemoizedFn} from "ahooks";
import {queryYakScriptList} from "../pages/yakitStore/network";

export interface SimplePluginListProp {
    filter?: QueryYakScriptRequest
}

export const SimplePluginList: React.FC<SimplePluginListProp> = (props) => {
    const [scripts, setScripts, getScripts] = useGetState<YakScript[]>([])
    const [loading, setLoading] = useState(false)
    const [total, setTotal] = useState(0)
    const [params, setParams] = useState<{ ScriptNames: string[] }>({ScriptNames: []})
    const [pluginLoading, setPluginLoading] = useState<boolean>(false)

    const allSelectYakScript = useMemoizedFn((flag: boolean) => {
        if (flag) {
            const newSelected = [...scripts.map((i) => i.ScriptName), ...params.ScriptNames]
            setParams({...params, ScriptNames: newSelected.filter((e, index) => newSelected.indexOf(e) === index)})
        } else {
            setParams({...params, ScriptNames: []})
        }
    })
    const selectYakScript = useMemoizedFn((y: YakScript) => {
        if (!params.ScriptNames.includes(y.ScriptName))
            setParams({...params, ScriptNames: [...params.ScriptNames, y.ScriptName]})
    })
    const unselectYakScript = useMemoizedFn((y: YakScript) => {
        setParams({...params, ScriptNames: params.ScriptNames.filter((i) => i !== y.ScriptName)})
    })


    const search = useMemoizedFn((searchParams?: { limit: number; keyword: string }) => {
        const {limit, keyword} = searchParams || {}

        setPluginLoading(true)
        queryYakScriptList(
            "port-scan",
            (data, total) => {
                setTotal(total || 0)
                setScripts(data)
                setParams({
                    ...params,
                    ScriptNames: (data || []).filter(i => i.IsGeneralModule).map(i => i.ScriptName)
                })
            },
            () => setTimeout(() => setPluginLoading(false), 300),
            limit || 200,
            undefined,
            keyword || ""
        )
    })

    return <PluginList
        loading={loading}
        lists={scripts}
        getLists={getScripts}
        total={total}
        selected={params.ScriptNames}
        allSelectScript={allSelectYakScript}
        selectScript={selectYakScript}
        unSelectScript={unselectYakScript}
        search={search}
        title={"端口扫描插件"}
        bodyStyle={{
            padding: "0 4px",
            overflow: "hidden"
        }}
    ></PluginList>
};