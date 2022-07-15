namespace OpenAPI2 {
  export interface YakitPluginParam {
    field?: string;
    defaultValue?: string;
    typeVerbose?: string;
    fieldVerbose?: string;
    help?: string;
    required?: boolean;
    group?: string;
    extraSetting?: string;
  }
  export interface YakitPluginListResponse extends Paging {
    data: YakitPluginDetail[];
  }
  export interface YakitPluginDetailResponse {
    data: YakitPluginDetail;
  }
  export interface YakitPluginDetail extends GormBaseModel, YakitPlugin {}
  export interface YakitPlugin {
    type: string;
    scriptName: string;
    defaultOpen: boolean;
    tags: string;
    content: string;
    params?: YakitPluginParam[];
    authors: string;
    userId?: number;
    headImg?: string;
    // 插件发布的时间
    publishedAt: number;
    // 下载次数
    downloadedTotal: number;
    // 获得推荐的次数
    stars: number;
    // 审核状态
    status: number;
    official: boolean;
    // 当前用户是否已点赞
    isStars: boolean;
    help?: string;
    enablePluginSelector?: boolean;
    pluginSelectorTypes?: string;
    isGeneralModule?: boolean;
  }
  export interface UserResponse {
    data: UserDetail;
  }
  export interface UserOrdinaryResponse {
    data: UserList[];
  }
  export interface UserListResponse extends Paging {
    data: UserList[];
  }
  export interface UserList {
    tags: string[];
    id: number;
    createdAt: number;
    updatedAt: number;
    name: string;
    fromPlatform: string;
    email?: string;
    appid: string;
    headImg: string;
  }
  export interface UserHead {
    userId: number;
    userName: string;
    headImg: string;
    followNum: number;
    fans: number;
  }
  export interface UserFollows extends UserFollow {}
  export interface UserFollowResponse extends Paging {
    data: UserFollows[];
  }
  export interface UserFollow {
    followUserId: number;
    followUserName: string;
    followHeadImg: string;
    dynamicId: number;
    content: string;
    contentImg: string;
    contentVideo: string;
  }
  export interface UserDetail {
    id: number;
    phone: string;
    name: string;
    headImg: string;
    child?: UserAurh[];
  }
  export interface UserData {
    fromPlatform: string;
    email: string;
    appid: string;
    headImg: string;
    name: string;
    token: string;
    role: string;
  }
  export interface UserAurh {
    fromPlatform: string;
    authId: number;
    name: string;
  }
  export interface UpdateUser {
    userId: number;
    name?: string;
    headImg?: string;
  }
  export interface UpdateDynamic {
    // 动态id
    id: number;
    content?: string;
    contentImg?: string[];
    contentVideo?: string[];
    // 话题id
    topicId?: number;
    topics?: string;
    title?: string;
    cover?: string;
    // true允许下载，false不允许
    download?: boolean;
  }
  export interface TopicSearchResponse {
    data: TopicList[];
  }
  export interface TopicResponse extends Paging {
    data: TopicList[];
  }
  export interface TopicList extends GormBaseModel, TopicData {}
  export interface TopicData {
    topics: string;
    hotNum: number;
  }
  export interface SaveYakitPlugin {
    id?: number;
    type?: string;
    content?: string;
    params?: YakitPluginParam[];
    help?: string;
    tags?: string[];
    scriptName: string;
    publishedAt?: number;
    defaultOpen: boolean;
    enablePluginSelector?: boolean;
    pluginSelectorTypes?: string;
    isGeneralModule?: boolean;
    downloadTotal?: number;
    // true 为保存不上传
    isPrivate: boolean;
  }
  export interface Principle {
    user: string;
    role: string;
    userId: number;
    headImg: string;
  }
  export interface PluginDownloads {
    type: string;
    scriptName: string;
    defaultOpen: boolean;
    tags: string;
    content: string;
    params?: YakitPluginParam[];
    userId?: number;
    // 插件发布的时间
    publishedAt: number;
    // 下载次数
    downloadedTotal: number;
    // 获得推荐的次数
    stars: number;
    // 审核状态
    status: number;
    official: boolean;
    help?: string;
    enablePluginSelector?: boolean;
    pluginSelectorTypes?: string;
    isGeneralModule?: boolean;
    // true 为私有
    isPrivate: boolean;
  }
  export interface PluginDownloadResponse {
    data: PluginDownloadDetail[];
  }
  export interface PluginDownloadDetail
    extends GormBaseModel,
      PluginDownloads {}
  export interface PluginDownload {
    // 下载所有 all
    type?: string;
    // 单个，批量下载传id
    id?: number[];
    token?: string;
    page?: number;
    limit?: number;
  }
  export interface Paging {
    pagemeta: PageMeta;
  }
  export interface PageMeta {
    // 页面索引
    page: number;
    // 页面数据条数限制
    limit: number;
    // 总共数据条数
    total: number;
    // 总页数
    totalPage: number;
  }
  export interface OperationsResponse extends Paging {
    data: Operation[];
  }
  export interface Operation extends GormBaseModel, NewOperation {}
  export interface NewYakitPlugin {
    id?: number;
    type?: string;
    content?: string;
    params?: YakitPluginParam[];
    help?: string;
    tags?: string[];
    scriptName: string;
    publishedAt?: number;
    defaultOpen: boolean;
    enablePluginSelector?: boolean;
    pluginSelectorTypes?: string;
    isGeneralModule?: boolean;
    downloadTotal?: number;
  }
  export interface NewOperation {
    type: string;
    triggerUserUniqueId: string;
    operationPluginId: string;
    extra?: string;
  }
  export interface NewDynamicComment {
    dynamicId: number;
    messageImg?: string[];
    parentId?: number;
    // 根评论传动态发布作者id,回复评论传根评论作者ID
    byUserId: number;
    // 回复评论传值，主评论根为0
    rootId?: number;
    message: string;
  }
  export interface NewDynamic {
    userId?: number;
    userName?: string;
    headImg?: string;
    content?: string;
    contentImg?: string[];
    contentVideo?: string[];
    // 话题id
    topicId?: number;
    topics?: string;
    title?: string;
    cover?: string;
    // true允许下载，false不允许
    download: boolean;
  }
  export interface NewComment {
    pluginId: number;
    byUserId?: number;
    messageImg?: string[];
    parentId?: number;
    rootId?: number;
    message: string;
  }
  export interface MessageCenterStarsResponse extends Paging {
    data: MessageCenterStars[];
  }
  export interface MessageCenterStars {
    id: number;
    createdAt: number;
    updatedAt: number;
    actionUserId: number;
    actionUserName: string;
    actionHeadImg: string;
    dynamicId: number;
    dynamicUserId: number;
    // 动态发布人
    dynamicUserName: string;
    // 动态内容
    dynamicContent: string;
    // 动态图片
    dynamicContentImg: string;
    // 动态视频-封面图
    dynamicCover: string;
  }
  export interface MessageCenterFollowResponse extends Paging {
    data: MessageCenterFollow[];
  }
  export interface MessageCenterFollow {
    id: number;
    createdAt: number;
    updatedAt: number;
    actionUserId: number;
    actionUserName: string;
    actionHeadImg: string;
    followUserId: number;
  }
  export interface MessageCenterCommentResponse extends Paging {
    data: MessageCenterComment[];
  }
  export interface MessageCenterComment {
    id: number;
    createdAt: number;
    updatedAt: number;
    dynamicId: number;
    userId: number;
    userName: string;
    headImg: string;
    // 评论内容
    message: string;
    // 评论图片
    messageImg: string;
    // 回复用户id
    byUserId: number;
    // 回复的用户头像
    byHeadImg: string;
    // 回复的用户
    byUserName: string;
    // 回复的内容
    byMessage: string;
    // 回复的内容图片
    byMessageImg: string;
    // 动态发布人
    dynamicUserName: string;
    // 动态内容
    dynamicContent: string;
    // 动态图片
    dynamicContentImg: string;
    // 动态视频-封面图
    dynamicCover: string;
  }
  export interface GormBaseModel {
    id: number;
    createdAt: number;
    updatedAt: number;
  }
  export interface DynamicLists extends GormBaseModel, DynamicList {}
  export interface DynamicListResponse extends Paging {
    data: DynamicLists[];
  }
  export interface DynamicListDetailResponse {
    data: DynamicLists;
  }
  export interface DynamicList {
    userId: number;
    userName: string;
    headImg: string;
    content: string;
    contentImg: string;
    contentVideo: string;
    // 话题id
    topicId: number;
    topics: string;
    title: string;
    cover: string;
    // true允许下载，false不允许
    download: boolean;
    stars: number;
    collect: number;
    isStars: boolean;
    isCollect: boolean;
  }
  export interface DynamicCommentList {
    id: number;
    createdAt: number;
    updatedAt: number;
    dynamicId: number;
    rootId: number;
    parentId: number;
    userId: number;
    userName: string;
    headImg: string;
    message: string;
    messageImg: string;
    likeNum: number;
    byUserId: number;
    byUserName: string;
    byHeadImg: string;
    replyNum: number;
  }
  export interface DynamicComment extends Paging {
    data: DynamicCommentList[];
  }
  export interface CommentListResponse extends Paging {
    data: CommentListData[];
  }
  export interface CommentListData {
    id: number;
    createdAt: number;
    updatedAt: number;
    pluginId: number;
    rootId: number;
    parentId: number;
    userId: number;
    userName: string;
    headImg: string;
    message: string;
    messageImg: string;
    likeNum: number;
    byUserId: number;
    byUserName: string;
    byHeadImg: string;
    replyNum: number;
  }
  export interface AuthResponse {
    userId: number;
    token: string;
    authId: number;
    headImg: string;
    name: string;
  }
  export interface ActionSucceeded {
    // 来源于哪个 API
    from: string;
    // 执行状态
    ok: boolean;
  }
  export interface ActionFailed {
    // 来源于哪个 API
    from: string;
    // 执行状态
    ok: boolean;
    reason: string;
  }
}
