import {type FC} from "react"
import {useSafeState, useRequest} from "ahooks"

import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {PlusIcon} from "@/assets/newIcon"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"

import {KnowledgeBaseQA} from "./compoments/KnowledgeBaseQA"
import {ManageBoxMenu} from "./compoments/ManageBoxMenu"
import {KnowledgeBaseFormModal} from "./compoments/KnowledgeBaseModal"
import {ImportModal} from "./compoments/KnowledgBaseImportModal"

import {type GetKnowledgeBaseResponse, type KnowledgeBase} from "@/components/playground/knowlegeBase"
import styles from "./knowledgeBase.module.scss"
import classNames from "classnames"

const {ipcRenderer} = window.require("electron")

interface TRepositoryManageProps {
    knowledgeBasesData?: GetKnowledgeBaseResponse["KnowledgeBases"]
    knowledgeBasesRunAsync: () => Promise<KnowledgeBase[]>
}

const createMenuList = [
    {
        key: "import",
        label: "导入"
    },
    {
        key: "create",
        label: "新建"
    }
]

const KnowledgeBaseManage: FC<{
    setKnowledgeBaseItems: (val: {id: number; name: string}) => void
    knowledgeBaseitems?: {
        id: number
        name: string
    }
}> = ({setKnowledgeBaseItems, knowledgeBaseitems}) => {
    const [visible, setVisible] = useSafeState(false)
    const [importVisible, setImportVisible] = useSafeState(false)
    const [menuOpenKey, setMenuOpenKey] = useSafeState(-1)
    const [createMenuOpen, setCreateMenuOpen] = useSafeState(false)
    const [qaDrawerVisible, setQaDrawerVisible] = useSafeState(false)

    // 获取数据库侧边栏数据
    const {
        data: knowledgeBasesData,
        runAsync: knowledgeBasesRunAsync,
        refreshAsync
    } = useRequest(
        async (Keyword: string) => {
            const result: GetKnowledgeBaseResponse = await ipcRenderer.invoke("GetKnowledgeBase", {Keyword})
            const {KnowledgeBases} = result
            return KnowledgeBases
        },
        {
            onSuccess: (value) => {
                if (Array.isArray(value) && value.length > 0) {
                    setKnowledgeBaseItems({
                        id: value?.[0]?.ID,
                        name: value?.[0]?.KnowledgeBaseName
                    })
                }
            }
        }
    )

    // 新增 / 编辑 知识库弹窗状态及信息管理
    const handOpenKnowledgeBasesModal = () => {
        setVisible((preValue) => !preValue)
    }

    return (
        <div className={styles["repository-manage-container"]}>
            <div className={styles["repository-manage-header"]}>
                <div>
                    知识库管理
                    <YakitButton onClick={() => setQaDrawerVisible(true)}>AI问答</YakitButton>
                </div>
                <YakitDropdownMenu
                    menu={{
                        data: createMenuList,
                        onClick: ({key}) => {
                            setCreateMenuOpen(false)
                            switch (key) {
                                case "import":
                                    setImportVisible(true)
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
                    <YakitButton icon={<PlusIcon />} type='secondary2' size='small' />
                </YakitDropdownMenu>
            </div>
            <div className={styles["repository-manage-search"]}>
                <YakitInput.Search
                    placeholder={"请输入请输入关键字搜索"}
                    allowClear
                    onSearch={(value) => knowledgeBasesRunAsync(value)}
                />
            </div>
            <div className={styles["repository-manage-content"]}>
                {knowledgeBasesData?.map((it) => (
                    <div
                        className={classNames(styles["repository-manage-box"], {
                            [styles["repository-manage-box-selected"]]: knowledgeBaseitems?.id === it.ID
                        })}
                        key={it.ID}
                        onClick={() =>
                            setKnowledgeBaseItems({
                                id: it.ID,
                                name: it.KnowledgeBaseName
                            })
                        }
                    >
                        <div className={styles["repository-manage-box-content"]}>
                            <div>
                                <div>{it.KnowledgeBaseName}</div>
                                <YakitTag color='main'>{it.KnowledgeBaseType || "-"}</YakitTag>
                            </div>
                            <div>{it.KnowledgeBaseDescription || "-"}</div>
                        </div>
                        <ManageBoxMenu
                            refreshAsync={refreshAsync}
                            itemsData={it}
                            setMenuOpenKey={setMenuOpenKey}
                            menuOpenKey={menuOpenKey}
                        />
                    </div>
                ))}
            </div>
            <KnowledgeBaseFormModal
                visible={visible}
                handOpenKnowledgeBasesModal={handOpenKnowledgeBasesModal}
                refreshAsync={refreshAsync}
                title='新增知识库'
            />

            <ImportModal
                visible={importVisible}
                onVisible={setImportVisible}
                refreshAsync={refreshAsync}
            />

            <YakitDrawer
                title={`AI问答 - 知识库`}
                placement='right'
                width={600}
                visible={qaDrawerVisible}
                onClose={() => setQaDrawerVisible(false)}
                bodyStyle={{padding: 0, height: "100%", display: "flex", flexDirection: "column"}}
                maskClosable={false}
            >
                <KnowledgeBaseQA />
            </YakitDrawer>
        </div>
    )
}

export {KnowledgeBaseManage}
export type {TRepositoryManageProps}
