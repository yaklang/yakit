import React from "react";
import {WebShellTable} from "./WebShellTable";

export interface WebShellPageProp {}

export const WebShellPage: React.FC<WebShellPageProp> = (props) => {
    return <div style={{width: "100%", height: "100%", overflow: "hidden"}}>
        <WebShellTable/>
    </div>
};