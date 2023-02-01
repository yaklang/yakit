export interface WebShell {
    Id: number
    Url: string;
    Pass?: string;
    SecretKey: string;
    EncMode: string;
    Charset: string;
    ShellType: string;
    ShellScript: string;
    State?: boolean;
    Tag?: string;
    CreatedAt: number
    UpdatedAt?: number
}