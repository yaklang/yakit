import React, {useMemo, useRef, useState} from "react"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitButton, YakitButtonProp} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitMenu} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {YakitRoute} from "@/enums/yakitRoute"
import {configManagementTabType, useConfigManagementTab} from "@/store"
import {onImportShare} from "@/pages/fuzzer/components/ShareImport"
import {useMemoizedFn} from "ahooks"
import {RouteToPageProps} from "./PublicMenu"
import {OutlineChevrondownIcon, OutlineChevronupIcon, OutlineSaveIcon} from "@/assets/icon/outline"
import {ImportLocalPlugin, LoadPluginMode} from "@/pages/mitm/MITMPage"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {Form} from "antd"
import {YakitFormDragger} from "@/components/yakitUI/YakitForm/YakitForm"
import {randomString} from "@/utils/randomUtil"
import {yakitNotify} from "@/utils/notification"
import {ImportExportProgress} from "@/components/HTTPFlowTable/HTTPFlowTable"
import emiter from "@/utils/eventBus/eventBus"
import styles from "./ExtraMenu.module.scss"
import {isEnpriTrace, isYakit} from "@/utils/envfile"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import classNames from "classnames"
import {ExtraMenuItem, getExtraMenu} from "@/routes/newRoute"
import {useSoftMode} from "@/store/softMode"
import { SolidPayloadIcon } from "@/assets/icon/solid"

const {ipcRenderer} = window.require("electron")
interface ExtraMenuProps {
    onMenuSelect: (route: RouteToPageProps) => void
}

export const ExtraMenu: React.FC<ExtraMenuProps> = React.memo((props) => {
    const {onMenuSelect} = props
    const {t, i18n} = useI18nNamespaces(["yakitRoute", "yakitUi", "layout"])
    const {softMode} = useSoftMode()
    const [visibleImport, setVisibleImport] = useState<boolean>(false)
    const [loadPluginMode, setLoadPluginMode] = useState<LoadPluginMode>("giturl")
    const [importMenuShow, setImportMenuShow] = useState<boolean>(false)
    const {configManagementActiveTab, setConfigManagementActiveTab} = useConfigManagementTab()
    const [payloadMenuShow, setPayloadMenuShow] = useState<boolean>(false)
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

    const payloadMenuSelect = useMemoizedFn((key: string) => {
        const tab = key as configManagementTabType
        setConfigManagementActiveTab(tab)
        emiter.emit("menuOpenPage", JSON.stringify({route: YakitRoute.ConfigManagement}))
        setPayloadMenuShow(false)
    })

    const managementTitle = useMemo(() => {
        switch (configManagementActiveTab) {
            case "payload":
                return t("YakitRoute.Payload")
            case "proxy":
                return t("Layout.ExtraMenu.proxyManagement")
            case "hotPatch":
                return t("Layout.ExtraMenu.hotPatchManagement")
            default:
                return t("YakitRoute.Payload")
        }
    }, [configManagementActiveTab, i18n.language])

    const importMenu = useMemo(
        () => (
            <YakitMenu
                width={142}
                selectedKeys={[]}
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

    const renderContent = useMemoizedFn(() => {
        return (
            <>
                {isYakit() && (
                    <>
                        <YakitPopover
                            overlayClassName={styles["menu-popover"]}
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
                <YakitPopover
                    placement={"bottom"}
                    overlayClassName={styles["management-menu-wrapper"]}
                    content={
                        <YakitMenu
                            selectedKeys={[configManagementActiveTab]}
                            data={[
                                {key: "payload", label: t("YakitRoute.Payload")},
                                {key: "proxy", label: t("Layout.ExtraMenu.proxyManagement")},
                                {key: "hotPatch", label: t("Layout.ExtraMenu.hotPatchManagement")}
                            ]}
                            onClick={({key}) => payloadMenuSelect(key)}
                        />
                    }
                    visible={payloadMenuShow}
                    onVisibleChange={(visible) => setPayloadMenuShow(visible)}
                >
                    <YakitButton type='secondary2' icon={<SolidPayloadIcon />}>
                        {managementTitle}
                    </YakitButton>
                </YakitPopover>
                <OrdinaryMenu menuList={getExtraMenu(softMode)} onMenuSelect={onMenuSelect} />
            </>
        )
    })

    return <div className={styles["extra-menu-wrapper"]}>{renderContent()}</div>
})

interface OrdinaryMenuProps extends Pick<ExtraMenuProps, "onMenuSelect"> {
    menuList: ExtraMenuItem[]
}
export const OrdinaryMenu: React.FC<OrdinaryMenuProps> = React.memo((props) => {
    const {onMenuSelect, menuList} = props
    const {t, i18n} = useI18nNamespaces(["yakitRoute", "yakitUi"])
    const [activePopoverKey, setActivePopoverKey] = useState<string | null>(null)
    const pageMapRef = useRef(new Map<string, YakitRoute>())
    const pluginNameMapRef = useRef(new Map<string, string>())

    const mapMenuData = useMemoizedFn((list: ExtraMenuItem[]) => {
        return list.map((item) => {
            const key = item.page + "_" + Math.random() * 5
            if (item.page) {
                pageMapRef.current.set(key, item.page)
                pluginNameMapRef.current.set(key, item.yakScripName || "")
            }
            return {
                key,
                label: item.i18n === false ? item.label : t(item.labelUi!),
                children: item.children?.length ? mapMenuData(item.children) : undefined
            }
        })
    })
    const renderExtraMenuItem = useMemoizedFn((item: ExtraMenuItem) => {
        if (item.children?.length) {
            const itemKey = item.label || item.labelUi || item.page
            return (
                <YakitPopover
                    key={itemKey}
                    overlayClassName={classNames(styles["menu-popover"], styles["menu-popover-no-arrow"])}
                    overlayStyle={{paddingTop: 2}}
                    placement='bottomRight'
                    trigger='click'
                    content={
                        <YakitMenu
                            selectedKeys={[]}
                            data={mapMenuData(item.children)}
                            onClick={({key}) => {
                                setActivePopoverKey(null)
                                const page = pageMapRef.current.get(key)
                                if (!page) return
                                if (page === YakitRoute.Plugin_OP) {
                                    const pluginName = pluginNameMapRef.current.get(key)
                                    onMenuSelect({route: page, pluginName: pluginName})
                                } else {
                                    onMenuSelect({route: page})
                                }
                            }}
                        />
                    }
                    visible={activePopoverKey === itemKey}
                    onVisibleChange={(visible) => {
                        setActivePopoverKey(visible ? itemKey! : null)
                    }}
                >
                    <YakitButton
                        type='secondary2'
                        icon={item.icon}
                        className={classNames(styles["heard-menu-customize"], styles["button-border"], {
                            [styles["heard-menu-customize-menu"]]: activePopoverKey === itemKey
                        })}
                        onClick={(e) => e.preventDefault()}
                    >
                        {item.i18n === false ? item.label : t(item.labelUi!)}
                        {activePopoverKey === itemKey ? <OutlineChevronupIcon /> : <OutlineChevrondownIcon />}
                    </YakitButton>
                </YakitPopover>
            )
        }

        return (
            <YakitButton
                key={item.page}
                type='secondary2'
                icon={item.icon}
                className={styles["button-border"]}
                onClick={() => {
                    onMenuSelect({route: item.page!})
                }}
            >
                {item.i18n === false ? item.label : t(item.labelUi!)}
            </YakitButton>
        )
    })

    return <>{menuList.map(renderExtraMenuItem)}</>
})
