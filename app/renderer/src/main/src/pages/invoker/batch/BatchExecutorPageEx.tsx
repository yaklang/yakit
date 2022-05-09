import React, {useState} from "react";
import {ResizeBox} from "../../../components/ResizeBox";
import {QueryYakScriptParamSelector, SimpleQueryYakScriptSchema} from "./QueryYakScriptParam";
import {BatchExecuteByFilter} from "./BatchExecuteByFilter";

export interface BatchExecutorPageExProp {

}

export const BatchExecutorPageEx: React.FC<BatchExecutorPageExProp> = (props) => {
    const [simpleQuery, setSimpleQuery] = useState<SimpleQueryYakScriptSchema>({
        exclude: [],
        include: [],
        tags: "",
        type: "mitm,port-scan,nuclei"
    })


    return <ResizeBox
        firstNode={(
            <>
                <QueryYakScriptParamSelector
                    params={simpleQuery}
                    onParams={(param) => {
                        setSimpleQuery({...param})
                    }}
                />
            </>
        )}
        firstMinSize={300}
        firstRatio={"300px"}
        secondNode={(
            <BatchExecuteByFilter simpleQuery={simpleQuery}/>
        )}
    >

    </ResizeBox>
};