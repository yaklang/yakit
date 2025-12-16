import React, {Dispatch, SetStateAction} from "react"
import {type FC} from "react"

import {useSafeState} from "ahooks"

import {PlusIcon} from "@/assets/newIcon"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {createMenuList} from "../utils"
import {KnowledgeBaseFormModal} from "./KnowledgeBaseFormModal"
import {Form} from "antd"
import {ImportModal} from "./ImportModal"

const AddKnowledgenBaseDropdownMenu: FC<{
    setKnowledgeBaseID: (id: string) => void
    setAddMode: Dispatch<SetStateAction<string[]>>
}> = ({setKnowledgeBaseID, setAddMode}) => {
    const [form] = Form.useForm()
    const [createMenuOpen, setCreateMenuOpen] = useSafeState(false)
    const [visible, setVisible] = useSafeState(false)
    const [importVisible, setImportVisible] = useSafeState(false)

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
                                setImportVisible((prevalue) => !prevalue)
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
                <YakitButton icon={<PlusIcon />} size='small' style={{height: "26.85px", width: "26.85px"}} />
            </YakitDropdownMenu>
            <KnowledgeBaseFormModal
                visible={visible}
                title='新增知识库'
                handOpenKnowledgeBasesModal={handOpenKnowledgeBasesModal}
                setKnowledgeBaseID={setKnowledgeBaseID}
                form={form}
                setAddMode={setAddMode}
            />

            <ImportModal visible={importVisible} onVisible={setImportVisible} setAddMode={setAddMode} />
        </React.Fragment>
    )
}

export {AddKnowledgenBaseDropdownMenu}
