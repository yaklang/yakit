import React from "react";
import {HTTPFlow} from "@/components/HTTPFlowTable/HTTPFlowTable";
import {showModal} from "@/utils/showModal";
import {Alert, Button, Space} from "antd";
import {failed} from "@/utils/notification";
import {CopyableField} from "@/utils/inputUtil";
import {openExternalWebsite} from "@/utils/openWebsite";
import i18n from "@/i18n/i18n";

const {ipcRenderer} = window.require("electron");

export const showResponseViaHTTPFlowID = (v: HTTPFlow) => {
    showResponse(v, undefined, true)
}

export const showResponseViaResponseRaw = (v: Uint8Array, url?: string) => {
    showResponse(v, url, true)
}

const showResponse = (v: HTTPFlow | Uint8Array | string, url?: string, noConfirm?: boolean) => {
    let params: {
        HTTPFlowID?: number
        Url?: string,
        HTTPResponse?: Uint8Array
    } = {
        Url: url,
    };
    const t = i18n.getFixedT(null, "layout")

    try {
        if (typeof v === 'object' && ("Id" in v)) {
            params.HTTPFlowID = (v as HTTPFlow).Id
        } else {
            params.HTTPResponse = v as Uint8Array
        }
    } catch (e) {
        failed(t("ShowInBrowser.buildParamsFailed"))
        return
    }

    ipcRenderer.invoke("RegisterFacadesHTTP", params).then((res: { FacadesUrl: string }) => {
        if (!!noConfirm) {
            openExternalWebsite(res.FacadesUrl)
            return
        }

        let m = showModal({
            title: t("ShowInBrowser.confirmOpenTitle"),
            width: "50%",
            content: (
                <Space direction={"vertical"} style={{maxWidth:"100%"}}>
                    <Alert type={"info"} message={t("ShowInBrowser.infoMessage")}/>
                    <CopyableField text={res.FacadesUrl} mark={true} />
                    <Button onClick={() => {
                        m.destroy()
                        openExternalWebsite(res.FacadesUrl)
                    }} type={"primary"}>{t("ShowInBrowser.confirmOpen")}</Button>
                </Space>
            )
        })
    }).catch(e => {
        failed(t("ShowInBrowser.showResponseFailed", {error: String(e)}))
    })
}
