import React, {useEffect, useState} from "react";
import {failed, info} from "../../../utils/notification";
import {MenuItem} from "../../MainOperator";
import {QueryYakScriptParamSelector, SimpleQueryYakScriptSchema} from "./QueryYakScriptParam";
import {ResizeBox} from "../../../components/ResizeBox";
import {BatchExecuteByFilter, simpleQueryToFull} from "./BatchExecuteByFilter";
import {SimplePluginList} from "../../../components/SimplePluginList";
import {AutoCard} from "../../../components/AutoCard";

export interface ReadOnlyBatchExecutorByMenuItemProp {
    MenuItemId: number
}

const {ipcRenderer} = window.require("electron");

export const ReadOnlyBatchExecutorByMenuItem: React.FC<ReadOnlyBatchExecutorByMenuItemProp> = (props) => {
    const [query, setQuery] = useState<SimpleQueryYakScriptSchema>({
        exclude: [],
        include: [],
        tags: "",
        type: "mitm,port-scan,nuclei"
    });

    useEffect(() => {
        if (props.MenuItemId <= 0) {
            info("加载批量执行脚本失败")
            return
        }
        ipcRenderer.invoke("GetMenuItemById", {ID: props.MenuItemId}).then((i: MenuItem) => {
            if (i.Query) {
                setQuery(i.Query)
            }
        })
    }, [props.MenuItemId])

    return <AutoCard size={"small"} bordered={false} bodyStyle={{paddingLeft: 0, paddingRight: 0, paddingTop: 4}}>
        <ResizeBox
            firstNode={
                <div style={{height: "100%"}}>
                    <SimplePluginList
                        verbose={"本项包含检测列表"}
                        key={`batch:menu-item:${props.MenuItemId}`}
                        pluginTypes={query.type}
                        readOnly={true}
                        initialQuery={{
                            ...simpleQueryToFull(false, query, []),
                            Pagination: {Limit: 10000, Page: 1, Order: "updated_at", OrderBy: "desc"},
                        }}
                    />
                </div>

            }
            firstMinSize={300}
            firstRatio={"300px"}
            secondNode={<BatchExecuteByFilter
                simpleQuery={query}
                allTag={[]}
                isAll={false}
                executeHistory={(i) => {
                    setQuery(i.simpleQuery)
                }}
            />}
        />
    </AutoCard>
};