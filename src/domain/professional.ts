import { requireValue as need, canonical } from "../../vendor/project-store.ts";
import { sourceText, span } from "./text.ts";
import { hash, artifact, escapeHTML, htmlPage } from "./artifact.ts";
export const targetHash = (a: any) => hash(canonical(a.targets));
export function validateDomain(p: any) {
  need(p.source_language !== p.target_language, "源语言和目标语言应不同。");
  need(
    new Set(p.scope_indices).size === p.scope_indices.length,
    "源文范围重复。",
  );
  const groups = new Map<string, any>(p.alignments.map((a: any) => [a.id, a]));
  for (const a of p.alignments) {
    need(a.source_ranges.length, "对齐组须有源文范围。");
    for (const r of a.source_ranges) {
      need(
        p.scope_indices.includes(r.source_index),
        "对齐范围不属于声明源文。",
      );
      need(r.byte_end > r.byte_start, "源文范围须非空。");
    }
    need(a.status !== "reviewed" || a.targets.length, "空译文不能标记已审阅。");
  }
  for (const issue of p.issues) {
    const a = groups.get(issue.alignment_id);
    need(a, "问题引用的对齐组不存在。");
    if (issue.status === "resolved") {
      need(
        issue.resolution.trim() &&
          issue.recheck_sha256 === targetHash(a) &&
          issue.recheck_sha256 !== issue.target_sha256,
        "解决问题须固定新译文并提供复核说明。",
      );
    }
  }
  const terms = p.terms.map((t: any) =>
    canonical([
      t.case_sensitive ? t.source : t.source.toLocaleLowerCase(),
      t.mode,
      t.target,
    ]),
  );
  need(new Set(terms).size === terms.length, "重复术语规则。");
}
export async function checkSources(p: any, sources: any[], _request?: any) {
  for (const a of p.alignments)
    for (const r of a.source_ranges)
      need(
        span(sourceText(sources[r.source_index]), r.byte_start, r.byte_end) ===
          r.quote,
        "源文对齐引文不一致。",
      );
  for (const index of p.scope_indices) sourceText(sources[index]);
}
export function coverage(p: any, sources: any[]) {
  return p.scope_indices.map((index: number) => {
    const total = Buffer.byteLength(sourceText(sources[index])),
      ranges = p.alignments
        .filter((a: any) => a.targets.length)
        .flatMap((a: any) => a.source_ranges)
        .filter((r: any) => r.source_index === index)
        .map((r: any) => [r.byte_start, r.byte_end])
        .sort((a: number[], b: number[]) => a[0] - b[0]);
    let end = 0,
      covered = 0;
    const gaps: number[][] = [];
    for (const [a, b] of ranges) {
      if (a > end) gaps.push([end, a]);
      covered += Math.max(0, b - Math.max(end, a));
      end = Math.max(end, b);
    }
    if (end < total) gaps.push([end, total]);
    return {
      source_index: index,
      total_bytes: total,
      translated_bytes: covered,
      coverage: total ? covered / total : null,
      gaps,
    };
  });
}
export function checkTranslation(p: any, sources: any[]) {
  const term_findings: any[] = [];
  for (const a of p.alignments) {
    const source = a.source_ranges.map((r: any) => r.quote).join("\n"),
      target = a.targets.join("\n");
    for (const t of p.terms) {
      const norm = (s: string) =>
        t.case_sensitive ? s : s.toLocaleLowerCase();
      if (!norm(source).includes(norm(t.source))) continue;
      const found = norm(target).includes(norm(t.target));
      if (t.mode === "forbidden" ? found : !found)
        term_findings.push({
          alignment_id: a.id,
          term_id: t.id,
          kind: t.mode,
          expected: t.target,
          requires_judgment: true,
        });
    }
  }
  return {
    coverage: coverage(p, sources),
    term_findings,
    issues: p.issues.map((v: any) => ({
      ...v,
      current_target_sha256: targetHash(
        p.alignments.find((a: any) => a.id === v.alignment_id),
      ),
      stale:
        v.target_sha256 !==
        targetHash(p.alignments.find((a: any) => a.id === v.alignment_id)),
    })),
    note: "术语为字面检查，不能证明语义翻译质量；未译与旧意见不会静默变为完成。",
  };
}
export function bilingual(p: any, format: string) {
  if (format === "html")
    return htmlPage(
      p.title,
      "<h1>" +
        escapeHTML(p.title) +
        "</h1><table><thead><tr><th>源文</th><th>译文</th></tr></thead><tbody>" +
        p.alignments
          .map(
            (a: any) =>
              '<tr><td lang="' +
              escapeHTML(p.source_language) +
              '">' +
              a.source_ranges
                .map((r: any) => "<p>" + escapeHTML(r.quote) + "</p>")
                .join("") +
              '</td><td lang="' +
              escapeHTML(p.target_language) +
              '">' +
              (a.targets.length
                ? a.targets
                    .map((v: string) => "<p>" + escapeHTML(v) + "</p>")
                    .join("")
                : "<p>未译</p>") +
              "</td></tr>",
          )
          .join("") +
        "</tbody></table>",
    );
  return (
    '<?xml version="1.0" encoding="UTF-8"?><xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="' +
    escapeHTML(p.source_language) +
    '" trgLang="' +
    escapeHTML(p.target_language) +
    '"><file id="book">' +
    p.alignments
      .map(
        (a: any) =>
          '<unit id="' +
          escapeHTML(a.id) +
          '"><segment><source>' +
          escapeHTML(a.source_ranges.map((r: any) => r.quote).join("\n")) +
          "</source><target>" +
          escapeHTML(a.targets.join("\n")) +
          "</target></segment></unit>",
      )
      .join("") +
    "</file></xliff>"
  );
}
export function pureAction(_action: string, _i: any) {
  return undefined;
}
export function readProfessional(
  action: string,
  p: any,
  sources: any[],
  i: any,
  _request?: any,
) {
  if (action === "get_alignment")
    return {
      alignments: p.alignments.map((a: any) => ({
        ...a,
        target_sha256: targetHash(a),
      })),
      source_language: p.source_language,
      target_language: p.target_language,
    };
  if (action === "check_translation") return checkTranslation(p, sources);
  if (action === "preview_update") {
    need(
      new Set(i.replacements.map((r: any) => r.old_source_index)).size ===
        i.replacements.length,
      "重复旧来源替代。",
    );
    return {
      applied: false,
      replacements: i.replacements.map((r: any) => {
        need(
          p.scope_indices.includes(r.old_source_index) &&
            !p.scope_indices.includes(r.new_source_index),
          "更新须从旧源文指向追加的新来源。",
        );
        sourceText(sources[r.new_source_index]);
        return {
          ...r,
          affected_alignment_ids: p.alignments
            .filter((a: any) =>
              a.source_ranges.some(
                (s: any) => s.source_index === r.old_source_index,
              ),
            )
            .map((a: any) => a.id),
        };
      }),
      note: "只预览影响，旧对齐和意见保持；新对齐须单独核对。",
    };
  }
  if (action === "export_bilingual")
    return artifact(
      bilingual(p, i.format),
      p.title + (i.format === "html" ? ".html" : ".xlf"),
      i.format === "html" ? "text/html" : "application/xliff+xml",
      i,
    );
}
