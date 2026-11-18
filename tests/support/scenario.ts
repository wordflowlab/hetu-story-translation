import { createHash } from "node:crypto";
import { newProject, KIND } from "../../src/domain/model.ts";
export const original =
  "林溪在雨港邮局等信。\n她把旧钥匙放进信封【注一】。\n\n第二天，她决定出发。\n";
export const sha = (v: string | Uint8Array) =>
  createHash("sha256").update(v).digest("hex");
export const sourceRef = {
  kind: "document",
  work_ref: {
    workspace_id: "workspace_test",
    kind: "novel",
    object_id: "novel_test",
  },
  document_id: "doc_11111111-1111-4111-8111-111111111111",
  revision_id: "rev_11111111-1111-4111-8111-111111111111",
  sha256: sha(original),
};
export const range = {
  source_index: 0,
  byte_start: 0,
  byte_end: Buffer.byteLength(original),
  quote: original,
};
export const cardJSON = JSON.stringify({
  spec: "chara_card_v3",
  spec_version: "3.0",
  data: {
    name: "林溪",
    description: "雨港邮局的年轻邮差",
    personality: "克制而好奇",
    scenario: "一封没有署名的信",
    character_book: {
      entries: [
        { id: 1, keys: ["雨港"], content: "港口常年下雨", enabled: false },
      ],
    },
    extensions: {
      custom: { kept: true },
      regex_scripts: [{ script: "不执行" }],
    },
  },
});
export const cardFile = {
  filename: "林溪.json",
  base64: Buffer.from(cardJSON).toString("base64"),
  sha256: sha(cardJSON),
};
export function wav() {
  const frames = 800,
    b = Buffer.alloc(44 + frames * 2);
  b.write("RIFF");
  b.writeUInt32LE(b.length - 8, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(8000, 24);
  b.writeUInt32LE(16000, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(frames * 2, 40);
  for (let n = 0; n < frames; n++)
    b.writeInt16LE(Math.round(Math.sin((n * Math.PI) / 20) * 6000), 44 + n * 2);
  return b;
}
export function scenario(work: any = sourceRef.work_ref) {
  const p = newProject("雨港来信");
  if (KIND === "lorebook_bridge")
    p.exchanges = [
      {
        id: "lin",
        title: "林溪",
        filename: cardFile.filename,
        file_sha256: cardFile.sha256,
        format: "json",
        spec: "chara_card_v3",
        raw_json: cardJSON,
      },
    ];
  if (KIND === "interactive_fiction") {
    p.entry_node = "mail";
    p.variables = [
      { id: "trust", title: "相信来信", type: "number", initial: 0 },
    ];
    p.nodes = [
      {
        id: "mail",
        title: "旧邮局",
        text: "林溪收到一封没有署名的信。",
        kind: "scene",
        source_index: 0,
      },
      {
        id: "quay",
        title: "渡口",
        text: "她沿着旧钥匙上的记号来到渡口。",
        kind: "scene",
        source_index: 0,
      },
      {
        id: "dawn",
        title: "黎明",
        text: "她终于见到了寄信人。",
        kind: "ending",
        source_index: 0,
      },
    ];
    p.choices = [
      {
        id: "follow",
        from_node: "mail",
        to_node: "quay",
        label: "循着记号出发",
        conditions: [],
        effects: [{ variable_id: "trust", operator: "add", value: 1 }],
      },
      {
        id: "meet",
        from_node: "quay",
        to_node: "dawn",
        label: "在渡口等待",
        conditions: [{ variable_id: "trust", operator: "gte", value: 1 }],
        effects: [],
      },
    ];
  }
  if (KIND === "series_organizer") {
    p.members = [
      {
        id: "main",
        title: "雨港来信",
        fixed_ref: {
          work_ref: work,
          revision_ref: { revision: 1 },
          sha256: "a".repeat(64),
        },
        role: "main",
        summary: "旧邮局的来信",
        host_link_id: null,
        host_link_revision: null,
      },
      {
        id: "side",
        title: "雨港番外",
        fixed_ref: {
          work_ref: {
            ...work,
            object_id: "novel_22222222-2222-4222-8222-222222222222",
          },
          revision_ref: { revision: 1 },
          sha256: "b".repeat(64),
        },
        role: "side_story",
        summary: "寄信人的另一段经历",
        host_link_id: null,
        host_link_revision: null,
      },
    ];
    p.relations = [
      {
        id: "order",
        from_member: "main",
        to_member: "side",
        kind: "reading_order",
        note: "先读正篇，再读番外",
      },
    ];
    p.appearances = [
      {
        id: "lin-main",
        series_character_id: "lin",
        name: "林溪",
        member_id: "main",
        local_entity_ref: "character_lin",
        interpretation: "正篇中的邮差",
        status: "observed",
      },
    ];
    p.plans = [
      {
        id: "side-plan",
        title: "寄信人的视角",
        target_member: "side",
        source_member_ids: ["main"],
        goal: "只筹备番外，保留正篇悬念",
        constraints: ["不改正篇正文"],
        status: "proposed",
      },
    ];
  }
  if (KIND === "story_translation") {
    p.scope_indices = [0];
    p.alignments = [
      {
        id: "letter",
        title: "未署名来信",
        source_ranges: [range],
        targets: [
          "Lin Xi waited for a letter at the Rain Harbour post office.",
          "She placed the old key inside the envelope. The next day, she decided to leave.",
        ],
        status: "draft",
      },
    ];
    p.terms = [
      {
        id: "port",
        source: "雨港",
        target: "Rain Harbour",
        mode: "required",
        case_sensitive: true,
        note: "保留地名写法",
      },
    ];
  }
  if (KIND === "readthrough") {
    const b = wav();
    p.plans = [
      {
        id: "read-letter",
        title: "来信片段",
        ranges: [range],
        voice_note: "克制，清楚",
        status: "planned",
      },
    ];
    p.recordings = [
      {
        id: "voice",
        title: "声音格式验收样本",
        plan_id: "read-letter",
        audio_sha256: sha(b),
        duration_ms: 100,
        sample_rate: 8000,
        channels: 1,
        bits: "16",
        asset_source_index: null,
        inline_wav: b.toString("base64"),
        origin: "external_tool",
        speech_checked: false,
      },
    ];
    p.mappings = [
      {
        id: "map",
        recording_id: "voice",
        source_range: range,
        start_ms: 0,
        end_ms: 100,
        method: "estimated",
        note: "格式测试映射，不代表语音强制对齐",
      },
    ];
    p.notes = [
      {
        id: "note",
        title: "试读意见",
        recording_id: "voice",
        mapping_id: "map",
        start_ms: 10,
        end_ms: 50,
        comment: "确认意见可以定位回原文",
        status: "open",
        resolution: "",
      },
    ];
  }
  if (KIND === "book_export") {
    p.author = "隔离验收作者";
    p.identifier = "urn:hetu:rain-harbour";
    p.chapters = [
      {
        id: "letter",
        title: "第一章 来信",
        source_index: 0,
        volume: "雨港旧事",
        include: true,
      },
    ];
    p.footnotes = [
      {
        id: "key",
        chapter_id: "letter",
        marker: "【注一】",
        text: "钥匙是后续分支的线索。",
      },
    ];
  }
  return JSON.parse(JSON.stringify(p));
}
export const base = (r: any, key: string) => ({
  object_id: r.object.object_id,
  expected_revision: r.object.revision,
  expected_sha256: r.sha256,
  operation_key: key,
});
export const selection = (r: any) => ({
  object_id: r.object.object_id,
  revision: r.object.revision,
});
