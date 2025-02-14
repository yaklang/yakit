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
import {ImportExportHttpFlowProgress} from "@/components/HTTPFlowTable/HTTPFlowTable"
import emiter from "@/utils/eventBus/eventBus"
import styles from "./ExtraMenu.module.scss"

const {ipcRenderer} = window.require("electron")
interface ExtraMenuProps {
    onMenuSelect: (route: RouteToPageProps) => void
}

export const ExtraMenu: React.FC<ExtraMenuProps> = React.memo((props) => {
    const {onMenuSelect} = props
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
                onImportShare()
                setImportMenuShow(false)
                return
            case "import-history-har":
                form.setFieldsValue({historyharPath: ""})

                const m = showYakitModal({
                    title: "导入HAR流量数据",
                    width: 600,
                    content: (
                        <div style={{padding: 15}}>
                            <Form form={form}>
                                <YakitFormDragger
                                    multiple={false}
                                    isShowPathNumber={false}
                                    accept='.har'
                                    help='可将har文件拖入框内或'
                                    selectType='file'
                                    formItemProps={{
                                        name: "historyharPath",
                                        label: "导入HAR流量数据路径",
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
                                            yakitNotify("error", "请输入HAR流量数据路径")
                                            return
                                        }
                                        if (!formValue.historyharPath.endsWith(".har")) {
                                            yakitNotify("error", "仅支持.har格式的文件")
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
                                    导入
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
                        label: "导入插件",
                        children: [
                            {key: "local", label: "本地插件"},
                            {key: "uploadId", label: "插件 ID"},
                            {key: "giturl", label: "线上 Nuclei"},
                            {key: "local-nuclei", label: "本地 Nuclei"}
                        ]
                    },
                    {
                        key: "import-share",
                        label: "导入分享数据"
                    },
                    {
                        key: "import-history-har",
                        label: "导入HAR流量数据"
                    }
                ]}
                onClick={({key}) => importMenuSelect(key)}
            />
        ),
        []
    )

    return (
        <div className={styles["extra-menu-wrapper"]}>
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
                    导入资源
                </YakitButton>
            </YakitPopover>
            <YakitButton
                type='secondary2'
                onClick={() => {
                    onMenuSelect({route: YakitRoute.Codec})
                }}
                icon={<SolidCodecIcon />}
            >
                Codec
            </YakitButton>
            <YakitButton
                type='secondary2'
                onClick={() => {
                    onMenuSelect({route: YakitRoute.PayloadManager})
                }}
                icon={<SolidPayloadIcon />}
            >
                Payload
            </YakitButton>
            <YakitButton
                type='secondary2'
                onClick={() => {
                    onMenuSelect({route: YakitRoute.YakScript})
                }}
                icon={<SolidTerminalIcon />}
            >
                Yak Runner
            </YakitButton>
            <ImportLocalPlugin
                visible={visibleImport}
                setVisible={(v) => {
                    setVisibleImport(v)
                }}
                loadPluginMode={loadPluginMode}
                sendPluginLocal={true}
            />
            {percentVisible && (
                <ImportExportHttpFlowProgress
                    visible={percentVisible}
                    title='导入HAR流量数据'
                    token={importHistoryharToken}
                    apiKey='ImportHTTPFlowStream'
                    onClose={(finish) => {
                        setPercentVisible(false)
                        if (finish) {
                            yakitNotify("success", "导入成功")
                            emiter.emit("menuOpenPage", JSON.stringify({route: YakitRoute.DB_HTTPHistory}))
                            emiter.emit("onRefreshImportHistoryTable")
                        }
                    }}
                />
            )}
        </div>
    )
})
