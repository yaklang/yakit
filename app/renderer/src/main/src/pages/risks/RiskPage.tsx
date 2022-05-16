import React from "react";
import {RiskTable} from "./RiskTable";

export interface RiskPageProp {}

export const RiskPage: React.FC<RiskPageProp> = (props) => {
    return <div style={{width: "100%", height: "100%", overflow: "hidden"}}>
        <RiskTable/>
    </div>
};