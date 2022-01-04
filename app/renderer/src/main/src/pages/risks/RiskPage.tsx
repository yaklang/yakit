import React from "react";
import {PageHeader} from "antd";
import {RiskTable} from "./RiskTable";

export interface RiskPageProp {

}

export const RiskPage: React.FC<RiskPageProp> = (props) => {
    return <div>
        <RiskTable/>
    </div>
};