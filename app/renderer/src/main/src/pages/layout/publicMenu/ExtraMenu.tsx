import React, {useMemo, useState} from "react"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitMenu} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {YakitRoute} from "@/enums/yakitRoute"
import {onImportShare} from "@/pages/fuzzer/components/ShareImport"
import {useMemoizedFn} from "ahooks"
import {RouteToPageProps} from "./PublicMenu"
import {OutlineSaveIcon} from "@/assets/icon/outline"
import {SolidCodecIcon, SolidPayloadIcon, SolidTerminalIcon} from "@/assets/icon/solid"
import {ImportLocalPlugin, LoadPluginMode} from "@/pages/mitm/MITMPage"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {Form} from "antd"
import {YakitFormDragger} from "@/components/yakitUI/YakitForm/YakitForm"
import {randomString} from "@/utils/randomUtil"
import {yakitNotify} from "@/utils/notification"
import {ImportExportProgress} from "@/components/HTTPFlowTable/HTTPFlowTable"
import emiter from "@/utils/eventBus/eventBus"
import styles from "./ExtraMenu.module.scss"
import {isIRify} from "@/utils/envfile"
import {NotepadMenu} from "../NotepadMenu/NotepadMenu"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

const {ipcRenderer} = window.require("electron")
interface ExtraMenuProps {
    onMenuSelect: (route: RouteToPageProps) => void
}

export const ExtraMenu: React.FC<ExtraMenuProps> = React.memo((props) => {
    const {onMenuSelect} = props
    const {t, i18n} = useI18nNamespaces(["yakitUi", "yakitRoute", "layout"])
    const [visibleImport, setVisibleImport] = useState<boolean>(false)
    const [loadPluginMode, setLoadPluginMode] = useState<LoadPluginMode>("giturl")
    const [importMenuShow, setImportMenuShow] = useState<boolean>(false)
    const [form] = Form.useForm()
    const [importHistoryharToken, setImportHistoryharToken] = useState<string>("")
    const [percentVisible, setPercentVisible] = useState<boolean>(false)
    const importMenuSelect = useMemoizedFn((type: string) => {
        switch (type) {
            case "local":
            case "uploadId":
            case "giturl":
            case "local-nuclei":
                setVisibleImport(true)
                setLoadPluginMode(type)
                setImportMenuShow(false)
                return
            case "import-share":
                onImportShare(i18n)
                setImportMenuShow(false)
                return
            case "import-history-har":
                form.setFieldsValue({historyharPath: ""})

                const m = showYakitModal({
                    title: t("Layout.ExtraMenu.importHARHistoryData"),
                    width: 600,
                    content: (
                        <div style={{padding: 15}}>
                            <Form form={form}>
                                <YakitFormDragger
                                    multiple={false}
                                    isShowPathNumber={false}
                                    accept='.har'
                                    help={t("YakitFormDragger.dragFileHereOr", {fileType: "HAR"})}
                                    selectType='file'
                                    formItemProps={{
                                        name: "historyharPath",
                                        label: t("YakitFormDragger.fileDataPath", {fileType: "HAR"}),
                                        labelCol: {span: 8},
                                        wrapperCol: {span: 17}
                                    }}
                                />
                            </Form>
                            <div style={{width: "100%", textAlign: "right"}}>
                                <YakitButton
                                    type='primary'
                                    onClick={() => {
                                        const formValue = form.getFieldsValue()
                                        if (!formValue.historyharPath) {
                                            yakitNotify("error", t("YakitFormDragger.enterFilePath", {fileType: "HAR"}))
                                            return
                                        }
                                        if (!formValue.historyharPath.endsWith(".har")) {
                                            yakitNotify("error", t("YakitFormDragger.filesOnly", {fileType: ".har"}))
                                            return
                                        }
                                        m.destroy()
                                        const token = randomString(40)
                                        setImportHistoryharToken(token)
                                        ipcRenderer
                                            .invoke(
                                                "ImportHTTPFlowStream",
                                                {
                                                    InputPath: formValue.historyharPath
                                                },
                                                token
                                            )
                                            .then(() => {
                                                setPercentVisible(true)
                                            })
                                            .catch((error) => {
                                                yakitNotify("error", `[ImportHTTPFlowStream] error: ${error}`)
                                            })
                                    }}
                                >
                                    {t("YakitButton.import")}
                                </YakitButton>
                            </div>
                        </div>
                    ),
                    footer: null
                })
                setImportMenuShow(false)
                return

            default:
                return
        }
    })
    const importMenu = useMemo(
        () => (
            <YakitMenu
                width={142}
                selectedKeys={[]}
                // triggerSubMenuAction="click"
                data={[
                    {
                        key: "import-plugin",
                        label: t("YakitButton.importPlugin"),
                        children: [
                            {key: "local", label: t("Layout.ExtraMenu.localPlugin")},
                            {key: "uploadId", label: t("Layout.ExtraMenu.pluginID")},
                            {key: "giturl", label: t("Layout.ExtraMenu.online") + " " + t("YakitRoute.Nuclei")},
                            {
                                key: "local-nuclei",
                                label: t("Layout.ExtraMenu.local") + " " + t("YakitRoute.Nuclei")
                            }
                        ]
                    },
                    {
                        key: "import-share",
                        label: t("Layout.ExtraMenu.importSharedData")
                    },
                    {
                        key: "import-history-har",
                        label: t("Layout.ExtraMenu.importHARHistoryData")
                    }
                ]}
                onClick={({key}) => importMenuSelect(key)}
            />
        ),
        [i18n.language]
    )

    return (
        <div className={styles["extra-menu-wrapper"]}>
            {isIRify() ? (
                <YakitButton
                    type='secondary2'
                    onClick={() => {
                        onMenuSelect({route: YakitRoute.YakScript})
                    }}
                    className={styles["yak-runner-button"]}
                    icon={<SolidTerminalIcon />}
                >
                    {t("YakitRoute.YakRunner")}
                </YakitButton>
            ) : (
                <>
                    <YakitPopover
                        overlayClassName={styles["import-resource-popover"]}
                        overlayStyle={{paddingTop: 2}}
                        placement={"bottom"}
                        trigger={"click"}
                        content={importMenu}
                        visible={importMenuShow}
                        onVisibleChange={(visible) => setImportMenuShow(visible)}
                    >
                        <YakitButton
                            type='text'
                            style={{fontWeight: 500}}
                            onClick={(e) => e.preventDefault()}
                            icon={<OutlineSaveIcon />}
                        >
                            {t("YakitButton.importResources")}
                        </YakitButton>
                    </YakitPopover>
                    <YakitButton
                        type='secondary2'
                        onClick={() => {
                            onMenuSelect({route: YakitRoute.Codec})
                        }}
                        icon={<SolidCodecIcon />}
                    >
                        {t("YakitRoute.Codec")}
                    </YakitButton>
                    <YakitButton
                        type='secondary2'
                        onClick={() => {
                            onMenuSelect({route: YakitRoute.PayloadManager})
                        }}
                        icon={<SolidPayloadIcon />}
                    >
                        {t("YakitRoute.Payload")}
                    </YakitButton>
                    <YakitButton
                        type='secondary2'
                        onClick={() => {
                            onMenuSelect({route: YakitRoute.YakScript})
                        }}
                        icon={<SolidTerminalIcon />}
                    >
                        {t("YakitRoute.YakRunner")}
                    </YakitButton>
                    <NotepadMenu isExpand={false} onRouteMenuSelect={onMenuSelect} />
                    <ImportLocalPlugin
                        visible={visibleImport}
                        setVisible={(v) => {
                            setVisibleImport(v)
                        }}
                        loadPluginMode={loadPluginMode}
                        sendPluginLocal={true}
                    />
                    {percentVisible && (
                        <ImportExportProgress
                            visible={percentVisible}
                            title={t("Layout.ExtraMenu.importHARHistoryData")}
                            token={importHistoryharToken}
                            apiKey='ImportHTTPFlowStream'
                            onClose={(finish) => {
                                setPercentVisible(false)
                                if (finish) {
                                    yakitNotify("success", t("YakitNotification.imported"))
                                    emiter.emit("menuOpenPage", JSON.stringify({route: YakitRoute.DB_HTTPHistory}))
                                    emiter.emit("onRefreshImportHistoryTable")
                                }
                            }}
                        />
                    )}
                </>
            )}
        </div>
    )
})
