import React, {useState} from "react";
import {Button, PageHeader, Space} from "antd";
import {AutoCard} from "@/components/AutoCard";
import {ResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox";
import {HTTPPacketEditor} from "@/utils/editors";
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {MatcherForm} from "@/pages/matcherextractor/MatcherForm";

export interface MatcherExtractorPageProp {

}

export const MatcherExtractorPage: React.FC<MatcherExtractorPageProp> = (props) => {
    const [data, setData] = useState("");
    return <AutoCard title={"匹配提取调试"} bodyStyle={{overflow: "hidden"}}>
        <div style={{height: "100%"}}>
            <ResizeBox
                isVer={true}
                firstNode={<HTTPPacketEditor
                    noHeader={true}
                    originValue={StringToUint8Array(data)} onChange={e => setData(Uint8ArrayToString(e))}
                />}
                secondNode={<AutoCard>
                    <ResizeBox
                        isVer={false}
                        firstNode={<div>
                            <MatcherForm/>
                        </div>}
                        secondNode={<div>
                            2
                        </div>}
                    />
                </AutoCard>}
            />
        </div>
    </AutoCard>
};