import {HomeIcon, OutlinePlay2Icon, WandIcon} from "@/assets/icon/outline"
import {Entity} from "@/components/playground/entityRepository"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {randomString} from "@/utils/randomUtil"
import {useMemoizedFn, useSafeState} from "ahooks"
import {FC, useMemo} from "react"
import {failed, info, warn} from "@/utils/notification"
import {KnowledgeBaseTableProps} from "./KnowledgeBaseTable"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"

import styles from "../knowledgeBase.module.scss"
import {useKnowledgeBase} from "../hooks/useKnowledgeBase"
import moment from "moment"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {KnowledgeBaseEntry} from "../TKnowledgeBase"

interface GenerateKnowledgeProps {
    generateKnowledgeDataList?: Array<Entity & KnowledgeBaseEntry>
    generateKnowledgeBaseItem?: KnowledgeBaseTableProps["knowledgeBaseItems"]
    depth?: number
    knowledgeType?: "entity" | "knowledge"
    isAll?: boolean
}

const GenerateKnowledge: FC<GenerateKnowledgeProps> = ({
    generateKnowledgeDataList,
    generateKnowledgeBaseItem,
    depth,
    knowledgeType,
    isAll = false
}) => {
    const {editKnowledgeBase, knowledgeBases} = useKnowledgeBase()
    const [dropdownMenuVisible, setDropdownMenuVisible] = useSafeState(false)
    const [additionalConditionsVisible, setAdditionalConditionsVisible] = useSafeState(false)
    const [additionalConditionsValue, setAdditionalConditionsValue] = useSafeState("")

    const DropdownMenuData: YakitMenuItemType[] = useMemo(() => {
        return [
            {
                key: "oneClickGeneration",

                label: (
                    <div className={styles["dropdownMene-data-items"]}>
                        <HomeIcon />
                        <div className={styles["title"]}>一键生成</div>
                        <div />
                        <div className={styles["describe"]}>通过图中的实体关系直接生成知识</div>
                    </div>
                )
            },
            {
                key: "supplementaryConditions",
                label: (
                    <div className={styles["dropdownMene-data-items"]}>
                        <WandIcon />
                        <div className={styles["title"]}>补充条件</div>
                        <div />
                        <div className={styles["describe"]}>在条件约束下，通过图中的实体关系生成知识</div>
                    </div>
                )
            }
        ]
    }, [])

    // 从实体生成知识
    const onGenerateKnowledge = useMemoizedFn(async (query?: string) => {
        const token = randomString(50)

        if (generateKnowledgeBaseItem?.ID) {
            const targetKnowledgeBases = knowledgeBases.find((it) => it.ID === generateKnowledgeBaseItem?.ID)
            const HiddenIndex =
                generateKnowledgeDataList
                    ?.map((it: any) => {
                        if (knowledgeType === "entity") {
                            return it.HiddenIndex
                        } else {
                            return it.RelatedEntityUUIDS
                        }
                    })
                    ?.join(",") ?? ""
            const existHiddenIndex = targetKnowledgeBases?.historyGenerateKnowledgeList?.some(
                (it) => it.HiddenIndex === HiddenIndex
            )
            if (existHiddenIndex) {
                failed("已存在该构建知识条目，请重新选择")
                return
            } else {
                const historyGenerateKnowledgeList = targetKnowledgeBases?.historyGenerateKnowledgeList
                    ? [
                          ...targetKnowledgeBases.historyGenerateKnowledgeList,
                          {
                              date: moment().format("MM-DD HH:mm:ss"),
                              name:
                                  query ??
                                  `构建知识${(targetKnowledgeBases?.historyGenerateKnowledgeList?.length ?? 0) + 1}`,
                              token,
                              HiddenIndex,
                              isAll,
                              depth: 0,
                              ID: generateKnowledgeBaseItem.ID,
                              query,
                              knowledgeType
                          }
                      ]
                    : targetKnowledgeBases?.historyGenerateKnowledgeList

                editKnowledgeBase(generateKnowledgeBaseItem?.ID, {
                    ...generateKnowledgeBaseItem,
                    streamstep: "success",
                    historyGenerateKnowledgeList
                })
                info("创建生成知识构建成功，正在构建...")
            }
        }
    })

    return (
        <div style={{height: 24}}>
            <YakitDropdownMenu
                menu={{
                    data: DropdownMenuData,
                    type: "grey",
                    onClick: ({key}) => {
                        setDropdownMenuVisible(false)
                        switch (key) {
                            case "oneClickGeneration":
                                onGenerateKnowledge()
                                break
                            case "supplementaryConditions":
                                setAdditionalConditionsVisible(true)
                                break
                            default:
                                break
                        }
                    }
                }}
                dropdown={{
                    trigger: ["click"],
                    placement: "bottomRight",
                    overlayClassName: styles["dropdownMene-data-children"],
                    onVisibleChange: (v) => {
                        setDropdownMenuVisible(v)
                    },
                    visible: dropdownMenuVisible
                }}
            >
                <YakitButton icon={<OutlinePlay2Icon />} type='outline1'>
                    从实体生成知识
                </YakitButton>
            </YakitDropdownMenu>
            <YakitModal
                visible={additionalConditionsVisible}
                title='补充条件'
                onOk={() => {
                    if (additionalConditionsValue.trim().length > 0) {
                        onGenerateKnowledge(additionalConditionsValue)
                        setAdditionalConditionsVisible(false)
                    } else {
                        warn("请输入补充条件")
                    }
                }}
                onCancel={() => {
                    setAdditionalConditionsVisible(false)
                    setAdditionalConditionsValue("")
                }}
            >
                <YakitInput.TextArea
                    placeholder='请输入生成知识补充条件'
                    value={additionalConditionsValue}
                    onChange={(e) => {
                        const value = e.target.value
                        setAdditionalConditionsValue(value)
                    }}
                />
            </YakitModal>
        </div>
    )
}

export {GenerateKnowledge}
