export const config = {
  fields: { alignment: "alignments", term: "terms", issue: "issues" },
  defaults: {
    alignments: [],
    terms: [],
    issues: [],
    source_language: "zh-CN",
    target_language: "en",
    scope_indices: [],
  },
  tabs: ["源译对照", "术语表", "翻译问题", "覆盖与更新", "接续创作"],
} as const;
