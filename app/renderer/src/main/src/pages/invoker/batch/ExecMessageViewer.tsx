import React from "react";
import {ExecResult} from "../schema";
import {Alert, Button, Card, Progress, Space, Tag, Timeline, Typography} from "antd";
import {YakitLogFormatter} from "../YakitLogFormatter";
import {formatTime, formatTimestamp} from "../../../utils/timeUtil";
import {LogLevelToCode} from "../../../components/HTTPFlowTable/HTTPFlowTable";
import {showModal} from "../../../utils/showModal";
import {Header} from "antd/es/layout/layout";
import {useMemoizedFn} from "ahooks";

const {Text} = Typography;


export interface ExecResultMessage {
    type: "log" | "progress" | string
    content: ExecResultLog | ExecResultProgress
}

export interface ExecResultLog {
    level: string
    data: string | any
    timestamp: number
}

export interface ExecResultProgress {
    progress: number
    id: string
}
