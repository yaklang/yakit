import React, {useEffect, useRef, useState} from "react"
import {Form, Select, Progress, Cascader} from "antd"
import {useMemoizedFn, useThrottleFn, useGetState} from "ahooks"
import {failed, success, warn} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import {
    FileProjectInfoProps,
    ProjectDescription,
    ProjectIOProgress,
    ProjectsResponse
} from "./softwareSettings/ProjectManage"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {ChevronDownIcon} from "@/assets/newIcon"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import YakitCascader from "@/components/yakitUI/YakitCascader/YakitCascader"

const {ipcRenderer} = window.require("electron")

export interface SelectUploadProps {
    onCancel: () => void
}

interface CascaderValueProps {
    Id: string
    DatabasePath: string
}

const layout = {
    labelCol: {span: 5},
    wrapperCol: {span: 16}
}

const SelectUpload: React.FC<SelectUploadProps> = (props) => {
    const {onCancel} = props
    const [loading, setLoading] = useState<boolean>(false)
    const [allowPassword, setAllowPassword] = useState<"0" | "1" | "2">()
    const [token, _] = useState(randomString(40))
    const [uploadToken, __] = useState(randomString(40))
    const [form] = Form.useForm()
    const [percent, setPercent] = useState<number>(0.0)
    const filePath = useRef<string>()
    const [cascaderValue, setCascaderValue] = useState<CascaderValueProps>()

    const [data, setData, getData] = useGetState<FileProjectInfoProps[]>([])

    /** @name 导出实体项目文件过程是否产生错误(如果产生错误，阻止通道结束后的上传操作) */
    const hasErrorRef = useRef<boolean>(false)
    // 是否取消
    const isCancle = useRef<boolean>(false)

    const uploadFile = useMemoizedFn(async () => {
        if (isCancle.current) return
        setPercent(allowPassword === "2" ? 0.01 : 0.51)
        await ipcRenderer
            .invoke("split-upload", {url: "import/project", path: filePath.current, token: uploadToken})
            .then((TaskStatus) => {
                if (isCancle.current) return
                if (TaskStatus) {
                    setPercent(1)
                    success("上传数据成功")
                    setTimeout(() => {
                        onCancel()
                    }, 200)
                } else {
                    failed(`项目上传失败`)
                }
            })
            .catch((err) => {
                failed(`项目上传失败:${err}`)
            })
            .finally(() => {
                if (isCancle.current) return
                setTimeout(() => {
                    setLoading(false)
                    setPercent(0)
                }, 200)
            })
    })

    useEffect(() => {
        ipcRenderer.on(`callback-split-upload-${uploadToken}`, async (e, res: any) => {
            if (isCancle.current) return
            const {progress} = res
            let newProgress = progress
            if (newProgress === 100) {
                newProgress = 99
            }
            if (newProgress === 0) {
                newProgress = 1
            }
            let intProgress = newProgress / 100
            if (allowPassword === "2") {
                setPercent(intProgress)
            } else {
                setPercent(intProgress * 0.5 + 0.5)
            }
        })
        return () => {
            ipcRenderer.removeAllListeners(`callback-split-upload-${uploadToken}`)
        }
    }, [allowPassword])

    const cancleUpload = () => {
        ipcRenderer.invoke("cancel-ExportProject", token)
        ipcRenderer.invoke("cancle-split-upload").then(() => {
            warn("取消上传成功")
            setLoading(false)
            setPercent(0)
            isCancle.current = true
        })
    }

    useEffect(() => {
        if (!token) {
            return
        }
        ipcRenderer.on(`${token}-data`, async (e, data: ProjectIOProgress) => {
            if (!!data.TargetPath) {
                filePath.current = data.TargetPath.replace(/\\/g, "\\")
            }
            if (data.Percent > 0) {
                if (isCancle.current) return
                setPercent(data.Percent * 0.5)
            }
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            hasErrorRef.current = true
            setLoading(false)
            failed(`[ExportProject] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            if (hasErrorRef.current) return
            uploadFile()
        })

        return () => {
            ipcRenderer.invoke("cancel-ExportProject", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [token])

    const onFinish = useMemoizedFn((values) => {
        if (!cascaderValue) return
        setLoading(true)
        isCancle.current = false
        if (allowPassword === "2") {
            // 直接上传 不走ExportProject 直接读取项目 default-yakit.db
            filePath.current = cascaderValue.DatabasePath
            uploadFile()
            return
        }
        hasErrorRef.current = false
        ipcRenderer.invoke(
            "ExportProject",
            {
                Id: cascaderValue.Id,
                Password: allowPassword === "1" ? values.password || "" : ""
            },
            token
        )
    })

    const fetchChildNode = useMemoizedFn((selectedOptions: FileProjectInfoProps[]) => {
        const targetOption = selectedOptions[selectedOptions.length - 1]
        targetOption.loading = true
        ipcRenderer
            .invoke("GetProjects", {
                FolderId: +targetOption.Id,
                Pagination: {Page: 1, Limit: 1000, Order: "desc", OrderBy: "updated_at"}
            })
            .then((rsp: ProjectsResponse) => {
                try {
                    setTimeout(() => {
                        if (rsp.Projects.length === 0) {
                            targetOption.children = [] // 为空数组
                        } else {
                            targetOption.children = [...rsp.Projects].map((item) => {
                                const info: FileProjectInfoProps = {...item}
                                if (info.Type === "file") {
                                    info.isLeaf = false
                                } else {
                                    info.isLeaf = true
                                }
                                return info
                            })
                        }
                        targetOption.loading = false
                        setData([...getData()])
                    }, 300)
                } catch (e) {
                    failed("处理项目数据失败: " + `${e}`)
                }
            })
            .catch((e) => {
                failed(`查询 Projects 失败：${e}`)
            })
    })

    const fetchFirstList = useMemoizedFn(() => {
        const param = {
            Pagination: {Page: 1, Limit: 1000, Order: "desc", OrderBy: "updated_at"}
        }

        ipcRenderer
            .invoke("GetProjects", param)
            .then((rsp: ProjectsResponse) => {
                try {
                    setData(
                        rsp.Projects.map((item) => {
                            const info: FileProjectInfoProps = {...item}
                            if (info.Type === "file") {
                                info.isLeaf = false
                            } else {
                                info.isLeaf = true
                            }
                            return info
                        })
                    )
                } catch (e) {
                    failed("处理项目数据失败: " + `${e}`)
                }
            })
            .catch((e) => {
                failed(`查询 Projects 失败：${e}`)
            })
    })

    useEffect(() => {
        fetchFirstList()
    }, [])

    return (
        <Form {...layout} form={form} onFinish={onFinish}>
            <Form.Item name='allow_password' label='上传方式' rules={[{required: true, message: "该项为必填"}]}>
                <YakitSelect disabled={loading} placeholder='请选择加密方式' onChange={setAllowPassword}>
                    <YakitSelect.Option value='1'>加密上传</YakitSelect.Option>
                    <YakitSelect.Option value='0'>压缩上传</YakitSelect.Option>
                    <YakitSelect.Option value='2'>直接上传</YakitSelect.Option>
                </YakitSelect>
            </Form.Item>
            {allowPassword === "1" && (
                <Form.Item name='password' label='密码' rules={[{required: true, message: "该项为必填"}]}>
                    <YakitInput disabled={loading} placeholder='请输入密码' />
                </Form.Item>
            )}
            <Form.Item name='name' label='项目' rules={[{required: true, message: "该项为必填"}]}>
                <YakitCascader
                    disabled={loading}
                    options={data}
                    placeholder='请选择项目'
                    fieldNames={{label: "ProjectName", value: "Id", children: "children"}}
                    loadData={(selectedOptions) => fetchChildNode(selectedOptions as any)}
                    showCheckedStrategy='SHOW_CHILD'
                    onChange={(value, selectedOptions) => {
                        if (
                            selectedOptions.length > 0 &&
                            selectedOptions[selectedOptions.length - 1].Type === "project"
                        ) {
                            const item = selectedOptions[selectedOptions.length - 1]
                            setCascaderValue({Id: item.Id, DatabasePath: item.DatabasePath})
                        }
                    }}
                    suffixIcon={<ChevronDownIcon style={{color: "var(--yakit-body-text-color)"}} />}
                />
            </Form.Item>
            {percent > 0 && (
                <div style={{width: 276, margin: "0 auto", paddingBottom: 14}}>
                    <Progress percent={Math.floor((percent || 0) * 100)} />
                </div>
            )}
            <div style={{textAlign: "center"}}>
                {loading ? (
                    <YakitButton style={{width: 200}} type='primary' onClick={cancleUpload}>
                        取消
                    </YakitButton>
                ) : (
                    <YakitButton style={{width: 200}} type='primary' htmlType='submit'>
                        确定
                    </YakitButton>
                )}
            </div>
        </Form>
    )
}

export default SelectUpload
