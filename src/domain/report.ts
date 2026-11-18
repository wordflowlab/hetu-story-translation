import { escapeHTML, htmlPage } from "./presentation.ts";
export const labels: Record<string, string> = {
  exchanges: "交换记录",
  mappings: "字段与时间映射",
  variables: "叙事变量",
  nodes: "故事节点",
  choices: "分支选项",
  saves: "存档",
  members: "系列作品",
  relations: "作品关系",
  appearances: "角色出演",
  plans: "创作计划",
  alignments: "源译对齐",
  terms: "术语表",
  issues: "翻译问题",
  recordings: "实际声音",
  notes: "听读意见",
  chapters: "书稿章节",
  footnotes: "脚注",
  illustrations: "插图",
  entry_node: "开始节点",
  source_language: "源语言",
  target_language: "目标语言",
  scope_indices: "阅读范围",
  author: "作者",
  language: "语言",
  identifier: "书稿标识",
  page_size: "纸张",
  font_size: "字号",
  basis_refs: "固定专业依据",
  id: "标识",
  title: "标题",
  name: "姓名",
  text: "内容",
  summary: "摘要",
  description: "说明",
  status: "状态",
  goal: "目标",
  comment: "意见",
  resolution: "处理说明",
  label: "选项",
  format: "格式",
  spec: "规范版本",
  filename: "原文件名",
  field_path: "原字段",
  target_kind: "目标类型",
  note: "说明",
  type: "类型",
  initial: "初始值",
  kind: "类型",
  role: "作品角色",
  interpretation: "作品内解释",
  voice_note: "声音要求",
  duration_ms: "实际时长（毫秒）",
  speech_checked: "已听取语音",
  start_ms: "起始毫秒",
  end_ms: "结束毫秒",
  method: "映射方式",
  source: "原词",
  target: "译词",
  targets: "译文",
  mode: "术语用途",
  case_sensitive: "区分大小写",
  include: "纳入书稿",
  volume: "卷名",
  marker: "脚注标记",
  caption: "图注",
  origin: "声音来源",
};
export const names: Record<string, string> = {
  planned: "计划中",
  recorded: "已有声音",
  draft: "译稿草案",
  reviewed: "已审阅",
  needs_revision: "待修改",
  open: "待处理",
  resolved: "已复核",
  addressed: "已处理",
  dismissed: "已忽略",
  scene: "场景",
  ending: "结局",
  main: "正篇",
  sequel: "续作",
  prequel: "前传",
  side_story: "番外",
  reference: "参考",
  reading_order: "阅读顺序",
  continuation: "续作关系",
  parallel: "平行故事",
  preferred: "建议译法",
  required: "要求译法",
  forbidden: "避免译法",
  proposed: "待确认",
  in_progress: "进行中",
  complete: "已完成",
  character: "人物",
  world_entry: "世界书条目",
  unmapped: "未映射",
  segment_boundary: "分段边界",
  forced_alignment: "强制对齐",
  estimated: "估计",
  external_tool: "外部工具",
  author_recording: "作者录音",
};
export function textValue(v: any): string {
  if (v === null) return "未指定";
  if (typeof v === "boolean") return v ? "是" : "否";
  if (typeof v === "string") return names[v] ?? v;
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return v.map(textValue).join("；");
  return Object.entries(v)
    .map(([k, x]) => (labels[k] ?? k) + "：" + textValue(x))
    .join("；");
}
export function reportMarkdown(r: any) {
  const p = r.project;
  return (
    "# " +
    p.title +
    "\n\n" +
    Object.entries(p)
      .filter(([k]) => !["format_version", "title"].includes(k))
      .map(([k, v]) => "## " + (labels[k] ?? k) + "\n\n" + textValue(v))
      .join("\n\n") +
    "\n"
  );
}
export function reportHTML(r: any) {
  return htmlPage(
    r.project.title,
    "<h1>" +
      escapeHTML(r.project.title) +
      "</h1><pre>" +
      escapeHTML(reportMarkdown(r)) +
      "</pre>",
  );
}

Object.assign(names, {
  novel: "小说",
  drama: "剧本",
  video: "视频",
  observed: "已发生",
  number: "数字",
  boolean: "开关",
  string: "文字",
  eq: "等于",
  ne: "不等于",
  gt: "大于",
  gte: "大于等于",
  lt: "小于",
  lte: "小于等于",
  set: "设为",
  add: "增加",
});
Object.assign(labels, { operator: "比较或变更方式", value: "值" });
