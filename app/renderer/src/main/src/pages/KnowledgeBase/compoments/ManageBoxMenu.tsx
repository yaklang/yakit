import {FC} from "react"
import {useSafeState} from "ahooks"

import {SolidDotsverticalIcon} from "@/assets/icon/solid"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {TKnowledgeBaseProps} from "../TKnowledgeBase"
import {KnowledgeBaseFormModal} from "./KnowledgeBaseModal"
import styles from "../knowledgeBase.module.scss"

const manageMenuList = [
    {
        key: "edit",
        label: "编辑"
    },
    {
        key: "export",
        label: "导出"
    },
    {
        key: "delete",
        label: "删除"
    }
]

const ManageBoxMenu: FC<TKnowledgeBaseProps> = ({knowledgeBasesRunAsync, itemsData, setMenuOpenKey}) => {
    const [menuOpen, setMenuOpen] = useSafeState(false)
    const [visible, setVisible] = useSafeState(false)

    const handOpenKnowledgeBasesModal = () => {
        setVisible((preValue) => !preValue)
    }
    return (
        <>
            <YakitDropdownMenu
                menu={{
                    data: manageMenuList,
                    onClick: ({key}) => {
                        setMenuOpen(false)
                        setMenuOpen?.(false)
                        switch (key) {
                            case "edit":
                                setVisible((preValue) => !preValue)
                                break

                            default:
                                break
                        }
                    }
                }}
                dropdown={{
                    trigger: ["click"],
                    placement: "bottomRight",
                    onVisibleChange: (v) => {
                        setMenuOpenKey?.(v)
                        setMenuOpen(v)
                    },
                    visible: menuOpen
                }}
            >
                <div className={styles["manage-menu-icon"]}>
                    <SolidDotsverticalIcon />
                </div>
            </YakitDropdownMenu>
            <KnowledgeBaseFormModal
                visible={visible}
                handOpenKnowledgeBasesModal={handOpenKnowledgeBasesModal}
                knowledgeBasesRunAsync={knowledgeBasesRunAsync}
                itemsData={itemsData}
                title='编辑知识库'
            />
        </>
    )
}

export {ManageBoxMenu}
