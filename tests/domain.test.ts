import assert from "node:assert/strict";
import { test } from "node:test";
import {
  scenario,
  original,
  range,
  cardFile,
  cardJSON,
  wav,
  sha,
} from "./support/scenario.ts";
import {
  validateDomain,
  checkSources,
  coverage,
  checkTranslation,
  targetHash,
  readProfessional,
  bilingual,
} from "../src/domain/professional.ts";
const sources = [{ content: original }];
test("一对多译稿保持对齐并如实计算覆盖", async () => {
  const p = scenario();
  validateDomain(p);
  await checkSources(p, sources);
  assert.equal(coverage(p, sources)[0].coverage, 1);
  assert.equal(checkTranslation(p, sources).term_findings.length, 0);
  p.alignments[0].targets = [];
  assert.equal(coverage(p, sources)[0].coverage, 0);
});
test("重叠对齐不双重累计，多对一可表达", () => {
  const p = scenario();
  p.alignments.push({
    ...p.alignments[0],
    id: "second",
    targets: ["Another version"],
  });
  assert.equal(coverage(p, sources)[0].coverage, 1);
  p.alignments[0].source_ranges.push({ ...range });
  p.alignments[0].targets = ["One combined paragraph"];
  validateDomain(p);
});
test("错误引文和UTF-8边界拒绝", async () => {
  const p = scenario();
  p.alignments[0].source_ranges[0].quote = "伪造";
  await assert.rejects(() => checkSources(p, sources));
  p.alignments[0].source_ranges[0] = { ...range, byte_start: 1 };
  await assert.rejects(() => checkSources(p, sources));
});
test("术语要求、禁用与建议是可解释检查", () => {
  const p = scenario();
  p.terms[0].target = "WrongPort";
  assert.equal(checkTranslation(p, sources).term_findings[0].kind, "required");
  p.terms[0].target = "Rain Harbour";
  p.terms[0].mode = "forbidden";
  assert.equal(checkTranslation(p, sources).term_findings[0].kind, "forbidden");
});
test("旧意见与解决说明绑定确切译稿摘要", () => {
  const p = scenario(),
    old = targetHash(p.alignments[0]);
  p.issues = [
    {
      id: "i",
      title: "术语",
      alignment_id: "letter",
      target_sha256: old,
      comment: "保持雨港译法",
      status: "resolved",
      resolution: "已改",
      recheck_sha256: old,
    },
  ];
  assert.throws(() => validateDomain(p));
  p.alignments[0].targets.push("An additional line.");
  p.issues[0].recheck_sha256 = targetHash(p.alignments[0]);
  validateDomain(p);
  assert.equal(checkTranslation(p, sources).issues[0].stale, true);
});
test("源文更新只预览影响，双语导出转义并保留语言", () => {
  const p = scenario();
  const r: any = readProfessional(
    "preview_update",
    p,
    [...sources, { content: "新原文" }],
    { replacements: [{ old_source_index: 0, new_source_index: 1 }] },
  );
  assert.equal(r.applied, false);
  assert.deepEqual(r.replacements[0].affected_alignment_ids, ["letter"]);
  p.alignments[0].targets = ["<script>bad()</script> & translated"];
  assert.ok(!bilingual(p, "html").includes("<script>bad"));
  assert.match(bilingual(p, "xliff"), /trgLang="en"/);
  assert.match(bilingual(p, "xliff"), /&lt;script&gt;/);
});
