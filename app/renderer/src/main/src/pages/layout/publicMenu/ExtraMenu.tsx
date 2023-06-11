import React, {useMemo, useState} from "react"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {SaveIcon} from "@/assets/newIcon"
import {MenuPayloadIcon, MenuYakRunnerIcon} from "@/pages/customizeMenu/icon/menuIcon"
import {YakitMenu} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {YakitRoute} from "@/routes/newRoute"
import {onImportPlugin, onImportShare} from "@/pages/fuzzer/components/ShareImport"
import {useMemoizedFn} from "ahooks"
import {RouteToPageProps} from "./PublicMenu"

import styles from "./ExtraMenu.module.scss"

interface ExtraMenuProps {
    onMenuSelect: (route: RouteToPageProps) => void
}

export const ExtraMenu: React.FC<ExtraMenuProps> = React.memo((props) => {
    const {onMenuSelect} = props

    const [importMenuShow, setImportMenuShow] = useState<boolean>(false)
    const importMenuSelect = useMemoizedFn((type: string) => {
        switch (type) {
            case "import-plugin":
                onImportPlugin()
                setImportMenuShow(false)
                return
            case "import-fuzzer":
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
                data={[
                    {
                        key: "import-plugin",
                        label: "导入插件"
                    },
                    {
                        key: "import-fuzzer",
                        label: "导入 WebFuzzer"
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
                    icon={<SaveIcon />}
                >
                    导入协作资源
                </YakitButton>
            </YakitPopover>
            <YakitButton
                type='secondary2'
                className={styles["extra-menu-gray"]}
                onClick={() => {
                    onMenuSelect({route: YakitRoute.PayloadManager})
                }}
                icon={<MenuPayloadIcon />}
            >
                Payload
            </YakitButton>
            <YakitButton
                type='secondary2'
                className={styles["extra-menu-gray"]}
                onClick={() => {
                    onMenuSelect({route: YakitRoute.YakScript})
                }}
                icon={<MenuYakRunnerIcon />}
            >
                Yak Runner
            </YakitButton>
        </div>
    )
})
