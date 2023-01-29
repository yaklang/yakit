import React, {useState} from "react";
import {PageHeader} from "antd";
import {AutoCard} from "@/components/AutoCard";

export interface ProjectPageProp {

}

export interface ProjectDescription {
    Id: number
    ProjectName: string
    Description: string
    CreatedAt: number
    DatabasePath: string
}

export const ProjectPage: React.FC<ProjectPageProp> = (props) => {
    const [current, setCurrent] = useState<ProjectDescription>();
    const [reason, setReason] = useState("");
    const [limit, setLimit] = useState(10);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [projects, setProjects] = useState<ProjectDescription[]>([]);

    return <AutoCard bordered={false} title={"项目管理"} size={"small"}>
        Hello 1
    </AutoCard>
};