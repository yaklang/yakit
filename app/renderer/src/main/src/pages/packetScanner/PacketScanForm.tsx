import React from "react";
import {Form} from "antd";

export interface PacketScanFormProp {

}

export const PacketScanForm: React.FC<PacketScanFormProp> = (props) => {
    return <Form onSubmitCapture={e => {
        e.preventDefault()


    }}>

    </Form>
};