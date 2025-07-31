# 知识库管理组件

这是一个完整的知识库管理页面，支持知识库和知识条目的增删改查操作。

## 功能特性

### 知识库管理
- 📁 新增知识库
- ✏️ 编辑知识库信息
- 🗑️ 删除知识库
- 👁️ 查看知识库列表

### 知识条目管理
- ➕ 新增知识条目
- ✏️ 编辑知识条目
- 🗑️ 删除知识条目
- 🔍 搜索知识条目
- 📄 分页显示
- 🏷️ 关键词标签
- ⭐ 重要度评分
- 📝 详细信息编辑

## 组件结构

```
knowlegeBase/
├── KnowledgeBaseManager.tsx          # 主管理组件
├── KnowledgeBaseList.tsx             # 知识库列表组件
├── KnowledgeEntryTable.tsx           # 知识条目表格组件
├── KnowledgeBaseDemo.tsx             # 演示组件
├── types.ts                          # 类型定义
├── index.ts                          # 导出文件
├── KnowledgeBaseManager.module.scss  # 主组件样式
├── KnowledgeBaseList.module.scss     # 列表组件样式
├── KnowledgeEntryTable.module.scss   # 表格组件样式
└── README.md                         # 说明文档
```

## 使用方法

### 方法1：直接使用主组件
```tsx
import { KnowledgeBaseManager } from '@/components/playground/knowlegeBase'

function App() {
    return (
        <div style={{ height: '100vh' }}>
            <KnowledgeBaseManager />
        </div>
    )
}
```

### 方法2：使用演示组件
```tsx
import { KnowledgeBaseDemo } from '@/components/playground/knowlegeBase'

function App() {
    return <KnowledgeBaseDemo />
}
```

## 接口依赖

该组件依赖以下后端接口（通过 IPC 调用）：

### 知识库接口
- `GetKnowledgeBaseNameList` - 获取知识库列表
- `CreateKnowledgeBase` - 创建知识库
- `UpdateKnowledgeBase` - 更新知识库
- `DeleteKnowledgeBase` - 删除知识库

### 知识条目接口
- `SearchKnowledgeBaseEntry` - 搜索知识条目
- `CreateKnowledgeBaseEntry` - 创建知识条目
- `UpdateKnowledgeBaseEntry` - 更新知识条目
- `DeleteKnowledgeBaseEntry` - 删除知识条目

## 数据结构

### 知识库
```typescript
interface KnowledgeBase {
    Id: number
    KnowledgeBaseName: string
    KnowledgeBaseDescription: string
    KnowledgeBaseType: string
    CreatedAt?: string
    UpdatedAt?: string
}
```

### 知识条目
```typescript
interface KnowledgeBaseEntry {
    ID: number
    KnowledgeBaseId: number
    KnowledgeTitle: string
    KnowledgeType: string
    ImportanceScore: number          // 1-10的重要度评分
    Keywords: string[]               // 关键词数组
    KnowledgeDetails: string         // 详细内容
    Summary: string                  // 摘要
    SourcePage: number              // 源页码
    PotentialQuestions: string[]     // 潜在问题数组
    PotentialQuestionsVector: number[] // 问题向量（后端生成）
    CreatedAt?: string
    UpdatedAt?: string
}
```

## 后端接口示例

这些接口已经在 `app/main/handlers/knowlegebase.js` 中实现：

```javascript
// 获取知识库名称列表
ipcMain.handle("GetKnowledgeBaseNameList", async (e, params) => {
    return await asyncGetKnowledgeBaseNameList(params)
})

// 创建知识库
ipcMain.handle("CreateKnowledgeBase", async (e, params) => {
    return await asyncCreateKnowledgeBase(params)
})

// 搜索知识条目
ipcMain.handle("SearchKnowledgeBaseEntry", async (e, params) => {
    return await asyncSearchKnowledgeBaseEntry(params)
})
```

## 样式定制

组件使用 SCSS 模块化样式，可以通过修改对应的 `.module.scss` 文件来定制样式。

### 主要样式类
- `.knowledge-base-manager` - 主容器样式
- `.kb-item` - 知识库列表项样式
- `.kb-item.selected` - 选中状态样式
- `.title-cell` - 标题单元格样式
- `.keywords-cell` - 关键词单元格样式
- `.summary-cell` - 摘要单元格样式

## 注意事项

1. ✅ 确保后端已实现相应的 gRPC 接口
2. ✅ 组件需要在 Electron 环境中运行（依赖 ipcRenderer）
3. ✅ 建议在容器中使用，并设置合适的高度
4. ✅ 知识条目的向量字段由后端自动生成，前端不需要处理
5. ✅ 搜索功能支持实时搜索
6. ✅ 支持分页显示大量数据
7. ✅ 所有操作都有错误处理和用户提示

## 开发状态

- ✅ 知识库管理功能完成
- ✅ 知识条目管理功能完成  
- ✅ 搜索功能完成
- ✅ 表格展示完成
- ✅ 表单验证完成
- ✅ 样式美化完成
- ✅ 错误处理完成
- ✅ 类型定义完成