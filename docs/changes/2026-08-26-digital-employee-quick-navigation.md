# 2026-08-26 数字员工快捷导航

## 目标

让数字员工选择页的快捷导航与 Memfit 实际菜单一致，并支持直接打开目标页面。

## 修改

- 将 6 个静态快捷卡片改为可操作按钮。
- 复用主界面 `menuOpenPage` 事件，不增加新的页面路由协议。
- 选择页显示期间主内容及菜单监听器尚未挂载，并且主内容受 `Suspense` 懒加载；由 `quickNavigation.ts` 保存一次性待跳路由，自动确认当前员工，等真实 `MainOperatorContent` 注册后领取并直接开页。
- 路由映射：
  - 智能体广场 → `YakitRoute.AI_Forge`
  - 知识库 → `YakitRoute.AI_REPOSITORY`
  - 记忆库 → `YakitRoute.AI_Memory`
  - 工具库 → `YakitRoute.AI_Tool`
  - 插件仓库 → `YakitRoute.Plugin_Hub`
  - 流量历史 → `YakitRoute.DB_HTTPHistory`
- “数据库”属于菜单分组、没有独立可打开路由，因此使用首个具体子菜单“流量历史”。
- 补充 hover、focus-visible 和 active 状态，支持键盘操作。

## 关键文件

- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeSelectPage.tsx`
- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeGate.tsx`
- `app/renderer/src/main/src/pages/digitalEmployee/quickNavigation.ts`
- `app/renderer/src/main/src/components/layout/UILayout.tsx`
- `app/renderer/src/main/src/pages/digitalEmployee/DigitalEmployeeSelectPage.module.scss`
- `app/renderer/src/main/src/pages/digitalEmployee/__test__/DigitalEmployeeSelectPage.test.tsx`

## 验证

- `DigitalEmployeeSelectPage.test.tsx`：6 项测试全部通过，其中包含先请求、后挂载订阅者并回放目标路由的集成测试。
- `tsc --noEmit`：通过。
- `git diff --check`：通过。
- 本地开发服务热更新成功，`http://localhost:3000` 返回 200。

## Git 与回滚

- 功能提交：`9b3e3b4 feat: enable digital employee quick navigation`
- Gate 时序修复：`6217c82 fix: defer quick navigation until menu mount`
- 懒加载回放修复：`35e239f fix: replay employee quick navigation after lazy mount`
- 安全回滚：

```powershell
git revert 35e239f 6217c82 9b3e3b4
```

使用 `git revert` 会保留历史并生成反向提交，适合当前仍有其他未提交品牌改动的工作区；不要使用 `git reset --hard`。
