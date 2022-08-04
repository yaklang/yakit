import React, {useState, useEffect} from "react"
import {Form, Modal, Select} from "antd"
import {useDebounceFn, useMemoizedFn} from "ahooks"
import {API} from "@/services/swagger/resposeType"
import {NetWorkApi} from "@/services/fetch"
import {UserQuery} from "@/pages/TrustList"
import {failed, success} from "@/utils/notification"
import {OnlineUserItem} from "@/components/OnlineUserItem"

const {Option} = Select

interface EditOnlinePluginDetailsProps {
    pulgin: API.YakitPluginDetail
    visible: boolean
    handleOk: () => void
    handleCancel: () => void
}

const layout = {
    labelCol: {span: 4},
    wrapperCol: {span: 20}
}

const EditOnlinePluginDetails: React.FC<EditOnlinePluginDetailsProps> = (props) => {
    const {visible, pulgin} = props
    const [userList, setUserList] = useState<API.UserOrdinaryResponse>({
        data: []
    })
    const [appid, setAppid] = useState<string>("")
    const [currentUser, setCurrentUser] = useState<string>()
    const [loading, setLoading] = useState<boolean>(false)
    const [form] = Form.useForm()
    const handleOk = useMemoizedFn(() => {
        form.validateFields()
            .then((value) => {
                const params: API.UpdatePluginUser = {
                    ...value,
                    uuid: pulgin.uuid
                }
                updatePluginUser(params)
            })
            .catch((err) => {
            })
        // props.handleOk()
    })
    const updatePluginUser = useMemoizedFn((params: API.UpdatePluginUser) => {
        setLoading(true)
        NetWorkApi<API.UpdatePluginUser, API.ActionSucceeded>({
            method: "post",
            url: "update/plugin/user",
            data: {
                ...params
            }
        })
            .then((res) => {
                success("修改插件作者成功")
                onReset()
                props.handleOk()
            })
            .catch((err) => {
                failed("修改插件作者失败：" + err)
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 200)
            })
    })
    const handleCancel = useMemoizedFn(() => {
        onReset()
        props.handleCancel()
    })
    const onReset = useMemoizedFn(() => {
        setUserList({
            data: []
        })
        form.resetFields()
    })
    const getUserList = useDebounceFn(
        useMemoizedFn((str: string) => {
            NetWorkApi<UserQuery, API.UserOrdinaryResponse>({
                method: "get",
                url: "user/ordinary",
                params: {
                    keywords: str || "all"
                }
            })
                .then((res) => {
                    setUserList(res)
                })
                .catch((err) => {
                    failed("获取普通用户失败：" + err)
                })
                .finally(() => {
                    // setTimeout(() => setLoading(false), 200)
                })
        }),
        {wait: 200}
    ).run
    return (
        <Modal
            title='修改作者'
            okText='确定'
            cancelText='取消'
            visible={visible}
            onOk={handleOk}
            onCancel={handleCancel}
            confirmLoading={loading}
        >
            <Form {...layout} form={form} name='control-hooks'>
                <Form.Item name='user_id' label='作者' rules={[{required: true, message: "该项为必填"}]}>
                    <Select
                        optionLabelProp='label'
                        filterOption={() => true}
                        placeholder='请输入用户名称搜索'
                        showSearch
                        onSearch={getUserList}
                    >
                        {(userList.data || []).map((info) => (
                            <Option value={info.id} key={info.id} label={info.name}>
                                <OnlineUserItem info={info} />
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
            </Form>
        </Modal>
    )
}

export default EditOnlinePluginDetails
