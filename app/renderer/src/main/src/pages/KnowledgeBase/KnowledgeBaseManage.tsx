import {useRef, type FC} from "react"
import {useSafeState, useRequest} from "ahooks"

import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {PlusIcon} from "@/assets/newIcon"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import type {GetKnowledgeBaseResponse, KnowledgeBase} from "@/components/playground/knowlegeBase"
import {OutlineChatalt2Icon} from "@/assets/icon/outline"
import styles from "./knowledgeBase.module.scss"
import {ManageBoxMenu} from "./compoments/ManageBoxMenu"
import {KnowledgeBaseFormModal} from "./compoments/KnowledgeBaseModal"
import classNames from "classnames"

const {ipcRenderer} = window.require("electron")

interface TRepositoryManageProps {
    knowledgeBasesData?: GetKnowledgeBaseResponse["KnowledgeBases"]
    knowledgeBasesRunAsync: () => Promise<KnowledgeBase[]>
}

const KnowledgeBaseManage: FC = () => {
    const [visible, setVisible] = useSafeState(false)
    const menuOpenRef = useRef(false)
    // 获取数据库侧边栏数据
    const {data: knowledgeBasesData, runAsync: knowledgeBasesRunAsync} = useRequest(async () => {
        const result: GetKnowledgeBaseResponse = await ipcRenderer.invoke("GetKnowledgeBase", {})
        const {KnowledgeBases} = result
        return KnowledgeBases
    })

    // 新增 / 编辑 知识库弹窗状态及信息管理
    const handOpenKnowledgeBasesModal = () => {
        setVisible((preValue) => !preValue)
    }

    return (
        <div className={styles["repository-manage-container"]}>
            <div className={styles["repository-manage-header"]}>
                <div>知识库管理</div>
                <YakitButton icon={<PlusIcon />} type='primary' size='small' onClick={handOpenKnowledgeBasesModal} />
            </div>
            <div className={styles["repository-manage-content"]}>
                {knowledgeBasesData?.map((it) => (
                    <div className={styles["repository-manage-box"]} key={it.ID}>
                        <div className={styles["repository-manage-box-content"]}>
                            <div>
                                <div>{it.KnowledgeBaseName}</div>
                                <YakitTag color='main'>{it.KnowledgeBaseType}</YakitTag>
                            </div>
                            <div>{it.KnowledgeBaseDescription}</div>
                        </div>
                        <div
                            className={classNames(styles["repository-manage-box-icon"], {
                                [styles["repository-manage-box-icon-selected"]]: menuOpenRef.current === true
                            })}
                        >
                            <OutlineChatalt2Icon />
                            <ManageBoxMenu
                                knowledgeBasesRunAsync={knowledgeBasesRunAsync}
                                itemsData={it}
                                menuOpenRef={menuOpenRef}
                            />
                        </div>
                    </div>
                ))}
            </div>
            <KnowledgeBaseFormModal
                visible={visible}
                handOpenKnowledgeBasesModal={handOpenKnowledgeBasesModal}
                knowledgeBasesRunAsync={knowledgeBasesRunAsync}
                title='新增知识库'
            />
        </div>
    )
}

export {KnowledgeBaseManage}
export type {TRepositoryManageProps}
