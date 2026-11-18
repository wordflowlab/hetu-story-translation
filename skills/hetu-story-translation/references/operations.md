# 操作地图

由正式清单生成，执行前发现当前安装版Schema。

| 动作 | 用途 | 必填参数 | 效果 |
| --- | --- | --- | --- |
| list_projects | 查找专业工程 |  | read |
| get_project | 读取固定专业工程 | object_id | read |
| save_project | 保存完整专业工程 | expected_revision, expected_sha256, operation_key, content | managed_write |
| put_alignment | 维护源译对齐 | object_id, expected_revision, expected_sha256, operation_key, alignment | managed_write |
| remove_alignment | 移除源译对齐 | object_id, expected_revision, expected_sha256, operation_key, alignment_id | managed_write |
| put_term | 维护术语规则 | object_id, expected_revision, expected_sha256, operation_key, term | managed_write |
| remove_term | 移除术语规则 | object_id, expected_revision, expected_sha256, operation_key, term_id | managed_write |
| put_issue | 维护翻译问题 | object_id, expected_revision, expected_sha256, operation_key, issue | managed_write |
| remove_issue | 移除翻译问题 | object_id, expected_revision, expected_sha256, operation_key, issue_id | managed_write |
| get_alignment | 读取源译对照 | object_id | read |
| check_translation | 检查覆盖、术语与意见修订 | object_id | read |
| preview_update | 预览源文更新影响 | object_id, replacements | read |
| export_bilingual | 导出双语HTML或XLIFF | object_id, format | read |
| get_source | 读取固定来源 | object_id, source_index | read |
| get_basis | 读取固定上游专业依据 | object_id, basis_index | read |
| compare_versions | 比较专业修订 | object_id, from_revision, to_revision | read |
| export_project | 导出固定专业报告 | object_id, format | read |
| build_context | 准备有界专业上下文 | object_id, goal, max_chars | read |
| create_handoff | 生成固定专业交接 | object_id, goal | read |
| get_operation | 沿原键回读操作 | operation_key | read |
