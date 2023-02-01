import React, {ReactNode, useEffect, useRef, useState} from "react"
import {Button, Input, Form, Select, Spin} from "antd"
import {useMemoizedFn, useThrottleFn, useGetState} from "ahooks"
import {failed, success, warn,info} from "@/utils/notification"
import {API} from "@/services/swagger/resposeType"
import {PaginationSchema} from "./invoker/schema"
import {ProjectsResponse, ProjectDescription,ProjectIOProgress} from "./projects/ProjectPage"
import {randomString} from "@/utils/randomUtil";

import {} from "@ant-design/icons"
const {Option} = Select
const {ipcRenderer} = window.require("electron")

export interface SelectUploadProps {
    onCancel: (v: boolean) => void
}
const layout = {
    labelCol: {span: 5},
    wrapperCol: {span: 16}
}

const SelectUpload: React.FC<SelectUploadProps> = (props) => {
    const {onCancel} = props
    const [loading, setLoading] = useState<boolean>(false)
    const [selectLoading, setSelectLoading] = useState<boolean>(true)
    const [pagination, setPagination, getPagination] = useGetState<PaginationSchema>({
        Limit: 20,
        Order: "desc",
        OrderBy: "updated_at",
        Page: 1
    })
    const [projectList, setProjectList] = useState<ProjectDescription[]>([])
    const [allowPassword, setAllowPassword] = useState<"0"|"1">()
    const [token, _] = useState(randomString(40));
    const [form] = Form.useForm()

    useEffect(() => {
        if (!token) {
            return
        }
        ipcRenderer.on(`${token}-data`, async (e, data: ProjectIOProgress) => {
            console.log("data",data)
            if (!!data.Verbose) {
            }
            if (data.Percent > 0) {
            }
            if (!!data.TargetPath) {
            }
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            failed(`[ExportProject] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            setLoading(false)
            info("[ExportProject] finished")
        })

        return () => {
            ipcRenderer.invoke("cancel-ExportProject", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [token])

    useEffect(() => {
        getProjectData()
    }, [])

    const onFinish = useMemoizedFn((values) => {
        console.log("values",values)
        ipcRenderer.invoke("ExportProject", {
            ProjectName: values.name,
            Password: allowPassword==="1" ? values.password : ""
        }, token)
    })

    const {run} = useThrottleFn(
        () => {
            getProjectData(getPagination().Page + 1)
        },
        {wait: 500}
    )

    const getProjectData = (page?: number, limit?: number) => {
        // 加载角色列表
        setSelectLoading(true)
        const paginationProps = {
            Page: page || pagination.Page,
            Limit: limit || pagination.Limit
        }
        ipcRenderer
            .invoke("GetProjects", {
                Pagination: {...paginationProps, Order: pagination.Order, OrderBy: pagination.OrderBy}
            })
            .then((rsp: ProjectsResponse) => {
                try {
                    setProjectList(rsp.Projects)
                    setPagination({...getPagination(), Limit: rsp.Pagination.Limit, Page: rsp.Pagination.Page})
                } catch (e) {
                    failed("处理项目数据失败: " + `${e}`)
                }
            })
            .catch((e) => {
                failed(`查看全部 Projects 失败：${e}`)
            })
            .finally(() => setTimeout(() => setSelectLoading(false), 300))
    }
    const selectDropdown = useMemoizedFn((originNode: React.ReactNode) => {
        return (
            <div>
                <Spin spinning={selectLoading}>{originNode}</Spin>
            </div>
        )
    })
    return (
        <Form {...layout} form={form} onFinish={onFinish}>
            <Form.Item name='allow_password' label='加密方式' rules={[{required: true, message: "该项为必填"}]}>
                <Select placeholder='请选择加密方式' onChange={setAllowPassword}>
                    <Option value='1'>加密上传</Option>
                    <Option value='0'>明文上传</Option>
                </Select>
            </Form.Item>
            {allowPassword === "1" && (
                <Form.Item name='password' label='密码' rules={[{required: true, message: "该项为必填"}]}>
                    <Input placeholder='请输入密码' />
                </Form.Item>
            )}
            <Form.Item name='name' label='项目' rules={[{required: true, message: "该项为必填"}]}>
                <Select
                    showSearch
                    placeholder='请选择项目'
                    optionFilterProp='children'
                    filterOption={(input, option) =>
                        (option!.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                    }
                    onPopupScroll={(e) => {
                        const {target} = e
                        const ref: HTMLDivElement = target as unknown as HTMLDivElement
                        if (ref.scrollTop + ref.offsetHeight + 20 >= ref.scrollHeight) {
                            run()
                        }
                    }}
                    dropdownRender={(originNode: React.ReactNode) => selectDropdown(originNode)}
                >
                    {projectList.map((item) => (
                        <Option key={item.Id} value={item.ProjectName}>
                            {item.ProjectName}
                        </Option>
                    ))}
                </Select>
            </Form.Item>
            <div style={{textAlign: "center"}}>
                <Button style={{width: 200}} type='primary' htmlType='submit' loading={loading}>
                    确定
                </Button>
            </div>
        </Form>
    )
}

export default SelectUpload
