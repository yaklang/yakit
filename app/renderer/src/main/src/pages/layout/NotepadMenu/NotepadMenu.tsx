import {SolidClipboardlistIcon} from "@/assets/icon/solid"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitRoute} from "@/enums/yakitRoute"
import {useMemoizedFn, useCreation} from "ahooks"
import {Dropdown} from "antd"
import classNames from "classnames"
import React, {useState} from "react"
import {NotepadMenuProps} from "../HeardMenu/HeardMenuType"
import style from "./NotepadMenu.module.scss"
import {getNotepadNameByEdition} from "./utils"
import {OutlineChevrondownIcon, OutlineChevronupIcon} from "@/assets/icon/outline"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

export const NotepadMenu: React.FC<NotepadMenuProps> = React.memo((props) => {
    const {isExpand, onRouteMenuSelect} = props
    const {t, i18n} = useI18nNamespaces(["layout"])

    const [notepadVisible, setNotepadVisible] = useState<boolean>(false)
    const onNotepad = useMemoizedFn((item) => {
        switch (item.key) {
            case "list":
                onRouteMenuSelect({
                    route: YakitRoute.Notepad_Manage
                })
                break
            case "add":
                onRouteMenuSelect({
                    route: YakitRoute.Modify_Notepad
                })
                break
            default:
                break
        }
    })
    const name = useCreation(() => {
        return getNotepadNameByEdition()
    }, [i18n.language])
    return (
        <>
            <Dropdown
                overlayClassName={style["notepad-drop-menu"]}
                overlay={
                    <>
                        {[
                            {key: "list", label: t("Layout.NotepadMenu.list", {name})},
                            {key: "add", label: t("Layout.NotepadMenu.add", {name})}
                        ].map((item) => (
                            <div
                                key={item.key}
                                className={classNames(style["notepad-item"])}
                                onClick={() => onNotepad(item)}
                            >
                                <div className={style["notepad-item-left"]}>{item.label}</div>
                            </div>
                        ))}
                    </>
                }
                onVisibleChange={setNotepadVisible}
            >
                <YakitButton
                    type='secondary2'
                    className={classNames(style["heard-menu-customize"], {
                        [style["margin-right-0"]]: isExpand,
                        [style["heard-menu-customize-menu"]]: notepadVisible
                    })}
                    icon={<SolidClipboardlistIcon />}
                >
                    <div className={style["heard-menu-customize-content"]}>
                        {name}
                        {(notepadVisible && <OutlineChevronupIcon />) || <OutlineChevrondownIcon />}
                    </div>
                </YakitButton>
            </Dropdown>
        </>
    )
})
