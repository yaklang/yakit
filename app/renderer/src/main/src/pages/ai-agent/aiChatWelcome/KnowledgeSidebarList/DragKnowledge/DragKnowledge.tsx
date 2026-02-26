import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import styles from "../knowledgeSidebarList.module.scss"
import Dragger from "antd/lib/upload/Dragger"
import {failed, success} from "@/utils/notification"
import {useDebounceFn, useRequest} from "ahooks"
import {useKnowledgeBase} from "@/pages/KnowledgeBase/hooks/useKnowledgeBase"
import {randomString} from "@/utils/randomUtil"
import {PropertyIcon} from "@/pages/payloadManager/icon"

const {ipcRenderer} = window.require("electron")

const DragKnowledge = () => {
    const {knowledgeBases, addKnowledgeBase, editKnowledgeBase} = useKnowledgeBase()

    const beforeUploadFun = useDebounceFn(
        async (fileList: Array<File & {path: string}>) => {
            let arr: {
                path: string
                name: string
            }[] = []
            fileList.forEach((f) => {
                let name = f.name.split(".")[0]
                arr.push({
                    path: f.path,
                    name
                })
            })
            const findDefaultKnowledgeBase = knowledgeBases.find((it) => it.IsDefault)

            try {
                await runAsync({
                    ...findDefaultKnowledgeBase,
                    streamstep: 1,
                    streamToken: randomString(50),
                    KnowledgeBaseFile: arr.map((it) => {
                        const fileName = it.path.split(/[\\/]/).pop() || ""
                        const ext = fileName.includes(".")
                            ? fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase()
                            : ""

                        return {
                            fileType: ext,
                            path: it.path
                        }
                    }),
                    KnowledgeBaseName: findDefaultKnowledgeBase?.KnowledgeBaseName ?? "default",
                    KnowledgeBaseDescription:
                        findDefaultKnowledgeBase?.KnowledgeBaseDescription ??
                        "系统默认知识库，存储常用知识内容，为AI对话提供上下文增强。",
                    Tags: findDefaultKnowledgeBase?.Tags ?? [],
                    IsDefault: findDefaultKnowledgeBase?.IsDefault ?? true,
                    CreatedFromUI: findDefaultKnowledgeBase?.CreatedFromUI ?? true
                })
            } catch (error) {
                failed(`知识库创建失败:` + error)
            }
        },
        {
            wait: 200
        }
    ).run

    const {runAsync, loading} = useRequest(
        async (params) => {
            const result = await ipcRenderer.invoke("CreateKnowledgeBaseV2", {
                Name: params.KnowledgeBaseName,
                Description: params.KnowledgeBaseDescription,
                Type: params.KnowledgeBaseType,
                Tags: params.Tags,
                IsDefault: params.IsDefault,
                CreatedFromUI: params.CreatedFromUI ?? true
            })
            const KnowledgeBaseID = result?.KnowledgeBase?.ID
            const hasKnowledgeBaseById = knowledgeBases.find((it) => it.ID === KnowledgeBaseID)
            if (hasKnowledgeBaseById) {
                editKnowledgeBase(KnowledgeBaseID, {
                    ...params
                })
            } else {
                addKnowledgeBase({...result.KnowledgeBase, ...params})
            }

            return "suecess"
        },
        {
            manual: true,
            onSuccess: () => success("创建知识库成功"),
            onError: (err) => failed(`创建知识库失败: ${err}`)
        }
    )

    return (
        <div className={styles["upload-dragger-box"]}>
            <YakitSpin spinning={loading}>
                <Dragger
                    className={styles["upload-dragger"]}
                    multiple={true}
                    style={{borderRadius: 8,backgroundColor: "var(--Colors-Use-Neutral-Bg)"}}
                    showUploadList={false}
                    beforeUpload={(_, fileList: any) => {
                        beforeUploadFun(fileList)
                        return false
                    }}
                >
                    <div className={styles["upload-info"]}>
                        <div className={styles["add-file-icon"]}>
                            <PropertyIcon />
                        </div>
                        <div className={styles["content"]}>
                            <div className={styles["title"]}>
                                可将文件拖入框内，或
                                <span className={styles["hight-light"]}>点击此处导入</span>
                                即可开始创建知识库
                            </div>
                            <div className={styles["sub-title"]}>数据会存到默认库，可选择多个文件</div>
                        </div>
                    </div>
                </Dragger>
            </YakitSpin>
        </div>
    )
}
export default DragKnowledge
