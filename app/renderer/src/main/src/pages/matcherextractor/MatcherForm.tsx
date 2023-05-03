import React, {useState} from "react";
import {Form} from "antd";
import {InputItem, SelectOne} from "@/utils/inputUtil";
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";

export interface MatcherFormProp {

}

interface MatcherItem {
    MatcherType: string
    ExprType: "nuclei-dsl"
    Scope: string
    Group: string[]
    Condition: string
    Negative: boolean
}

export const MatcherForm: React.FC<MatcherFormProp> = (props) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [matchers, setMatchers] = useState<MatcherItem[]>([{
        MatcherType: "word",
        ExprType: "nuclei-dsl",
        Scope: "body",
        Group: [""],
        Condition: "and",
        Negative: false,
    }]);
    
    const current = matchers[currentIndex];

    return <div>

    </div>
};

interface MatcherItemFormProp {
    matcher: MatcherItem
    onMatcherChange: (matcher: MatcherItem) => any
}

const MatcherItemForm: React.FC<MatcherItemFormProp> = (props) => {
    const [params, setParams] = useState(props.matcher)
    return <Form>
        <SelectOne
            label={"匹配类型"}
            data={[
                {text: "关键字", value: "word"},
                {text: "正则表达式", value: "regex"},
                {text: "状态码", value: "status_code"},
                {text: "十六进制", value: "binary"},
                {text: "表达式", value: "nuclei-dsl"},
            ]}
            setValue={MatcherType => setParams({...params, MatcherType})} value={params.MatcherType}
        />
        <SelectOne
            label={"匹配位置"}
            data={[
                {text: "状态码", value: "status_code"},
                {text: "响应头", value: "all_headers"},
                {text: "响应体", value: "body"},
                {text: "全部响应", value: "raw"},
            ]}
            setValue={Scope => setParams({...params, Scope})} value={params.Scope}
        />
        {params.Group.map((data, index) => {
            return <InputItem
                label={`Data_${index}`}
                value={data}
                setValue={value => {
                    const newGroup = params.Group;
                    newGroup[index] = value;
                    setParams({...params, Group: newGroup})
                }}
            />
        })}
        <Form.Item label={" "} colon={false}>
            <YakitButton onClick={()=>{
                setParams({...params, Group: [...params.Group, ""]})
            }}>添加一个新条件</YakitButton>
        </Form.Item>
        <SelectOne
            label={"条件关系"}
            data={[
                {text: "AND", value: "and"},
                {text: "OR", value: "or"},
            ]}
            setValue={Condition => setParams({...params, Condition})} value={params.Condition}
        />
        <Form.Item label={"不匹配（取反）"}>
            <YakitSwitch checked={params.Negative} onChange={e => setParams({...params, Negative: e})}/>
        </Form.Item>
    </Form>
};