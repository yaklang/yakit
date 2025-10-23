import React from "react"
import {Button, DatePicker, version} from "antd"

export const Main: React.FC = () => {
    return (
        <div>
            <h1>Antd version: {version}</h1>
            <DatePicker />
            <Button type='primary' style={{marginLeft: 8}}>
                Primary Button
            </Button>
        </div>
    )
}
