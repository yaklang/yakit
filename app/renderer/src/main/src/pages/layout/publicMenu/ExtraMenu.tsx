import React, {useMemo, useState} from "react"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitMenu} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {YakitRoute} from "@/routes/newRouteConstants"
import {onImportShare} from "@/pages/fuzzer/components/ShareImport"
import {useMemoizedFn} from "ahooks"
import {RouteToPageProps} from "./PublicMenu"
import { OutlineSaveIcon } from "@/assets/icon/outline"
import { SolidCodecIcon, SolidPayloadIcon, SolidTerminalIcon } from "@/assets/icon/solid"

import styles from "./ExtraMenu.module.scss"
import { ImportLocalPlugin, LoadPluginMode } from "@/pages/mitm/MITMPage"

interface ExtraMenuProps {
    onMenuSelect: (route: RouteToPageProps) => void
}

export const ExtraMenu: React.FC<ExtraMenuProps> = React.memo((props) => {
    const {onMenuSelect} = props
    const [visibleImport, setVisibleImport] = useState<boolean>(false)
    const [loadPluginMode, setLoadPluginMode] = useState<LoadPluginMode>("giturl")
    const [importMenuShow, setImportMenuShow] = useState<boolean>(false)
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
                            { key: 'local', label: "本地插件" },
                            { key: 'uploadId', label: "插件 ID" },
                            { key: 'giturl', label: "线上 Nuclei" },
                            { key: 'local-nuclei', label: "本地 Nuclei" },
                        ]
                    },
                    {
                        key: "import-share",
                        label: "导入分享数据"
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
                icon={<SolidPayloadIcon/>}
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
        </div>
    )
})
