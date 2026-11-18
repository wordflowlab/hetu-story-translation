# 专业流程

1. 读取固定源文，明确源语言、目标语言及实际scope_indices。以source_ranges保存真实引文，一对多和多对一均以显式对齐组表达。

2. 由外部Agent生成或修改targets，保存为译稿专业修订；不覆盖宿主源文。术语按建议、要求、避免分别记录，并说明大小写规则。

3. check_translation 的覆盖按源文字节并集，重叠不重复累计；查看未译gaps。术语只是字面检查，不能据此宣称翻译语义正确。

4. put_issue 固定当前译文摘要；解决意见须有新译文、recheck_sha256和resolution。读取意见的stale状态，不能因为提交新版就自动解决。

5. 原文更新后先追加新固定来源，再用 preview_update 比较影响，旧范围保持；需要重新对齐时另作明确修订。

6. export_bilingual 可输出HTML或XLIFF2.0，重组并核验全部分块。将待采纳译稿交给宿主候选任务，专业reviewed状态不等于宿主定稿。

## 发现、保存与接续

先读本包Skill及operations，再从实际Schema组装输入。新建预期修订为0；已有工程先读get_project，再提交expected_revision、expected_sha256与原operation_key。保存后get_project回读固定成果。使用get_basis/get_source读取确切依据，build_context控制上下文预算且披露省略，create_handoff固定专业引用。

停用或升级后重新发现。响应未知先get_operation；明确not_found才沿原输入原键恢复。作者在GUI修改导致CAS冲突时保留自己的输入，读取新基线并比较，不覆盖作者新稿。

跨插件接续使用固定basis_refs；上游新修订不会改写旧依据。专业状态、解析成功、文件解码及自动检查均不等于内容认可、正式设定、正文采纳或定稿。
