import React, {ReactNode, useEffect, useRef, useState} from "react"
import {Space, Tag, Progress, Divider, Form, Input, Button, Cascader, Spin} from "antd"
import {AutoCard} from "@/components/AutoCard"
import {} from "@ant-design/icons"
import styles from "./SimbleDetect.module.scss"
import classNames from "classnames"
import {ContentUploadInput} from "@/components/functionTemplate/ContentUploadTextArea"
import {failed, info, success} from "@/utils/notification"
import ReactResizeDetector from "react-resize-detector"
import {RisksViewer} from "@/pages/risks/RisksViewer"
const {TextArea} = Input
const {ipcRenderer} = window.require("electron")
interface Option {
    value: string | number
    label: string
    children?: Option[]
}
const options: Option[] = [
    {
        value: "zhejiang",
        label: "基础扫描"
    },
    {
        value: "zhejiang1",
        label: "深度扫描"
    },
    {
        value: "jiangsu",
        label: "自定义",
        children: [
            {
                value: "nanjing",
                label: "Nanjing",
                children: [
                    {
                        value: "zhonghuamen",
                        label: "Zhong Hua Men"
                    }
                ]
            }
        ]
    }
]
const layout = {
    labelCol: {span: 6},
    wrapperCol: {span: 16}
}
interface SimbleDetectFormProps {}
export const SimbleDetectForm: React.FC<SimbleDetectFormProps> = (props) => {
    const [form] = Form.useForm()
    const [loading, setLoading] = useState<boolean>(false)
    const [executing, setExecuting] = useState<boolean>(false)
    const onFinish = () => {}

    const onCancel = () => {}
    return (
        <div className={styles["simble-detect-form"]} style={{marginTop: 20}}>
            <Form {...layout} form={form} onFinish={onFinish}>
                <Spin spinning={false}>
                    <ContentUploadInput
                        type='textarea'
                        beforeUpload={(f) => {
                            const typeArr: string[] = [
                                "text/plain",
                                ".csv",
                                ".xls",
                                ".xlsx",
                                "application/vnd.ms-excel",
                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            ]
                            if (!typeArr.includes(f.type)) {
                                failed(`${f.name}非txt、Excel文件，请上传txt、Excel格式文件！`)
                                return false
                            }

                            return false
                        }}
                        item={{
                            style: {textAlign: "left"},
                            label: "扫描目标:"
                        }}
                        textarea={{
                            isBubbing: true,
                            setValue: (Targets) => {},
                            value: "",
                            rows: 1,
                            placeholder: "内容规则 域名(:端口)/IP(:端口)/IP段，如需批量输入请在此框以逗号分割"
                        }}
                        otherHelpNode={
                            <span onClick={() => {}} className={styles["help-hint-title"]}>
                                未完成任务
                            </span>
                        }
                        suffixNode={
                            loading ? (
                                <Button type='primary' danger onClick={(e) => {}}>
                                    立即停止任务
                                </Button>
                            ) : (
                                <Button type='primary' htmlType='submit'>
                                    开始检测
                                </Button>
                            )
                        }
                    />
                </Spin>
                <Form.Item name='user_name1' label='扫描模式'>
                    <Cascader options={options} placeholder='请选择扫描模式' style={{width: 400}} />
                </Form.Item>
            </Form>
        </div>
    )
}

export interface SimbleDetectTableProps {}

export const SimbleDetectTable: React.FC<SimbleDetectTableProps> = (props) => {
    const [tableContentHeight, setTableContentHeight] = useState<number>(0)
    return (
        <div className={styles["simble-detect-table"]}>
            <div className={styles["result-notice-body"]}>
                <div className={styles["notice-body"]}>
                    <div className={styles["notice-body-header notice-font-in-progress"]}>执行中状态</div>
                    {/* <div className="notice-body-counter">{progressRunning}进程 / {scanTaskExecutingCount}任务</div> */}
                </div>
                <Divider type='vertical' className={styles["notice-divider"]} />
                <div className={styles["notice-body"]}>
                    <div className={styles["notice-body-header notice-font-completed"]}>已结束/总进程</div>
                    {/* <div className="notice-body-counter">{progressFinished}/{progressTotal}</div> */}
                </div>
                <Divider type='vertical' className={styles["notice-divider"]} />
                <div className={styles["notice-body"]}>
                    <div className={styles["notice-body-header notice-font-vuln"]}>命中风险/漏洞</div>
                    {/* <div className="notice-body-counter">{jsonRisks.length}</div> */}
                </div>
            </div>

            <Divider style={{margin: 4}} />

            <div className={styles["result-table-body"]}>
                <div style={{width: "100%", height: "100%"}}>
                    <ReactResizeDetector
                        onResize={(width, height) => {
                            if (!width || !height) return
                            setTableContentHeight(height - 4)
                        }}
                        handleWidth={true}
                        handleHeight={true}
                        refreshMode={"debounce"}
                        refreshRate={50}
                    />
                    <RisksViewer risks={[]} tableContentHeight={tableContentHeight} />
                </div>
            </div>
        </div>
    )
}

export interface SimbleDetectProps {}

export const SimbleDetect: React.FC<SimbleDetectProps> = (props) => {
    const [percent, setPercent] = useState(0)
    return (
        <AutoCard
            title={null}
            size={"small"}
            bordered={false}
            extra={
                null
                // <Space>
                //     {percent > 0 && (
                //         <div style={{width: 200}}>
                //             <Progress status={"active"} percent={parseInt((percent * 100).toFixed(0))} />
                //         </div>
                //     )}
                // </Space>
            }
            bodyStyle={{display: "flex", flexDirection: "column", padding: "0 5px", overflow: "hidden"}}
        >
            <SimbleDetectForm />
            <Divider style={{margin: 4}} />
            <div style={{flex: "1", overflow: "hidden"}}>
                <SimbleDetectTable />
            </div>
        </AutoCard>
    )
}
