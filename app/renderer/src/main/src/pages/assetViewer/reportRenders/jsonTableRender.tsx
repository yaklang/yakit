import React, {useEffect, useState} from "react";
import {ReportItemRenderProp} from "./render";
import {Table} from "antd";

export interface JSONTableRenderProp extends ReportItemRenderProp {

}

export const JSONTableRender: React.FC<JSONTableRenderProp> = (props) => {
    const [header, setHeader] = useState<string[]>([]);
    const [data, setData] = useState<object[]>([]);

    useEffect(() => {
        try {
            const _data = JSON.parse(props.item.content) as { header: string[], data: string[][] };
            const {header, data} = _data;
            setHeader(header)
            setData(data.map((i, _index) => {
                const obj = {_index};
                for (let pIndex = 0; pIndex < header.length; pIndex++) {
                    if (i === null || i === undefined) {
                        return {_index: -1}
                    }
                    if (pIndex >= i.length) {
                        obj[header[pIndex]] = ""
                    } else {
                        obj[header[pIndex]] = i[pIndex]
                    }
                }
                console.info(obj)
                return obj
            }).filter(i => i._index >= 0) as object[])
        } catch (e) {
            console.info(e)
        }
    }, [props.item])

    return <Table
        style={{marginTop: 12}}
        size={"small"}
        pagination={false}
        columns={header.map(i => {
            return {title: i, dataIndex: i}
        })} rowKey={"_index"}
        dataSource={data}>

    </Table>
};