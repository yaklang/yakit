import React, {useState, useRef, useEffect} from "react"
import {useDebounceFn, useMemoizedFn} from "ahooks"
import {OutlineShareIcon, OutlineExportIcon, OutlineImportIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {onImportShare} from "@/pages/fuzzer/components/ShareImport"
import styles from "./index.module.scss"
import {useStore} from "@/store"
import {success, yakitNotify, yakitFailed, warn} from "@/utils/notification"
import CopyToClipboard from "react-copy-to-clipboard"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {CopyComponents} from "@/components/yakitUI/YakitTag/YakitTag"
import {HTTPFlowsShareRequest, HTTPFlowsShareResponse, ShareDataProps} from "./shareDataType"
import {isCommunityEdition} from "@/utils/envfile"
import {saveABSFileAnotherOpen} from "@/utils/openWebsite"
import {Uint8ArrayToString, StringToUint8Array} from "@/utils/str"
import {NewHTTPPacketEditor} from "@/utils/editors"
import {YakitRoute} from "@/enums/yakitRoute"
import {FuzzerRequestProps} from "../../HTTPFuzzerPage"
import {AdvancedConfigValueProps} from "../../HttpQueryAdvancedConfig/HttpQueryAdvancedConfigType"
import emiter from "@/utils/eventBus/eventBus"
import {randomString} from "@/utils/randomUtil"
import {generateGroupId} from "@/pages/layout/mainOperatorContent/MainOperatorContent"
import {MultipleNodeInfo} from "@/pages/layout/mainOperatorContent/MainOperatorContentType"
import {defaultAdvancedConfigValue, DefFuzzerTableMaxData} from "@/defaultConstants/HTTPFuzzerPage"
import {FuncBtn} from "@/pages/plugins/funcTemplate"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import i18n from "@/i18n/i18n"
import {handleOpenFileSystemDialog} from "@/utils/fileSystemDialog"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
const {ipcRenderer} = window.require("electron")

const toFuzzerAdvancedConfigValue = (value: FuzzerRequestProps) => {
    const resProps: AdvancedConfigValueProps = {
        isHttps: value.IsHTTPS,
        isGmTLS: value.IsGmTLS,
        randomJA3: value.RandomJA3,
        actualHost: value.ActualAddr,
        maxBodySize: value.MaxBodySize,
        proxy: value.Proxy ? value.Proxy.split(",") : [],
        noSystemProxy: value.NoSystemProxy,
        disableUseConnPool: value.DisableUseConnPool,
        disableHotPatch: value.DisableHotPatch,
        resNumlimit: DefFuzzerTableMaxData,
        fuzzTagMode: value.FuzzTagMode,
        sNI: value.SNI,
        overwriteSNI: value.OverwriteSNI === false ? "auto" : value.SNI ? "mandatory" : "clear",
        fuzzTagSyncIndex: value.FuzzTagSyncIndex,
        noFixContentLength: value.NoFixContentLength,
        dialTimeoutSeconds: value.DialTimeoutSeconds,
        timeout: value.PerRequestTimeoutSeconds,
        batchTarget: value.BatchTarget || new Uint8Array(),
        repeatTimes: value.RepeatTimes,
        concurrent: value.Concurrent,
        minDelaySeconds: value.DelayMinSeconds,
        maxDelaySeconds: value.DelayMaxSeconds,
        maxRetryTimes: value.MaxRetryTimes,
        retryWaitSeconds: value.RetryWaitSeconds,
        retryMaxWaitSeconds: value.RetryMaxWaitSeconds,
        retry: !!value.RetryInStatusCode,
        retryConfiguration: {
            statusCode: value.RetryInStatusCode,
            keyWord: ""
        },
        noRetry: !!value.RetryNotInStatusCode,
        noRetryConfiguration: {
            statusCode: value.RetryNotInStatusCode,
            keyWord: ""
        },
        noFollowRedirect: value.NoFollowRedirect,
        redirectCount: value.RedirectTimes,
        followJSRedirect: value.FollowJSRedirect,
        dnsServers: value.DNSServers,
        etcHosts: value.EtcHosts,
        matchers: value.Matchers,
        extractors: value.Extractors,
        params: value.Params,
        cookie: value.MutateMethods.find((item) => item.Type === "Cookie")?.Value || [{Key: "", Value: ""}],
        headers: value.MutateMethods.find((item) => item.Type === "Headers")?.Value || [{Key: "", Value: ""}],
        methodGet: value.MutateMethods.find((item) => item.Type === "Get")?.Value || [{Key: "", Value: ""}],
        methodPost: value.MutateMethods.find((item) => item.Type === "Post")?.Value || [{Key: "", Value: ""}],
        inheritCookies: value.InheritCookies,
        inheritVariables: value.InheritVariables,
        enableRandomChunked: !!value.EnableRandomChunked,
        randomChunkedMinLength: value.RandomChunkedMinLength || defaultAdvancedConfigValue.randomChunkedMinLength,
        randomChunkedMaxLength: value.RandomChunkedMaxLength || defaultAdvancedConfigValue.randomChunkedMaxLength,
        randomChunkedMinDelay: value.RandomChunkedMinDelay || defaultAdvancedConfigValue.randomChunkedMinDelay,
        randomChunkedMaxDelay: value.RandomChunkedMaxDelay || defaultAdvancedConfigValue.randomChunkedMaxDelay
    }
    return resProps
}

export const ShareImportExportData: React.FC<ShareDataProps> = ({
    supportShare = true,
    supportExport = true,
    supportImport = true,
    getShareContent = () => {},
    module,
    getFuzzerRequestParams
}) => {
    const {t, i18n} = useI18nNamespaces(["webFuzzer", "yakitUi"])
    const yamlContRef = useRef<string>("")

    // 分享
    const handleShare = useMemoizedFn(() => {
        getShareContent((content) => {
            const m = showYakitModal({
                title: t("ShareImportExportData.sharePacketId"),
                content: <ShareModal module={module} shareContent={JSON.stringify(content)} />,
                footer: null
            })
        })
    })

    // 导出
    const handlExport = useMemoizedFn((e: {clientX: number; clientY: number}) => {
        showByRightContext(
            {
                width: 150,
                data: [
                    {key: "pathTemplate", label: t("ShareImportExportData.exportAsPathTemplate")},
                    {key: "rawTemplate", label: t("ShareImportExportData.exportAsRawTemplate")}
                ],
                onClick: ({key}) => {
                    switch (key) {
                        case "pathTemplate":
                            onExportToYaml("path")
                            break
                        case "rawTemplate":
                            onExportToYaml("raw")
                            break
                        default:
                            break
                    }
                }
            },
            e.clientX,
            e.clientY
        )
    })
    const onExportToYaml = async (tempType: "path" | "raw") => {
        const requests = getFuzzerRequestParams()
        const params = {
            Requests: {Requests: Array.isArray(requests) ? requests : [getFuzzerRequestParams()]},
            TemplateType: tempType
        }
        try {
            const {Status, YamlContent}: {Status: {Ok: boolean; Reason: string}; YamlContent: string} =
                await ipcRenderer.invoke("ExportHTTPFuzzerTaskToYaml", params)
            if (Status.Ok) {
                if (!!Status.Reason) {
                    Status.Reason.split("\n").forEach((msg) => {
                        warn(msg)
                    })
                }
                await saveABSFileAnotherOpen({
                    name: tempType + "-temp.yaml",
                    data: YamlContent,
                    successMsg: t("ShareImportExportData.exportYamlSuccess"),
                    errorMsg: ""
                })
            } else {
                throw new Error(Status.Reason)
            }
        } catch (error) {
            yakitFailed(error + "")
        }
    }

    // 导入
    const handlImport = useMemoizedFn((e: {clientX: number; clientY: number}) => {
        showByRightContext(
            {
                width: 150,
                data: [
                    {key: "dataPacketId", label: t("ShareImportExportData.importPacketId")},
                    {key: "yamlDocument", label: t("ShareImportExportData.importYamlFile")}
                ],
                onClick: ({key}) => {
                    switch (key) {
                        case "dataPacketId":
                            onImportShare(i18n)
                            break
                        case "yamlDocument":
                            onOpenImportYamlPop()
                            break
                        default:
                            break
                    }
                }
            },
            e.clientX,
            e.clientY
        )
    })

    const onOpenImportYamlPop = useMemoizedFn(() => {
        yamlContRef.current = ""
        const m = showYakitModal({
            type: "white",
            title: (
                <div className={styles.importYamlPopTitle}>
                    {t("ShareImportExportData.importYamlFile")}
                    <span className={styles.importText}>
                        {t("YakitDraggerContent.drag_file_tip")}
                        <YakitButton type='text' onClick={onOpenSystemDialog} style={{fontSize: 14}}>
                            {t("YakitDraggerContent.click_here")}
                        </YakitButton>
                        {t("ShareImportExportData.uploadOrPasteCode")}
                    </span>
                </div>
            ),
            onOkText: t("YakitButton.import"),
            width: 800,
            content: <MultimodeImportYaml readYamlContent={readYamlContent} />,
            onCancel: (e) => {
                m.destroy()
            },
            onOk: (e) => {
                if (yamlContRef.current) {
                    execImportYaml()
                    m.destroy()
                } else {
                    yakitNotify("info", t("ShareImportExportData.pleaseSelectOrPasteFile"))
                }
            }
        })
    })

    const onOpenSystemDialog = async () => {
        try {
            const {canceled, filePaths} = await handleOpenFileSystemDialog({
                title: t("YakitFormDragger.selectFile"),
                properties: ["openFile"]
            })
            if (canceled) return
            if (filePaths.length) {
                let absolutePath = filePaths[0].replace(/\\/g, "\\")
                readYamlContent(absolutePath)
            } else {
                throw new Error(t("ShareImportExportData.getPathFailed"))
            }
        } catch (error) {
            yakitFailed(error + "")
        }
    }

    const readYamlContent = useMemoizedFn(async (absolutePath: string) => {
        try {
            const yamlContent = await ipcRenderer.invoke("fetch-file-content", absolutePath)
            emiter.emit("onImportYamlPopEditorContent", yamlContent)
        } catch (error) {
            yakitFailed(error + "")
        }
    })

    const execImportYaml = async () => {
        try {
            const {Status, Requests}: {Status: {Ok: boolean; Reason: string}; Requests: any} = await ipcRenderer.invoke(
                "ImportHTTPFuzzerTaskFromYaml",
                {
                    YamlContent: yamlContRef.current
                }
            )
            if (Status.Ok) {
                if (!!Status.Reason) {
                    Status.Reason.split("\n").forEach((msg) => {
                        warn(msg)
                    })
                }
                if (Requests.Requests.length === 1) {
                    const params = Requests.Requests[0]
                    await ipcRenderer.invoke("send-to-tab", {
                        type: "fuzzer",
                        data: {
                            isCache: false,
                            request: Uint8ArrayToString(params.RequestRaw),
                            advancedConfigValue: toFuzzerAdvancedConfigValue(params)
                        }
                    })
                } else {
                    assemblyFuzzerSequenceData(Requests.Requests)
                }
            } else {
                throw new Error(Status.Reason)
            }
        } catch (error) {
            yakitFailed(error + "")
        }
    }

    // 序列导出组装数据
    const assemblyFuzzerSequenceData = (Requests: FuzzerRequestProps[]) => {
        // 组装菜单组信息
        const groupId = generateGroupId()
        const groupChildren: MultipleNodeInfo[] = []
        Requests.forEach((item, index) => {
            const time = (new Date().getTime() + index).toString()
            const tabId = `httpFuzzer-[${randomString(6)}]-${time}`
            const childItem: MultipleNodeInfo = {
                groupChildren: [],
                groupId,
                id: tabId,
                pageParams: {
                    id: tabId,
                    advancedConfigValue: toFuzzerAdvancedConfigValue(item),
                    request: Uint8ArrayToString(item.RequestRaw)
                },
                sortFieId: index + 1,
                verbose: `WF-[${index + 1}]`
            }
            groupChildren.push(childItem)
        })

        // verbose sortFieId color 已发送事件到MainOperatorContent组装
        const groupItem = {
            groupChildren,
            groupId: "0",
            id: groupId,
            sortFieId: 999,
            expand: true,
            verbose: "",
            color: ""
        }
        emiter.emit("onFuzzerSequenceImportUpdateMenu", JSON.stringify(groupItem))
    }

    useEffect(() => {
        const editorContentChange = (yamlContent: string) => {
            yamlContRef.current = yamlContent
        }
        emiter.on("onImportYamlEditorChange", editorContentChange)
        return () => {
            emiter.off("onImportYamlEditorChange", editorContentChange)
        }
    }, [])

    return (
        <>
            {supportShare && (
                <FuncBtn
                    maxWidth={1600}
                    type='outline2'
                    icon={<OutlineShareIcon />}
                    onClick={handleShare}
                    name={t("YakitButton.share")}
                    style={{marginRight: 8}}
                />
            )}
            {supportExport && (
                <FuncBtn
                    maxWidth={1600}
                    type='outline2'
                    icon={<OutlineExportIcon />}
                    style={{marginRight: 8}}
                    onClick={handlExport}
                    name={t("YakitButton.export")}
                    onContextMenuCapture={handlExport}
                />
            )}
            {supportImport && (
                <FuncBtn
                    maxWidth={1600}
                    type='outline2'
                    icon={<OutlineImportIcon />}
                    onClick={handlImport}
                    name={t("YakitButton.import")}
                    onContextMenuCapture={handlImport}
                />
            )}
        </>
    )
}

interface MultimodeImportYamlProp {
    readYamlContent: (absolutePath: string) => Promise<void>
}

const MultimodeImportYaml: React.FC<MultimodeImportYamlProp> = React.memo(({readYamlContent}) => {
    const {t, i18n} = useI18nNamespaces(["webFuzzer"])
    const multimodeImportYamlRef = useRef<any>()
    const [yamlContent, setYamlCont] = useState<string>("")

    useEffect(() => {
        const updateYamlContent = (cont: string) => {
            setYamlCont(cont)
            editorContChange(cont)
        }
        emiter.on("onImportYamlPopEditorContent", updateYamlContent)
        return () => {
            emiter.off("onImportYamlPopEditorContent", updateYamlContent)
        }
    }, [])

    useEffect(() => {
        const multimodeImportYamlDom = multimodeImportYamlRef.current
        // 阻止默认的拖放行为
        const handleDragover = (event: DragEvent) => {
            event.preventDefault()
        }
        multimodeImportYamlDom.addEventListener("dragover", handleDragover)
        // 处理文件拖放事件
        const handleDrap = (event: DragEvent) => {
            event.preventDefault()
            const file = event.dataTransfer?.files[0] as any
            const name = file?.name || ""
            const suffix = name.slice(name.lastIndexOf("."), name.length)
            if (![".yaml"].includes(suffix)) {
                yakitNotify("warning", t("MultimodeImportYaml.uploadFileFormatError"))
                return
            }
            readYamlContent(file?.path)
        }
        multimodeImportYamlDom.addEventListener("drop", handleDrap)
        return () => {
            setYamlCont("")
            multimodeImportYamlDom.removeEventListener("drop", handleDrap)
            multimodeImportYamlDom.addEventListener("dragover", handleDragover)
        }
    }, [])

    const editorContChange = useDebounceFn(
        (count) => {
            emiter.emit("onImportYamlEditorChange", count)
        },
        {wait: 100}
    ).run

    return (
        <div className={styles.multimodeImportYaml} ref={multimodeImportYamlRef}>
            <YakitEditor key={yamlContent} value={yamlContent} setValue={editorContChange} type='yaml'></YakitEditor>
        </div>
    )
})

interface ShareModalProps {
    module: string
    shareContent: string
}
export const ShareModal: React.FC<ShareModalProps> = React.memo((props) => {
    const {module, shareContent} = props
    const {t, i18n} = useI18nNamespaces(["webFuzzer", "yakitUi"])
    const [expiredTime, setExpiredTime] = useState<number>(15)
    const [pwd, setPwd] = useState<boolean>(false)
    const [shareNumber, setShareNumber] = useState<boolean>(false)
    const [limit_num, setLimit_num] = useState<number>(1)
    const [shareResData, setShareResData] = useState<API.ShareResponse>({
        share_id: "",
        extract_code: ""
    })

    const [shareLoading, setShareLoading] = useState<boolean>(false)
    const {userInfo} = useStore()
    /**
     * @description 一般分享，无特殊处理情况，例如web Fuzzer
     */
    const onShareOrdinary = useMemoizedFn(() => {
        const params: API.ShareRequest = {
            expired_time: expiredTime,
            share_content: shareContent,
            module,
            pwd,
            token: userInfo.token
        }
        if (shareNumber) {
            params.limit_num = limit_num
        }
        if (shareResData.share_id) {
            params.share_id = shareResData.share_id
        }

        setShareLoading(true)
        NetWorkApi<API.ShareRequest, API.ShareResponse>({
            url: "module/share",
            method: "post",
            data: params
        })
            .then((res) => {
                setShareResData({
                    ...res
                })
            })
            .catch((err) => {
                yakitNotify("error", t("YakitNotification.shareFailed") + err)
            })
            .finally(() => {
                setTimeout(() => {
                    setShareLoading(false)
                }, 200)
            })
    })
    const onShareHttpHistory = useMemoizedFn(() => {
        try {
            if (!isCommunityEdition() && !userInfo.token) {
                yakitNotify("error", t("ShareModal.pleaseLoginToShare"))
                return
            }
            const ids = JSON.parse(shareContent)

            const shareHttpHistoryParams: HTTPFlowsShareRequest = {
                Ids: ids,
                ExpiredTime: expiredTime,
                Pwd: pwd,
                Token: userInfo.token,
                Module: module
            }
            if (shareNumber) {
                shareHttpHistoryParams.LimitNum = limit_num
            }
            if (shareResData.share_id) {
                shareHttpHistoryParams.ShareId = shareResData.share_id
            }
            setShareLoading(true)
            ipcRenderer
                .invoke("HTTPFlowsShare", shareHttpHistoryParams)
                .then((res: HTTPFlowsShareResponse) => {
                    setShareResData({
                        share_id: res.ShareId,
                        extract_code: res.ExtractCode
                    })
                })
                .catch((err) => {
                    yakitNotify("error", t("YakitNotification.shareFailed", {colon: true}) + err)
                })
                .finally(() => {
                    setTimeout(() => {
                        setShareLoading(false)
                    }, 200)
                })
        } catch (error) {
            yakitNotify("error", t("ShareModal.shareDataConversionFailed") + error)
        }
    })
    const onShare = useMemoizedFn(() => {
        switch (module) {
            case YakitRoute.DB_HTTPHistory:
                onShareHttpHistory()
                break
            default:
                onShareOrdinary()
                break
        }
    })
    const disabled = !!shareResData?.share_id
    return (
        <div style={{padding: 24}}>
            <div className={styles["content-value"]}>
                <span className={styles["label-text"]}>{t("ShareModal.setExpiration")}</span>
                <YakitRadioButtons
                    disabled={disabled}
                    value={expiredTime}
                    onChange={(e) => setExpiredTime(e.target.value)}
                    options={[
                        {
                            label: t("ShareModal.fiveMinutes"),
                            value: 5
                        },
                        {
                            label: t("ShareModal.fifteenMinutes"),
                            value: 15
                        },
                        {
                            label: t("ShareModal.oneHour"),
                            value: 60
                        },
                        {
                            label: t("ShareModal.oneDay"),
                            value: 1440
                        }
                    ]}
                />
            </div>
            <div className={styles["content-value"]}>
                <span className={styles["label-text"]}>{t("ShareModal.password")}</span>
                <YakitSwitch disabled={disabled} checked={pwd} onChange={(checked) => setPwd(checked)} />
            </div>
            <div className={styles["content-value"]}>
                <span className={styles["label-text"]}>{t("ShareModal.limitShareCount")}</span>
                <YakitSwitch
                    disabled={disabled}
                    checked={shareNumber}
                    onChange={(checked) => setShareNumber(checked)}
                />
                &emsp;
                {shareNumber && (
                    <YakitInputNumber
                        min={1}
                        value={limit_num}
                        onChange={(v) => setLimit_num(v as number)}
                        size='small'
                        formatter={(value) => t("ShareModal.timesValue", {value: value || 0})}
                        disabled={disabled}
                    />
                )}
            </div>
            {shareResData.share_id && (
                <div className={styles["content-value"]}>
                    <span className={styles["label-text"]}>{t("ShareModal.shareId")}</span>
                    <span className={styles["display-flex"]}>
                        {shareResData.share_id} <CopyComponents copyText={shareResData.share_id} />
                    </span>
                </div>
            )}
            {shareResData.extract_code && (
                <div className={styles["content-value"]}>
                    <span className={styles["label-text"]}>{t("ShareModal.password")}</span>
                    <span>{shareResData.extract_code}</span>
                </div>
            )}
            <div className={styles["btn-footer"]}>
                <YakitButton type='primary' onClick={onShare} loading={shareLoading} disabled={disabled}>
                    {t("ShareModal.generateShareToken")}
                </YakitButton>
                {shareResData.share_id && (
                    <CopyToClipboard
                        text={
                            shareResData.extract_code
                                ? `${shareResData.share_id}\r\n${t("ShareModal.password")}${shareResData.extract_code}`
                                : `${shareResData.share_id}`
                        }
                        onCopy={(text, ok) => {
                            if (ok) success(t("ShareModal.copiedToClipboard"))
                        }}
                    >
                        <YakitButton type={disabled ? "primary" : "outline1"}>{t("ShareModal.copyShare")}</YakitButton>
                    </CopyToClipboard>
                )}
            </div>
        </div>
    )
})
