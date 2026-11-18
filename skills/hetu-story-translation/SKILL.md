---
name: hetu-story-translation
description: 在河图作品中使用译稿工坊，按固定源文管理译稿、对齐、术语和意见，让局部返工与双语交付可接续。
---

# 译稿工坊

使用河图稳定 CLI/MCP 发现本包与当前动作 Schema，再经 `skills.read` 按需读取本包资源；本包不是 Codex 插件，不新增独立 MCP 服务。

先确认当前 WorkRef、确切 management_ref、安装包和固定修订，读已有成果与来源再处理目标。默认旅程：固定源文 → 一对多或多对一对齐 → 外部Agent提交译稿 → 术语检查与意见 → 局部返工 → 源文更新影响分析 → HTML／XLIFF交付。

专业方法与反例见 [workflows.md](references/workflows.md)，动作与必填参数见 [operations.md](references/operations.md)。参数以当前安装版发现为准；停用或升级后重新发现。

专业写入携带 CAS 和原 operation_key；unknown 先 get_operation，明确不存在才沿原输入执行。新来源只能追加，旧坐标不得套用新版。跨作品引用不授予读取权，不保留或导出管理凭据。

结果先保存专业对象或宿主候选并回读，交接带固定对象、来源及遗漏。正式设定、正文采纳、定稿和外部副作用独立决定。工具执行成功、解析成功或自动检查通过，不代表真实创作质量。
