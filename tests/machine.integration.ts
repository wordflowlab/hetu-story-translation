import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import manifest from "../contracts/plugin-manifest.json" with { type: "json" };
import { newProject, KIND } from "../src/domain/model.ts";
import { config } from "../src/domain/config.ts";
import {
  scenario,
  original,
  cardFile,
  wav,
  sha,
  base,
  selection,
} from "./support/scenario.ts";
import { start } from "./support/machine.ts";
import { importText } from "./support/import.ts";
import { candidate, managed } from "./support/creative.ts";
const error = (r: any) => r.error?.code ?? r.data?.result?.error?.code;
test(
  "真实稳定CLI/MCP全动作、专业流程、固定导出、恢复及热插拔",
  { timeout: 1200000 },
  async (t) => {
    const c = await start();
    let serial = 0;
    const key = () => "step-" + ++serial;
    const expectedRejections: string[] = [];
    const artifact = async (action: string, r: any, args: any = {}) => {
      let offset = 0,
        expected: string | undefined,
        total: number | undefined;
      const pieces: Buffer[] = [];
      do {
        const v = await c.invoke(action, {
          ...selection(r),
          ...args,
          offset,
          max_bytes: 65536,
        });
        assert.equal(v.offset, offset);
        const bytes = Buffer.from(v.base64, "base64");
        assert.equal(sha(bytes), v.chunk_sha256);
        expected ??= v.sha256;
        total ??= v.total_bytes;
        assert.equal(expected, v.sha256);
        pieces.push(bytes);
        if (v.next_offset === null) break;
        assert.equal(v.next_offset, offset + bytes.length);
        offset = v.next_offset;
      } while (offset < 32 * 1024 * 1024);
      const bytes = Buffer.concat(pieces);
      assert.equal(bytes.length, total);
      assert.equal(sha(bytes), expected);
      return bytes;
    };
    try {
      t.diagnostic(c.directory);
      assert.equal(c.cap.access_mode, "open");
      for (const resource of [
        undefined,
        "references/workflows.md",
        "references/operations.md",
      ]) {
        const s = await c.invoke("skills.read", {
          skill_id: manifest.contributions.skills[0].id,
          ...(resource ? { resource } : {}),
        });
        assert.ok(s.content.length > 100);
      }
      const refs = await importText(c, [original]);
      const p = scenario(c.work);
      if (KIND === "series_organizer") {
        const view = await c.ok("hetu_read_work", {
          management_ref: c.management,
          work_ref: c.work,
        });
        p.members[0].fixed_ref = view.summary.fixed_ref;
      }
      let r = await c.invoke("save_project", {
        content: p,
        source_refs: refs,
        expected_revision: 0,
        expected_sha256: "",
        operation_key: "seed",
      });
      const initial = r;
      for (const [item, field] of Object.entries(config.fields))
        for (const row of p[field as string])
          r = await c.invoke("put_" + item, { ...base(r, key()), [item]: row });
      assert.equal(
        (await c.invoke("list_projects", { query: "雨港" })).objects.length,
        1,
      );
      assert.equal(
        (await c.invoke("get_source", { ...selection(r), source_index: 0 }))
          .source.content,
        original,
      );
      const edit = {
        ...base(r, key()),
        content: { ...r.object.content, title: "雨港来信 第二版" },
      };
      r = await c.invoke("save_project", edit);
      assert.equal((await c.invoke("save_project", edit)).sha256, r.sha256);
      assert.equal(
        error(
          await c.raw("save_project", {
            ...edit,
            content: { ...edit.content, title: "同键异参" },
          }),
        ),
        "idempotency_conflict",
      );
      assert.equal(
        error(await c.raw("save_project", { ...edit, operation_key: key() })),
        "revision_conflict",
      );
      assert.equal(
        (await c.invoke("get_operation", { operation_key: edit.operation_key }))
          .sha256,
        r.sha256,
      );
      r = await c.invoke("save_project", {
        ...base(r, key()),
        content: {
          ...r.object.content,
          basis_refs: [
            {
              owner_plugin_id: manifest.id,
              object_id: initial.object.object_id,
              revision: initial.object.revision,
              sha256: initial.sha256,
            },
          ],
        },
      });
      assert.equal(
        (await c.invoke("get_basis", { ...selection(r), basis_index: 0 })).basis
          .sha256,
        initial.sha256,
      );
      if (KIND === "lorebook_bridge") {
        const parsed = await c.invoke("parse_file", { file: cardFile });
        assert.equal(parsed.character.name, "林溪");
        await c.invoke("inspect_exchange", {
          ...selection(r),
          exchange_id: "lin",
        });
        await c.invoke("preview_mapping", {
          ...selection(r),
          exchange_id: "lin",
        });
        r = await c.invoke("put_mapping", {
          ...base(r, key()),
          mapping: {
            id: "name-map",
            exchange_id: "lin",
            field_path: "data.name",
            target_kind: "character",
            target_entity_ref: null,
            note: "准备设定候选，不直接采用",
          },
        });
        assert.equal(
          (
            await artifact("export_exchange", r, {
              exchange_id: "lin",
              original_file: cardFile,
            })
          ).toString(),
          Buffer.from(cardFile.base64, "base64").toString(),
        );
      }
      if (KIND === "interactive_fiction") {
        assert.equal(
          (await c.invoke("check_graph", selection(r))).ending_routes.length,
          1,
        );
        const route = await c.invoke("play_route", {
          ...selection(r),
          choice_ids: ["follow", "meet"],
        });
        assert.equal(route.ending, true);
        r = await c.invoke("put_save", {
          ...base(r, key()),
          save: {
            id: "first-route",
            title: "第一条完整路线",
            story_sha256: route.story_sha256,
            choice_ids: ["follow", "meet"],
          },
        });
        assert.equal(
          (
            await c.invoke("replay_save", {
              ...selection(r),
              save_id: "first-route",
            })
          ).ending,
          true,
        );
        assert.match(
          (await artifact("export_player", r)).toString(),
          /保存存档/,
        );
      }
      if (KIND === "series_organizer") {
        await c.invoke("get_series_map", selection(r));
        await c.invoke("check_series", selection(r));
        assert.equal(
          error(
            await c.raw("inspect_member_link", {
              ...selection(r),
              member_id: "side",
            }),
          ),
          "forbidden",
        );
        expectedRejections.push("inspect_member_link:no_host_link");
      }
      if (KIND === "story_translation") {
        await c.invoke("get_alignment", selection(r));
        assert.equal(
          (await c.invoke("check_translation", selection(r))).coverage[0]
            .coverage,
          1,
        );
        const made = await candidate(
          c,
          "林溪走出邮局，终于决定去寻找寄信人。\n",
          "translation-new-source",
        );
        refs.push(made.source_ref);
        r = await c.invoke("save_project", {
          ...base(r, key()),
          content: r.object.content,
          source_refs: refs,
        });
        assert.equal(
          (
            await c.invoke("preview_update", {
              ...selection(r),
              replacements: [{ old_source_index: 0, new_source_index: 1 }],
            })
          ).applied,
          false,
        );
        const a = r.object.content.alignments[0];
        r = await c.invoke("put_issue", {
          ...base(r, key()),
          issue: {
            id: "terminology",
            title: "确认地名",
            alignment_id: a.id,
            target_sha256: sha(JSON.stringify(a.targets)),
            comment: "保持译法一致",
            status: "open",
            resolution: "",
            recheck_sha256: null,
          },
        });
        assert.match(
          (
            await artifact("export_bilingual", r, { format: "html" })
          ).toString(),
          /Rain Harbour/,
        );
        assert.match(
          (
            await artifact("export_bilingual", r, { format: "xliff" })
          ).toString(),
          /<xliff/,
        );
      }
      if (KIND === "readthrough") {
        const b = wav();
        assert.equal(
          (
            await c.invoke("inspect_wav", {
              file: {
                filename: "test.wav",
                base64: b.toString("base64"),
                sha256: sha(b),
              },
            })
          ).duration_ms,
          100,
        );
        await c.invoke("check_timeline", selection(r));
        assert.equal(
          (
            await c.invoke("locate_audio", {
              ...selection(r),
              recording_id: "voice",
              time_ms: 20,
            })
          ).mappings.length,
          1,
        );
        assert.deepEqual(
          await artifact("export_audio", r, { recording_id: "voice" }),
          b,
        );
        const inline = {
          filename: "片段.wav",
          base64: b.toString("base64"),
          sha256: sha(b),
        };
        const scan = await c.ok("hetu_managed_assets_inspect", {
          management_ref: c.management,
          work_ref: c.work,
          inline_source: inline,
        });
        const imported = await managed(
          c,
          "assets.import",
          {
            work_ref: c.work,
            inline_source: inline,
            expected_file: { sha256: scan.sha256, size_bytes: scan.size_bytes },
            title: "实际固定声音",
            source: {
              source_type: "author_supplied",
              creator_statement: "隔离PCM格式样本，非语音内容验收",
            },
            rights_status: "unknown",
            redistribution_allowed: false,
            rights_statement: "",
            operation_key: "audio-import",
          },
          "audio-import",
        );
        refs.push({
          kind: "asset",
          work_ref: c.work,
          asset_id: imported.asset.asset_id,
          revision: imported.asset.revision,
          sha256: imported.sha256,
        });
        r = await c.invoke("save_project", {
          ...base(r, key()),
          source_refs: refs,
          content: {
            ...r.object.content,
            recordings: [
              {
                ...r.object.content.recordings[0],
                inline_wav: null,
                asset_source_index: refs.length - 1,
              },
            ],
          },
        });
        assert.deepEqual(
          await artifact("export_audio", r, { recording_id: "voice" }),
          b,
        );
      }
      if (KIND === "book_export") {
        assert.equal(
          (await c.invoke("preflight_book", selection(r))).chapters.length,
          1,
        );
        for (const format of ["html", "epub", "pdf"]) {
          const bytes = await artifact("compile_book", r, { format });
          assert.ok(bytes.length > 100);
          if (format === "pdf")
            assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
          if (format === "epub") assert.equal(bytes[0], 80);
        }
      }
      await c.invoke("get_project", selection(r));
      await c.invoke("build_context", {
        ...selection(r),
        goal: "接续下一环节",
        max_chars: 12000,
      });
      const handoff = await c.invoke("create_handoff", {
        ...selection(r),
        goal: "固定交接给下一环节",
      });
      assert.equal(handoff.basis_ref.sha256, r.sha256);
      await c.invoke("compare_versions", {
        object_id: r.object.object_id,
        from_revision: initial.object.revision,
        to_revision: r.object.revision,
      });
      for (const format of ["json", "markdown", "html"]) {
        const out = await c.invoke("export_project", {
          ...selection(r),
          format,
          max_bytes: 100000,
        });
        assert.ok(out.total_bytes > 20);
      }
      const core = c.cli("hetu.plugins.invoke", {
        ...c.binding,
        capabilities_sha256: c.cap.capabilities_sha256,
        action: "get_project",
        arguments: selection(r),
      });
      assert.equal(core.status, "succeeded");
      const finalRef = selection(r),
        finalSHA = r.sha256;
      if (KIND === "interactive_fiction")
        r = await c.invoke("save_project", {
          ...base(r, key()),
          content: { ...r.object.content, entry_node: null },
        });
      for (const [item, field] of Object.entries(config.fields).reverse())
        for (const row of [...r.object.content[field as string]])
          r = await c.invoke("remove_" + item, {
            ...base(r, key()),
            [item + "_id"]: row.id,
          });
      assert.equal((await c.invoke("get_project", finalRef)).sha256, finalSHA);
      await c.apply("disable");
      assert.ok(error(await c.raw("get_project", finalRef)));
      await c.apply("enable");
      await c.discover();
      assert.equal((await c.invoke("get_project", finalRef)).sha256, finalSHA);
      await c.apply("uninstall");
      assert.ok(error(await c.raw("get_project", finalRef)));
      await c.apply("install");
      await c.discover();
      assert.equal((await c.invoke("get_project", finalRef)).sha256, finalSHA);
      const missing = manifest.contributions.actions
        .map((a) => a.id)
        .filter(
          (id) =>
            !c.actions.has(id) &&
            !expectedRejections.some((v) => v.startsWith(id + ":")),
        );
      assert.deepEqual(missing, []);
      const dir = process.env.HETU_RECEIPT_DIRECTORY ?? "docs/research";
      await mkdir(dir, { recursive: true });
      await writeFile(
        path.join(dir, "runtime-acceptance.json"),
        JSON.stringify(
          {
            date: "2026-11-18",
            plugin_id: manifest.id,
            version: manifest.version,
            package_sha256: c.pkg.package_sha256,
            host_version: c.coreVersion,
            platform: process.platform,
            architecture: process.arch,
            actions: [...c.actions].filter((x) => x !== "skills.read"),
            expected_rejections: expectedRejections,
            skill_resources: 3,
            lifecycle: ["install", "disable", "enable", "uninstall", "install"],
            fixed_history: true,
            CAS: true,
            original_key_recovery: true,
            artifact_sha256_verified: true,
            limits: [
              "跨平台、真实创作质量、正文采纳、定稿和付费模型未在本用例验收",
            ],
          },
          null,
          2,
        ) + "\n",
      );
    } finally {
      await c.client.close();
    }
  },
);
