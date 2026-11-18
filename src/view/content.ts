import { names } from "../domain/report.ts";
const label = (v: string) => names[v] ?? v;
export function rowTitle(field: string, v: any, p: any): string {
  if (field === "terms") return v.source + " → " + v.target;
  return v.title ?? v.name ?? v.source ?? v.label ?? v.marker ?? "记录";
}
export function rowContent(field: string, v: any, p: any): any {
  if (field === "terms")
    return { 用途: label(v.mode), 区分大小写: v.case_sensitive, 说明: v.note };
  if (field === "issues")
    return {
      对应段落:
        p.alignments.find((a: any) => a.id === v.alignment_id)?.title ??
        "未找到段落",
      意见: v.comment,
      状态: label(v.status),
      处理说明: v.resolution,
    };
  const { id, title, name, ...rest } = v;
  return rest;
}
export function panelContent(action: string, v: any, p: any): any {
  if (action === "check_translation")
    return {
      源文覆盖: v.coverage.map((c: any) => ({
        覆盖:
          c.coverage === null
            ? "无可统计内容"
            : Math.round(c.coverage * 100) + "%",
        未译区间: c.gaps,
      })),
      术语问题: v.term_findings.map((f: any) => ({
        段落: p.alignments.find((a: any) => a.id === f.alignment_id)?.title,
        术语: p.terms.find((t: any) => t.id === f.term_id)?.source,
        预期: f.expected,
        规则: label(f.kind),
      })),
      翻译意见: v.issues.map((x: any) => ({
        问题: x.title,
        意见: x.comment,
        状态: label(x.status),
        译文已更新: x.stale,
      })),
      说明: v.note,
    };
  return v;
}
