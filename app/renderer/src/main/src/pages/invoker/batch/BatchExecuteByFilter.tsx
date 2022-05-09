import React, {useEffect, useState} from "react";
import {AutoCard} from "../../../components/AutoCard";
import {QueryYakScriptParamProp, SimpleQueryYakScriptSchema} from "./QueryYakScriptParam";
import {genDefaultPagination, QueryYakScriptRequest, QueryYakScriptsResponse} from "../schema";
import {showModal} from "../../../utils/showModal";
import {YakEditor} from "../../../utils/editors";
import {useDebounce} from "ahooks";

const {ipcRenderer} = window.require("electron");

export interface BatchExecuteByFilterProp {
    simpleQuery: SimpleQueryYakScriptSchema
}

const simpleQueryToFull = (i: SimpleQueryYakScriptSchema): QueryYakScriptRequest => {
    const result = {
        Pagination: genDefaultPagination(1),
        Type: i.type,
        ExcludeNucleiWorkflow: true,
        ExcludeScriptNames: i.exclude,
        IncludedScriptNames: i.include,
        Tag: i.tags.split(","),
        NoResultReturn: false,
    }
    if (i.include.length === 0 && i.exclude.length === 0 && i.tags === "") {
        result.NoResultReturn = true
        return result
    }

    return result
}

export const BatchExecuteByFilter: React.FC<BatchExecuteByFilterProp> = React.memo((props) => {

    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true)
        const result = simpleQueryToFull(props.simpleQuery);
        ipcRenderer.invoke("QueryYakScript", result).then((data: QueryYakScriptsResponse) => {
            setTotal(data.Total)
        }).catch(e => {
            console.info()
        }).finally(() => setTimeout(() => setLoading(false), 300))
    }, [useDebounce(props.simpleQuery, {wait: 500})])

    return <AutoCard title={`当前已选：${total}`} loading={loading} extra={<a href="#" onClick={() => {
        try {
            const raw = JSON.stringify(props.simpleQuery);
            showModal({
                title: "JSON", content: (
                    <>
                        <YakEditor readOnly={true} value={raw}/>
                    </>
                ), width: "50%"
            })
        } catch (e) {

        }
    }}>
        Config
    </a>}>

    </AutoCard>
});