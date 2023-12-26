declare module "fs" {
    interface FileItem extends File {
        path: string
        size: number
        type: string
        lastModifiedDate: number
    }
}
