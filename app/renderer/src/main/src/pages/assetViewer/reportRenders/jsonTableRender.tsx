import React, {useEffect, useMemo, useState} from "react";
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

export interface ReportTableProp {
    data: string;
}

export const ReportMergeTable: React.FC<ReportTableProp> = (props) => {
    const { data: datas } = props;
    const { data, header } = JSON.parse(datas);
  
    const columns: { title: string; dataIndex: string; key: string }[] = (
      header as string[]
    ).map((item, index) => {
      if (index === 0) {
        return {
          title: item,
          dataIndex: `name-${index}`,
          key: `name-${index}`,
          render: (text: any, record: any, index: number) => {
            const firstRowIndex = data.findIndex(
              (item: string[]) => item[0] === text
            );
            if (index === firstRowIndex) {
              const count = data.filter(
                (item: string[]) => item[0] === text
              ).length;
              return {
                children: text,
                props: {
                  rowSpan: count,
                },
              };
            }
            return {
              children: null,
              props: {
                rowSpan: 0,
              },
            };
          },
        };
      }
      return {
        title: item,
        dataIndex: `name-${index}`,
        key: `name-${index}`,
      };
    });
    const dataSource = (data as string[][]).map((item, index) => {
      const info: { [key: string]: any } = {
        key: `${index}`,
      };
      for (let i in item) {
        info[`name-${i}`] = item[i];
      }
      return info;
    });
  
    return (
      <div>
        <Table
          tableLayout="fixed"
          bordered={true}
          columns={columns}
          dataSource={dataSource}
          pagination={false}
        ></Table>
      </div>
    );
  };
  
  interface DataProps {
    data: any[];
    type: string;
  }
  
  interface RiskTableProp {
    data: DataProps;
  }
  
  export const RiskTable: React.FC<RiskTableProp> = (props) => {
    const { data: datas } = props;
    const { data } = datas;
  
    const [header, setHeader] = useState<string[]>([]);
    const [dataSource, setDataSource] = useState<any[]>([]);
    useEffect(() => {
      let header: string[] = [];
      let tableData: any[] = [];
      data.map((item, index) => {
        let newArr: any = Object.entries(item);
        newArr.sort(function (a: any, b: any) {
          return a[1].sort - b[1].sort;
        });
        let itemData: any = {};
        newArr.map((itemIn: any[], indexIn: number) => {
          if (index === 0) {
            header.push(itemIn[0]);
          }
          itemData[`name-${indexIn}`] = itemIn[1];
        });
        tableData.push(itemData);
      });
      // console.log("tableData", tableData);
      setHeader(header);
      setDataSource(tableData);
    }, []);
  
    const columns = useMemo(() => {
      const initColumns: { title: string; dataIndex: string; key: string }[] = (
        header as string[]
      ).map((item, index) => {
        return {
          title: item,
          dataIndex: `name-${index}`,
          key: `name-${index}`,
          render: (text: any) => {
            return (
              <div style={text?.color ? { color: text.color } : {}}>
                {text?.value}
              </div>
            );
          },
        };
      });
      return initColumns;
    }, [header]);
  
    return (
      <div>
        <Table
          tableLayout="fixed"
          bordered={true}
          columns={columns}
          dataSource={dataSource}
          pagination={false}
        ></Table>
      </div>
    );
  };