import React from "react";

export interface ChaosMakerRule {
    Id: number;
    RawTrafficBeyondIpPacketBase64: string;
    RawTrafficBeyondLinkLayerBase64: string;
    RawTrafficBeyondHttpBase64: string;
    RuleType: string;
    SuricataRaw: string;
    Protocol: string;
    Action: string;
    Name: string;
    NameZh: string;
    ClassType: string;
    ClassTypeZh: string;
    Group: string;
    Keywords: string;
    KeywordsZh: string;
    Description: string;
    DescriptionZh: string;
    CVE: string[]
}
