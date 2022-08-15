import React, {useState} from "react";
import {Button, Col, Form, Layout, Row} from "antd";
import {InputItem} from "@/utils/inputUtil";

export interface YakitEntryProp {

}

export const YakitEntry: React.FC<YakitEntryProp> = (props) => {
    const [loading, setLoading] = useState(false);

    return <Layout>
        <Row>
            <Col span={24} style={{textAlign: "center"}}>
                <div>
                    <Form style={{textAlign: "center"}} onSubmitCapture={e => {
                        e.preventDefault()

                        setLoading(true)
                        setTimeout(() => setLoading(false), 1000)

                    }}>
                        <InputItem label={"管理员权限"}/>
                        <InputItem label={"默认端口"}/>
                        <InputItem label={"数据库文件"}/>
                        <Form.Item colon={false} label={" "}>
                            <Button loading={loading} type="primary" htmlType="submit"> 启动引擎并连接 </Button>
                        </Form.Item>
                    </Form>
                </div>
            </Col>
        </Row>
    </Layout>
};