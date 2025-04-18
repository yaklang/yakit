import React from "react"
import {genDefaultPagination} from "../invoker/schema"
import {HTTPFlowMiniTable} from "../../components/HTTPFlowMiniTable"
import {MITMPluginListProp} from "./MITMServerHijacking/MITMPluginLocalList"

export interface MITMPluginCardProp extends MITMPluginListProp {}

export const MITMHTTPFlowMiniTableCard: React.FC<MITMPluginCardProp> = React.memo((props) => {
    return (
        <div style={{height: "100%"}}>
            <div style={{height: "100%", overflow: "hidden"}}>
                <HTTPFlowMiniTable
                    onTotal={() => {}}
                    simple={true}
                    filter={{
                        SearchURL: "",
                        SourceType: "mitm",
                        Pagination: {...genDefaultPagination(), Page: 1, Limit: 20}
                    }}
                    source={""}
                    autoUpdate={true}
                />
            </div>
        </div>
    )
})
