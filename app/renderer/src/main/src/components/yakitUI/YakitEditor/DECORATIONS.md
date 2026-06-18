# YakitEditor 装饰 (deltaDecorations) 用法与陷阱手册

本文件汇总 Monaco `model.deltaDecorations` / 装饰选项在本仓库中的**真实用法、案例与必踩坑**，
目的：让后续在编辑器上做"行内小块 / 注入文本 / 高亮 / 打码"等功能时，不再重复出现
**"被隐藏文本仍占据光标/选区宽度，表现为可选中的幽灵空白"** 这类问题。

> 适用 monaco-editor `^0.40.0`（`app/renderer/src/main`）。

---

## 1. 装饰选项速查

`deltaDecorations(oldIds, newDecorations)` 返回新的 id 数组；下次调用时把它作为 `oldIds`
传回即可做增量更新（不要每次全量新建后丢弃旧 id，会残留装饰）。

常用 `options` 字段：

| 字段 | 作用 | 是否改变字符宽度 | 备注 |
| --- | --- | --- | --- |
| `className` | 给 range 文本加**背景/边框**类（高亮、打码底色） | 否（仅背景）| 不影响光标定位 |
| `inlineClassName` | 给 range 文本加**行内文本样式**（颜色、字号、letter-spacing） | **可能** | 改宽度时见第 2 节 |
| `inlineClassNameAffectsLetterSpacing` | 声明上面的 `inlineClassName` 会改变字符宽度 | — | **关键开关，见第 2 节** |
| `before` / `after` | **注入文本**（InjectedText），渲染一段不属于文档的文本（小块/chip） | 是（有自己的宽度）| 各有独立 `inlineClassName` 与 `inlineClassNameAffectsLetterSpacing` |
| `beforeContentClassName` / `afterContentClassName` | 在 range 前/后插入**空内容伪元素**（靠 CSS `content` 画图标/标签） | 视 CSS 而定 | 例：CRLF/LF 角标、Content-Length 角标 |
| `hoverMessage` | 悬浮提示 | 否 | 支持 markdown |
| `stickiness` | 编辑边缘时 range 是否扩张 | — | 小块用 `NeverGrowsWhenTypingAtEdges` |
| `isWholeLine` | 整行装饰 | — | — |

---

## 2. 头号陷阱：隐藏文本仍占宽度（幽灵空白）

### 现象
用 `inlineClassName`（如 `font-size:0`）把一段文本"隐藏"，再用 `after` 注入一个 chip 小块。
视觉上文本不见了、chip 正常显示，但是：

- 全选 / 拖选时，chip 后面出现一块**能被选中的空白**（宽度≈被隐藏文本的字符数）。
- 光标能停进这块"空白"，在 chip 后追加内容很别扭。

### 根因（已对 monaco 0.40 源码确认）
Monaco 对"简单行"会走**等宽快速路径** `FastRenderedViewLine`
（`browser/viewParts/lines/viewLine.js`）。它计算光标/选区像素位置时用的是
`charWidth × 列数`（`_getColumnPixelOffset` → `characterMapping.getHorizontalOffset`），
**完全无视** `inlineClassName` 里的 `font-size:0` 真实 0 宽度。

是否走快速路径由 `output.containsForeignElements === None` 决定
（`createRenderedLine` / `viewLineRenderer.js`）。普通 `inlineClassName` 被视为
`Regular`，**不会**标记 foreign element，于是继续走等宽路径 → 隐藏文本仍按整字符宽占位。

### 正确做法
凡是 `inlineClassName` / 注入文本会**改变字符宽度**（`font-size`、`letter-spacing`、
`padding`、`display` 等），**必须**显式声明 `inlineClassNameAffectsLetterSpacing: true`。
它会把该装饰标记为 `RegularAffectingLetterSpacing`，触发 foreign element，
迫使 Monaco 放弃等宽快速路径、改用 `RenderedViewLine` 的 **DOM 实测宽度**，
于是隐藏文本实测为 0 宽、chip 宽度按真实渲染计算，光标/选区完全贴合。

### 本仓库的正确范例：二进制 Fuzztag 小块
`YakitEditor.tsx` 中二进制折叠小块（`binary-fold-*`）：

```ts
options: {
  inlineClassName: 'binary-fuzz-hidden',          // font-size:0 隐藏占位文本
  inlineClassNameAffectsLetterSpacing: true,      // 关键：迫使 DOM 实测，隐藏占位实测 0 宽
  after: {
    content: buildChipLabel(entry),               // 注入 Binary/HexString/Base64 小块
    inlineClassName: 'binary-fuzz-chip',
    inlineClassNameAffectsLetterSpacing: true,    // chip 有 padding/不同字号，同样需实测
  },
  stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
  hoverMessage: { value: 'Click to modify ...' },
}
```

对应 CSS：`StaticYakitEditor.scss` 中的 `.binary-fuzz-hidden`（`font-size:0`）与
`.binary-fuzz-chip`（padding/圆角/字号）。

---

## 3. 其它注意点（来自现有案例）

### 3.1 `renderWhitespace: 'all'` 会把空格画成圆点
本编辑器开启了 `renderWhitespace: 'all'`，**普通空格 U+0020 / Tab** 会被渲染成 middot 圆点，
且空格会成为换行点。注入文本（chip 文案）里**不要用普通空格**：
- 需要分词时用**不间断空格 U+00A0**（`buildChipLabel` 中 `Click\u00A0to\u00A0modify`）；
- 单测用 `expect(label).not.toContain(' ')` 守住这条约定（U+00A0 不等于 U+0020，断言仍成立）。

### 3.2 注入文本 vs `::after` 伪元素
- `after: { content }` 是 **InjectedText**：内容会成为视图行的一部分，有独立列、可被选中、
  支持 `inlineClassNameAffectsLetterSpacing` 与 `cursorStops`。适合"小块/chip"。
- `afterContentClassName` 是**空内容伪元素**，靠 CSS `content` 出图（如 `content-length`、
  `unicode-decode` 角标）。不要混淆两者。

### 3.3 增量更新与节流
- 始终保存上次 `deltaDecorations` 的返回 id，作为下次入参，避免装饰泄漏。
- 高频触发（输入、滚动、光标移动）时用 `requestAnimationFrame` 合并，只跑最后一次
  （见 `YakitEditor.tsx` 的 `scheduleDecorations`）。
- model 可能已被 dispose，生成装饰时要 `try/catch` 并判断 `model.isDisposed()`。

### 3.4 点击命中判断
注入小块的点击要用 DOM 命中（`event.target.closest('.binary-fuzz-chip')`）判断，
不要只靠 `e.target.position`，否则点到行尾空白也会误触发（见 `handleBinaryFoldClick`）。

### 3.5 复制/导出必须还原占位（不要泄漏 #YBIN_）
折叠把真实标签替换成 model 文本里的占位 `{{tag(#YBIN_id#)}}`。任何“读 model 文本拿去复制/导出”的
路径都必须先把占位还原成真实内容，否则会把内部占位复制出去：

- 复制入口不止一个：除 `Ctrl+C/X`（DOM `copy`/`cut` 事件）外，右键菜单“复制”走的是
  `setClipboardText(fetchCursorContent(editor))`，**不经过** DOM copy 事件。只在 DOM 事件里拦截会漏。
- 统一方案：用 `binaryFuzztag.ts` 的按-model 注册表。编辑器挂载时
  `registerBinaryFoldEntries(model, binaryFoldEntriesRef.current)`，卸载时 `unregisterBinaryFoldEntries(model)`；
  `fetchCursorContent` 用 `expandBinaryFuzztagByModelKey(model, text)` 统一还原。新增复制/导出路径时照此处理。
- 注册的是 ref 持有的同一个 Map 对象：`displayValue` 里 `!foldBinaryEnabled` 分支要 `.clear()` 原地清空，
  **不要**整体替换成 `new Map()`，否则注册表里登记的还是旧引用。
- DOM `copy/cut` 处理器：选区里只要出现 `#YBIN_` 就一定 `preventDefault()` 并写入还原后的文本，
  不要因“expand 结果未变”而提前 `return`（否则又会把占位放出去）。

### 3.6 “被修改”标记：布尔 + 按序号，不要写进内容
小块的 `Changed` 只表示“是否被改过”（布尔），不写 `+add/~override` 等细节；按“编辑器中第 N 个二进制标签”
（`findPlaceholderOffsets` 的文档顺序序号）记录在 `binaryModifiedOrdinalsRef`，与内容/占位 id 解耦。
这样改动元数据不会进入内容，复制粘贴出去的永远是纯标签内容。

---

## 4. 提交前自检清单

- [ ] `inlineClassName` 改了字号/字距/padding/display？→ 必须配 `inlineClassNameAffectsLetterSpacing: true`（注入文本同理）。
- [ ] 注入文本文案里有没有普通空格？→ 用 U+00A0 替代。
- [ ] `deltaDecorations` 的旧 id 有没有回传？→ 防止装饰泄漏。
- [ ] 高频更新有没有节流（rAF）？model dispose 有没有兜底？
- [ ] 实测：**全选/拖选**时小块前后**不应**出现可选中的幽灵空白；光标能紧贴小块前后增删。
- [ ] 实测：选中含小块的内容，分别用 `Ctrl+C` 和**右键菜单复制**，剪贴板里都**不应**出现 `#YBIN_`。
- [ ] 新增"读 model 文本去复制/导出"的路径？→ 必须经 `expandBinaryFuzztagByModelKey` 还原占位。

---

## 5. 相关文件

- `YakitEditor.tsx`：装饰生成主逻辑（隐私打码、关键字高亮、二进制折叠小块、点击命中、按类型打开编辑器）。
- `binaryFuzztag.ts`：折叠/展开、`buildChipLabel`、复制还原注册表
  （`registerBinaryFoldEntries` / `unregisterBinaryFoldEntries` / `expandBinaryFuzztagByModelKey`）。小块文案策略：
  - `unquote` → `Binary[0x..NB]`（字节预览）；
  - `base64`/`hex` → 优先 `Base64[asdf]` / `HexString[asdf]`（解码文本预览 `previewText`），不可打印时回退字节预览；
  - 改过追加 `|Changed`（布尔，无细节）；末尾统一追加 `Click to modify`（U+00A0 拼接）。
- 辅助输入器（点击小块打开）：
  - `BinaryFuzztagHexModal.tsx`：Binary(unquote) 的字节级 HEX 编辑弹窗；
  - `Base64HexFuzztagModal.tsx`：Base64/HexString 公共弹窗，可切换 **文本/HEX**，默认文本（不可打印时默认 HEX）；
  - `BinaryFuzztagHexEditor.tsx`：被上面两者复用的 HEX 编辑体（插入/替换 + 键盘覆盖）。
- `StaticYakitEditor.scss`：`.binary-fuzz-hidden` / `.binary-fuzz-chip` 等样式。
- `utils/editors.tsx`：`content-length` / `unicode-decode` / CRLF-LF 等装饰案例。
- `__test__/binaryFuzztag.test.ts`：折叠/展开/标签/恢复等单测。
