import React, {useEffect, useState} from "react";
import {Button, Card, Layout, List, PageHeader, Row} from "antd";
import {ReloadOutlined} from "@ant-design/icons";
import {SwitchItem} from "../../utils/inputUtil";

const {ipcRenderer} = window.require("electron");

export interface BrutePageProp {

}

export const BrutePage: React.FC<BrutePageProp> = (props) => {
    const [availableTypes, setAvailableTypes] = useState<string[]>([]);
    const [typeLoading, setTypeLoading] = useState(false);
    const [selectedType, setSelectedType] = useState<string[]>([]);

    const loadTypes = () => {
        setTypeLoading(true);
        ipcRenderer.invoke("GetAvailableBruteTypes").then((d: { Types: string[] }) => {
            setAvailableTypes(d.Types)

            if (selectedType.length <= 0 && d.Types.length > 0) {
                setSelectedType([d.Types[0]])
            }
        }).catch(e => {
        }).finally(() => setTimeout(() => setTypeLoading(false), 300))
    }

    useEffect(() => {
        loadTypes()
    }, [])

    return <div>
        <div style={{height: "100%", backgroundColor: "#999", width: "100%", display: "flex", flexDirection: "row"}}>
            <div style={{width: 240}}>
                <Card
                    loading={typeLoading}
                    size={"small"}
                    style={{marginRight: 8}} bodyStyle={{padding: 8}}
                    title={<div>
                        可用爆破类型 <Button
                        type={"link"}
                        size={"small"}
                        icon={<ReloadOutlined/>}
                        onClick={() => {
                            loadTypes()
                        }}
                    />
                    </div>}
                >
                    <List<string>
                        dataSource={availableTypes}
                        renderItem={i => {
                            const included = selectedType.includes(i);
                            return <div key={i} style={{margin: 4}}>
                                <SwitchItem label={i} value={included} setValue={
                                    ()=>{
                                        if (included) {
                                            setSelectedType([...selectedType.filter(target => i !== target)])
                                        } else {
                                            setSelectedType([...selectedType.filter(target => i !== target), i])
                                        }
                                    }
                                }/>
                                {/*<Button*/}
                                {/*    type={included ? "primary" : "link"}*/}
                                {/*    style={{width: "100%", backgroundColor: included ? "#91d5ff" : undefined}}*/}
                                {/*    onClick={() => {*/}

                                {/*    }}*/}
                                {/*>{i}</Button>*/}
                            </div>
                        }}
                    />
                </Card>
            </div>
            <div style={{flex: "1 1", height: 100, backgroundColor: "green"}}>

            </div>
        </div>
    </div>
};