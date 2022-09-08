import React, {useEffect} from "react";
import useHoldingIPCRStream from "@/hook/useHoldingIPCRStream";
import {PluginResultUI} from "@/pages/yakitStore/viewers/base";

export interface PacketScanResultProp {
    token: string
}

export const PacketScanResult: React.FC<PacketScanResultProp> = (props) => {
    const {token} = props;

    const [infoState, {reset, setXtermRef}, xtermRef] = useHoldingIPCRStream("start-packet", "ExecPacketScan", token);

    return <PluginResultUI
        loading={false}
        progress={infoState.processState}
        results={infoState.messageState}
        risks={infoState.riskState}
        featureType={infoState.featureTypeState}
        feature={infoState.featureMessageState}
        statusCards={infoState.statusState}
        onXtermRef={setXtermRef}
    />
};