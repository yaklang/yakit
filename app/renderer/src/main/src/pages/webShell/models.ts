export interface WebShellDetail {
    Id: string;
    Url: string;
    Pass: string;
    SecretKey: string;
    EncMode: string;
    Charset: string;
    ShellType: string;
    ShellScript: string;
    Status: boolean;
    Tag: string[];
    Proxy: string;
    Headers: { [key: string]: string };
    Remark: string;
    CreatedAt: number;
    UpdatedAt: number;
    PacketCodecName:string
    PayloadCodecName:string
}