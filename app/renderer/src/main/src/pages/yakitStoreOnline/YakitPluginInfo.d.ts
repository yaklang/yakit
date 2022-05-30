export interface PluginStoreProps {
    authors?: string
    content?: string
    created_at?: number | null
    default_open: boolean
    downloaded_total: number
    id: number | null
    is_official: boolean
    tags: string
    params: {
        name: string
        verbose: string
        description: string
        type: string
        default_value: string
        required: boolean
        group: string
        extra_setting: string
    } | null
    type: string
    script_name: string
    published_at: number
    stars: number
    forks: number
    status: number
    updated_at: number | null
    head_img: string
    user_id: number
    official: boolean
    is_stars: boolean
}

export interface PagemetaProps {
    limit: number | null
    page?: number
    total: number | undefined
    total_page: number | null
}
