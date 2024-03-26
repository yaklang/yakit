import React from "react"
import {YakScript} from "./schema"
import {PluginResultUI} from "../yakitStore/viewers/base"
import {InfoState} from "../../hook/useHoldingIPCRStream"

export interface DefaultPluginResultUIProp {
    infoState: InfoState
    loading: boolean
    script?: YakScript
}

export const DefaultPluginResultUI: React.FC<DefaultPluginResultUIProp> = (props) => {
    const {script, infoState, loading} = props;

    return <div style={{width: "100%", height: "100%"}}>
        <PluginResultUI
            script={script}
            results={infoState.messageState}
            statusCards={infoState.statusState}
            risks={infoState.riskState}
            featureType={infoState.featureTypeState}
            progress={infoState.processState}
            feature={infoState.featureMessageState}
            loading={loading}
            cardStyleType={1}
        />
    </div>
};
