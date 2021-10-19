export interface PortAsset {
    CPE: string[];
    Host: string;
    IPInteger?: number;
    Port: number;
    Proto: string;
    ServiceType: string;
    State: string;
    Reason: string;
    Fingerprint: string;
    HtmlTitle: string;
    Id: number;
    CreatedAt: number;
    UpdatedAt: number;
}