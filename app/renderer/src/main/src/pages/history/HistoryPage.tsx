import React from "react";
import {HTTPFlowTable} from "../../components/HTTPFlowTable/HTTPFlowTable";

export interface HistoryPageProp {

}

export const HistoryPage: React.FC<HistoryPageProp> = (props) => {
    return <div style={{margin: 8}}>
        <HTTPFlowTable
        />
    </div>
};