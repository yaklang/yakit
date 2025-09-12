import {FC} from "react"
import {useSafeState} from "ahooks"
import classNames from "classnames"

import {SolidDotsverticalIcon} from "@/assets/icon/solid"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {TKnowledgeBaseProps} from "../TKnowledgeBase"
import {KnowledgeBaseFormModal} from "./KnowledgeBaseModal"
import styles from "../knowledgeBase.module.scss"
import {OutlineChatalt2Icon} from "@/assets/icon/outline"
import {DeleteConfirm} from "./KnowledgBaseDeleteModal"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {KnowledgeBaseQA} from "./KnowledgeBaseQA"

const manageMenuList = [
    {
        key: "edit",
        label: "编辑"
    },
    // {
    //     key: "export",
    //     label: "导出"
    // },
    {
        key: "delete",
        label: "删除"
    }
]

const ManageBoxMenu: FC<TKnowledgeBaseProps> = ({refreshAsync, itemsData, setMenuOpenKey, menuOpenKey}) => {
    const [visible, setVisible] = useSafeState(false)
    const [menuOpen, setMenuOpen] = useSafeState(false)
    const [deletConfirm, setDeletConfirm] = useSafeState(false)
    const [qaDrawerVisible, setQaDrawerVisible] = useSafeState(false)

    const handOpenKnowledgeBasesModal = () => {
        setVisible((preValue) => !preValue)
    }
    return (
        <div
            className={classNames(styles["repository-manage-box-icon"], {
                [styles["repository-manage-box-icon-selected"]]: menuOpenKey === itemsData?.ID && menuOpen
            })}
              onClick={(e) => e.stopPropagation()}
        >
            <OutlineChatalt2Icon onClick={e => {
                e.stopPropagation()
                setQaDrawerVisible(true)
            }} />
            <YakitDropdownMenu
                menu={{
                    data: manageMenuList,
                    onClick: ({key}) => {
                        setMenuOpen?.(false)
                        switch (key) {
                            case "edit":
                                setVisible((prevalue) => !prevalue)
                                break
                            case "delete":
                                setDeletConfirm((preValue) => !preValue)
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
                        setMenuOpenKey?.(itemsData!.ID)
                        setMenuOpen?.(v)
                    },
                    visible: menuOpen
                }}
            >
                <SolidDotsverticalIcon
                    className={classNames({
                        [styles["manage-menu-icon-selected"]]: menuOpenKey === itemsData!.ID && menuOpen
                    })}
                />
            </YakitDropdownMenu>
            <KnowledgeBaseFormModal
                visible={visible}
                handOpenKnowledgeBasesModal={handOpenKnowledgeBasesModal}
                refreshAsync={refreshAsync}
                itemsData={itemsData}
                title='编辑知识库'
            />

            <DeleteConfirm
                visible={deletConfirm}
                onVisible={setDeletConfirm}
                refreshAsync={refreshAsync}
                KnowledgeBaseId={itemsData!.ID}
            />

            {/* AI问答抽屉 */}
            <YakitDrawer
                title={`AI问答 - ${itemsData?.KnowledgeBaseName || "知识库"}`}
                placement='right'
                width={600}
                visible={qaDrawerVisible}
                onClose={() => setQaDrawerVisible(false)}
                bodyStyle={{padding: 0, height: "100%", display: "flex", flexDirection: "column"}}
            >
                <KnowledgeBaseQA
                    knowledgeBase={itemsData}
                    queryAllCollectionsDefault={false}
                />
            </YakitDrawer>
        </div>
    )
}

export {ManageBoxMenu}
