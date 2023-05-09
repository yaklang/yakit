export interface CVEDetail {
    CVE: string;
    DescriptionZh: string;
    DescriptionOrigin: string;
    Title: string;
    Solution: string;
    References: string;
    AccessVector: string;
    AccessComplexity: string;
    Authentication: string;
    ConfidentialityImpact: string;
    IntegrityImpact: string;
    AvailabilityImpact: string;
    Severity: string;
    UpdatedAt: number;
    PublishedAt: number;
    CWE: string;
    CVSSVersion: string;
    CVSSVectorString: string;
    BaseCVSSv2Score: number;
    ExploitabilityScore: number;
    ObtainAllPrivileged: boolean;
    ObtainUserPrivileged: boolean;
    ObtainOtherPrivileged: boolean;
    UserInteractionRequired: boolean;
    Product: string;
    LastModifiedData : number
}


export interface CWEDetail {
    CWE: string;
    Name: string;
    NameZh: string;
    Status: string;
    Stable: boolean;
    Incomplete: boolean;
    Description: string;
    DescriptionZh: string;
    LongDescription: string;
    LongDescriptionZh: string;
    RelativeLanguage: string[];
    Solution: string;
    RelativeCVE: string[];
}

export interface CVEDetailEx {
    CVE: CVEDetail;
    CWE: CWEDetail[];
}