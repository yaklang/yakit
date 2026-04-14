<!-- pr-ci-one-comment -->
## PR CI 汇总

**状态：存在失败项**（见下方日志片段）

- ✅ i18n（zh/en）
- ✅ ESLint（renderer src/main）
- ❌ TypeScript（renderer src/main）（failure）

<details><summary>TypeScript（renderer src/main） — 日志片段</summary>

```
src/pages/KnowledgeBase/compoment/KnowledgeTable.tsx(69,39): error TS2345: Argument of type 'RefObject<string>' is not assignable to parameter of type 'BasicTarget<Element>'.
  Type 'RefObject<string>' is not assignable to type 'MutableRefObject<TargetValue<Element>>'.
    Types of property 'current' are incompatible.
      Type 'string | null' is not assignable to type 'TargetValue<Element>'.
        Type 'string' is not assignable to type 'TargetValue<Element>'.
src/pages/KnowledgeBase/compoment/KnowledgeTable.tsx(517,10): error TS2322: Type 'RefObject<string>' is not assignable to type 'LegacyRef<HTMLDivElement> | undefined'.
  Type 'RefObject<string>' is not assignable to type 'RefObject<HTMLDivElement>'.
    Type 'string' is not assignable to type 'HTMLDivElement'.

```
</details>

- ✅ ESLint（engine-link-startup）
- ✅ TypeScript（engine-link-startup）
- ❌ 图片/视频体积（failure）

<details><summary>图片/视频体积 — 日志片段</summary>

```
Media file size check failed（变更中的图片/视频超过阈值）:
  - app/renderer/src/main/src/pages/KnowledgeBase/images/飞书20260413-1409245.mp4 (8.62 MiB > 上限 2.00 MiB, video)

可通过环境变量调整阈值（字节）: MEDIA_IMAGE_MAX_BYTES, MEDIA_VIDEO_MAX_BYTES

```
</details>

- ✅ Prettier

---
_由 pull_request test workflow 自动生成_
