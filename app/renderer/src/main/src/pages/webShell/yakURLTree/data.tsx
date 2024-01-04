import React from "react";

export interface YakURLResource {
    ResourceType: string;
    VerboseType: string;
    ResourceName: string;
    VerboseName: string;
    Size: number;
    SizeVerbose: string;
    ModifiedTimestamp: number;
    Path: string;
    YakURLVerbose: string;
    Url: YakURL; // Assuming YakURL is another interface
    Extra: YakURLKVPair[]; // Assuming KVPair is another interface
    HaveChildrenNodes: boolean;
}

export interface YakURLKVPair {
    Key: string;
    Value: string;
}

export interface YakURL {
    FromRaw: string;
    Schema: string;
    User: string;
    Pass: string;
    Location: string;
    Path: string;
    Query: YakURLKVPair[];
}

export interface RequestYakURLResponse {
    Page: number;
    PageSize: number;
    Total: number;
    Resources: YakURLResource[];
}
