import React, {useEffect, useRef, useState} from "react"
import {Form, InputNumber} from "antd"
import {useMemoizedFn} from "ahooks"
import {failed, info, warn, yakitNotify} from "@/utils/notification"
import "./index.scss"
import {API} from "@/services/swagger/resposeType"
import {NetWorkApi} from "@/services/fetch"
import {useStore} from "@/store"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitRoute} from "@/enums/yakitRoute"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

const layout = {
    labelCol: {span: 5},
    wrapperCol: {span: 19}
}
const tailLayout = {
    wrapperCol: {offset: 5, span: 16}
}

const {ipcRenderer} = window.require("electron")

interface ShareImportProps {
    onClose: () => void
}

interface pwdRequestProps {
    share_id: string
    token: string
}

export function onImportShare(i18n) {
    const m = showYakitModal({
        title: i18n.language === "en" ? "Import Packet ID" : "导入数据包 ID",
        content: <ShareImport onClose={() => m.destroy()} />,
        footer: null
    })
}

export const ShareImport: React.FC<ShareImportProps> = (props) => {
    const {onClose} = props
    const {t, i18n} = useI18nNamespaces(["webFuzzer", "yakitUi", "yakitRoute"])
    const [loading, setLoading] = useState<boolean>(false)
    const [isShowPassword, setIsShowPassword] = useState<boolean>(false)
    // 全局监听登录状态
    const {userInfo} = useStore()
    const onFinish = useMemoizedFn((value) => {
        if (value.extract_code) {
            onShareExtract(value)
        } else {
            onExtractPwd(value)
        }
    })
    /**
     * @description 先进行密码验证
     */
    const onExtractPwd = useMemoizedFn((value) => {
        setLoading(true)
        const pwdRequest: pwdRequestProps = {
            share_id: value.share_id,
            token: userInfo.token
        }
        NetWorkApi<pwdRequestProps, boolean>({
            url: "module/extract/pwd",
            method: "get",
            params: {...pwdRequest}
        })
            .then((pwd) => {
                if (pwd) {
                    setIsShowPassword(true)
                    warn(t("ShareImport.shareNeedPassword"))
                    setTimeout(() => {
                        setLoading(false)
                    }, 200)
                } else {
                    onShareExtract(value)
                }
            })
            .catch((err) => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
                yakitNotify("error", t("ShareImport.passwordVerifyFailed") + err)
            })
    })
    /**
     * @description 获取分享数据
     */
    const onShareExtract = useMemoizedFn((value) => {
        if (userInfo.isLogin) {
            value.token = userInfo.token
        }
        setLoading(true)
        NetWorkApi<API.ShareResponse, API.ExtractResponse>({
            url: "module/extract",
            method: "post",
            data: value
        })
            .then((res) => {
                switch (res.module) {
                    case "fuzzer":
                        handleWebFuzzerShare(res)
                        break
                    case YakitRoute.HTTPHacker:
                    case YakitRoute.MITMHacker:
                    case YakitRoute.DB_HTTPHistory:
                        handleHttpHistoryShare(res)
                        break
                    default:
                        break
                }
            })
            .catch((err) => {
                yakitNotify("error", t("ShareImport.getShareDataFailed") + err)
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    })
    const handleWebFuzzerShare = useMemoizedFn((res: API.ExtractResponse) => {
        ipcRenderer
            .invoke("send-to-tab", {
                type: res.module,
                data: {
                    shareContent: res.extract_content
                }
            })
            .then(() => {
                onClose()
            })
            .catch((err) => {
                yakitNotify("error", t("ShareImport.openWebFuzzerFailed", {WebFuzzer: t("YakitRoute.WebFuzzer")}) + err)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    })
    const handleHttpHistoryShare = useMemoizedFn((res: API.ExtractResponse) => {
        ipcRenderer
            .invoke("HTTPFlowsExtract", {
                ShareExtractContent: res.extract_content
            })
            .then(() => {
                ipcRenderer
                    .invoke("send-to-tab", {
                        type: res.module
                    })
                    .then(() => {
                        setTimeout(() => {
                            ipcRenderer.invoke("send-positioning-http-history", {
                                activeTab: "history"
                            })
                        }, 200)
                    })
                onClose()
            })
            .catch((err) => {
                yakitNotify("error", t("ShareImport.saveHttpHistoryShareFailed") + err)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    })
    return (
        <>
            <Form {...layout} name='control-hooks' onFinish={onFinish} style={{padding: 24}}>
                <Form.Item
                    name='share_id'
                    label={t("ShareImport.shareId")}
                    rules={[{required: true, message: t("ShareImport.thisFieldIsRequired")}]}
                >
                    <YakitInput placeholder={t("ShareImport.pleaseEnterShareId")} />
                </Form.Item>
                {isShowPassword && (
                    <Form.Item
                        name='extract_code'
                        label={t("ShareImport.password")}
                        rules={[{required: true, message: t("ShareImport.thisFieldIsRequired")}]}
                    >
                        <YakitInput placeholder={t("ShareImport.pleaseEnterPassword")} allowClear />
                    </Form.Item>
                )}
                <Form.Item {...tailLayout}>
                    <YakitButton type='primary' htmlType='submit' className='btn-sure' loading={loading}>
                        {t("YakitButton.ok")}
                    </YakitButton>
                </Form.Item>
            </Form>
        </>
    )
}
