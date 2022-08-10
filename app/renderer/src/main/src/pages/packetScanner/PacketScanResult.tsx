import React from "react";
import useHoldingIPCRStream from "@/hook/useHoldingIPCRStream";
import {PluginResultUI} from "@/pages/yakitStore/viewers/base";

export interface packetScanResultProp {
    token: string
}

export const packetScanResult: React.FC<packetScanResultProp> = (props) => {
    const {token} = props;

    const [infoState, {reset, setXtermRef}, xtermRef] = useHoldingIPCRStream("start-packet", "ExecPacketScan", token);

    return <PluginResultUI
        loading={false}
        progress={infoState.processState}
        results={infoState.messageState}
        featureType={infoState.featureTypeState}
        feature={infoState.featureMessageState}
        statusCards={infoState.statusState}
        onXtermRef={setXtermRef}
    >

    </PluginResultUI>
};