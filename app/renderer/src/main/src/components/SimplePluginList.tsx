import React, {useEffect, useState} from "react";
import {QueryYakScriptRequest, YakScript} from "../pages/invoker/schema";
import {PluginList} from "./PluginList";
import {useDebounce, useGetState, useMemoizedFn} from "ahooks";
import {queryYakScriptList} from "../pages/yakitStore/network";

export interface SimplePluginListProp {
    readOnly?: boolean
    initialQuery?: QueryYakScriptRequest
    pluginTypes?: string
    initialSelected?: string[]
    onSelected?: (names: string[]) => any
    verbose?: string | any
    bordered?: boolean
    disabled?: boolean
}

export const SimplePluginList: React.FC<SimplePluginListProp> = React.memo((props) => {
    const [scripts, setScripts, getScripts] = useGetState<YakScript[]>([])
    const [total, setTotal] = useState(0)
    const [listNames, setListNames] = useState<string[]>([...(props.initialSelected || [])]);

    // const [params, setParams] = useState<{ ScriptNames: string[] }>({ScriptNames: [...props.initialSelected || []]})
    const [pluginLoading, setPluginLoading] = useState<boolean>(false)

    const allSelectYakScript = useMemoizedFn((flag: boolean) => {
        if (flag) {
            const newSelected = [...scripts.map((i) => i.ScriptName), ...listNames]
            setListNames([...newSelected.filter((e, index) => newSelected.indexOf(e) === index)])
        } else {
            setListNames([])
        }
    })
    const selectYakScript = useMemoizedFn((y: YakScript) => {
        listNames.push(y.ScriptName)
        setListNames([...listNames])
    })
    const unselectYakScript = useMemoizedFn((y: YakScript) => {
        const names = listNames.splice(listNames.indexOf(y.ScriptName), 1);
        setListNames([...listNames])
    })

    useEffect(() => {
        if (props.onSelected) {
            props.onSelected([...listNames])
        }
    }, [listNames])


    const search = useMemoizedFn((searchParams?: { limit: number; keyword: string }) => {
        const {limit, keyword} = searchParams || {}

        setPluginLoading(true)
        queryYakScriptList(
            props.pluginTypes ? props.pluginTypes : "",
            (data, total) => {
                setTotal(total || 0)
                setScripts(data)
                setListNames([...(data || []).filter(i => i.IsGeneralModule).map(i => i.ScriptName)])
            },
            () => setTimeout(() => setPluginLoading(false), 300),
            limit || 200,
            undefined,
            keyword || "",
            props.initialQuery,
        )
    })

    useEffect(() => {
        search()
    }, [useDebounce(props.initialQuery, {wait: 500})])

    return <PluginList
        readOnly={props.readOnly}
        bordered={props.bordered}
        loading={pluginLoading}
        lists={(scripts || []).sort((a: YakScript, b: YakScript) => {
            return (b.IsGeneralModule ? 1 : 0) - (a.IsGeneralModule ? 1 : 0)
        })}
        disabled={props.disabled}
        getLists={getScripts}
        total={total}
        selected={listNames}
        allSelectScript={allSelectYakScript}
        selectScript={selectYakScript}
        unSelectScript={unselectYakScript}
        search={search}
        title={props?.verbose || "选择插件"}
        bodyStyle={{
            padding: "0 4px",
            overflow: "hidden"
        }}
    />
});