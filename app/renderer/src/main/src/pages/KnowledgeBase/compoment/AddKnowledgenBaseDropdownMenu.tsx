import React from "react"
import {type FC} from "react"

import {useSafeState} from "ahooks"

import {PlusIcon} from "@/assets/newIcon"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {createMenuList} from "../utils"
import {KnowledgeBaseFormModal} from "./KnowledgeBaseFormModal"
import {CreateKnowledgeBaseData, KnowledgeBaseContentProps} from "../TKnowledgeBase"
import {Form} from "antd"

interface TAddKnowledgenBaseDropdownMenuProps {
    knowledgeBasesRunAsync?: (
        Keyword?: string,
        createKnwledgeData?: CreateKnowledgeBaseData
    ) => Promise<KnowledgeBaseContentProps["KnowledgeBases"]>
}

const AddKnowledgenBaseDropdownMenu: FC<TAddKnowledgenBaseDropdownMenuProps> = ({knowledgeBasesRunAsync}) => {
    const [form] = Form.useForm()
    const [createMenuOpen, setCreateMenuOpen] = useSafeState(false)
    const [visible, setVisible] = useSafeState(false)

    // 新增 / 编辑 知识库弹窗状态及信息管理
    const handOpenKnowledgeBasesModal = () => {
        form.resetFields()
        setVisible((preValue) => !preValue)
    }

    return (
        <React.Fragment>
            <YakitDropdownMenu
                menu={{
                    data: createMenuList,
                    onClick: ({key}) => {
                        setCreateMenuOpen(false)
                        switch (key) {
                            case "import":
                                // setVisible((prevalue) => !prevalue)
                                break
                            case "create":
                                handOpenKnowledgeBasesModal()
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
                        setCreateMenuOpen(v)
                    },
                    visible: createMenuOpen
                }}
            >
                <YakitButton icon={<PlusIcon />} size='small' />
            </YakitDropdownMenu>
            <KnowledgeBaseFormModal
                visible={visible}
                title='新增知识库'
                handOpenKnowledgeBasesModal={handOpenKnowledgeBasesModal}
                form={form}
            />
        </React.Fragment>
    )
}

export {AddKnowledgenBaseDropdownMenu}
