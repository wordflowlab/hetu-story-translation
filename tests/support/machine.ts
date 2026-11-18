import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import manifest from "../../contracts/plugin-manifest.json" with { type: "json" };
export const host = path.resolve(
  process.env.HETU_SOURCE ?? "../../limecloud/hetu",
);
export async function start() {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "hetu-story-translation-"),
  );
  await mkdir(path.join(directory, "requests"));
  const packageDirectory = path.join(directory, "package");
  await cp(
    path.resolve(process.env.HETU_TEST_PACKAGE ?? "dist"),
    packageDirectory,
    { recursive: true },
  );
  const packaged = !!process.env.HETU_PACKAGED_APP;
  assert.ok(
    !packaged || process.env.HETU_TEST_BIN,
    "安装验收必须明确随包机器入口目录",
  );
  const bin = process.env.HETU_TEST_BIN ?? path.join(host, "target/debug");
  const version = spawnSync(path.join(bin, "hetu"), ["--version"], {
    encoding: "utf8",
    timeout: 10000,
  });
  assert.equal(version.status, 0, version.stderr);
  const coreVersion = version.stdout.trim();
  const env = {
    ...process.env,
    HETU_DESKTOP_PROFILE: path.join(directory, "profile"),
    HETU_COLLABORATION_DIR: path.join(directory, "hub"),
    HETU_PLUGIN_STATE_DIR: path.join(directory, "plugins"),
    HETU_PLUGIN_ACCESS_DIR: path.join(directory, "access"),
    HETU_PLUGIN_NODE: process.execPath,
    HETU_PLUGIN_CLI: path.join(bin, "hetu-plugin"),
    HETU_APP_SERVER: path.join(bin, "hetu-app-server"),
    HETU_PLUGIN_MANAGER:
      process.env.HETU_PLUGIN_MANAGER ??
      path.join(host, "apps/desktop/dist/plugin-manager.mjs"),
  };
  if (packaged) {
    for (const key of [
      "HETU_PLUGIN_NODE",
      "HETU_PLUGIN_CLI",
      "HETU_APP_SERVER",
      "HETU_PLUGIN_MANAGER",
      "HETU_CLI",
      "ELECTRON_RUN_AS_NODE",
    ])
      delete (env as Record<string, string | undefined>)[key];
  }
  const resolve = createRequire(path.join(host, "apps/desktop/package.json"));
  const { Client } = await import(
    pathToFileURL(resolve.resolve("@modelcontextprotocol/client")).href
  );
  const { StdioClientTransport } = await import(
    pathToFileURL(resolve.resolve("@modelcontextprotocol/client/stdio")).href
  );
  const client = new Client(
    { name: manifest.id + "-test", version: "1" },
    { versionNegotiation: { mode: { pin: "2026-07-28" } } },
  );
  await client.connect(
    new StdioClientTransport({
      command: path.join(bin, "hetu-mcp"),
      args: [
        "--client",
        "codex",
        "--collaboration-dir",
        env.HETU_COLLABORATION_DIR,
      ],
      env,
      stderr: "pipe",
    }),
  );
  let serial = 0;
  const call = async (name: string, args: any = {}) => {
    const record = path.join(
      directory,
      "requests",
      String(++serial).padStart(4, "0"),
    );
    await writeFile(
      record + ".request.json",
      JSON.stringify({ name, arguments: args }),
      { mode: 0o600 },
    );
    const result = (await client.callTool({ name, arguments: args }))
      .structuredContent as any;
    await writeFile(record + ".result.json", JSON.stringify(result), {
      mode: 0o600,
    });
    return result;
  };
  const ok = async (name: string, args: any = {}) => {
    const r = await call(name, args);
    assert.equal(r.status, "succeeded", JSON.stringify(r));
    return r.data;
  };
  try {
    const tools = (await client.listTools()).tools.map((x: any) => x.name);
    const begin = await ok("hetu_begin_creation", {
      brief: "旧站隔离插件验收",
      locale: "zh-CN",
      operation_key: "begin",
    });
    const created = await ok("hetu_create_novel_from_project", {
      management_ref: begin.management_ref,
      project_id: begin.project.project_id,
      expected: { revision: begin.revision, sha256: begin.sha256 },
      target_path: begin.target_path,
      metadata: {
        title: "雨港来信",
        author_name: "隔离验收作者",
        synopsis: "旧邮局来信",
        genre: "悬疑",
        language_tag: "zh-CN",
        status: "writing",
      },
      operation_key: "create",
    });
    const management = created.workspace_management_ref,
      work = {
        workspace_id: management.scope_ref.id,
        kind: "novel",
        object_id: created.novel.novel_id,
      };
    const pkg = await ok("hetu_plugins_inspect_package", {
      package_directory: packageDirectory,
    });
    const apply = async (action: string) =>
      ok("hetu_plugins_apply", {
        action,
        plugin_id: manifest.id,
        package_directory: packageDirectory,
        package_sha256: pkg.package_sha256,
        expected_sha256: (await ok("hetu_plugins_inspect")).state_sha256,
        authorization_note: "隔离验收固定包安装生命周期",
        operation_key: "installation-" + ++serial,
      });
    await apply("install");
    const binding = {
      management_ref: management,
      work_ref: work,
      plugin_id: manifest.id,
      package_sha256: pkg.package_sha256,
    };
    let cap = await ok("hetu_plugins_capabilities", binding);
    const actions = new Set<string>();
    const raw = async (action: string, args: any = {}) =>
      call("hetu_plugins_invoke", {
        ...binding,
        capabilities_sha256: cap.capabilities_sha256,
        action,
        arguments: args,
      });
    const invoke = async (action: string, args: any = {}) => {
      const outer = await raw(action, args);
      assert.equal(outer.status, "succeeded", JSON.stringify(outer));
      assert.equal(
        outer.data.result.status,
        "succeeded",
        JSON.stringify(outer.data.result),
      );
      actions.add(action);
      return outer.data.result.data;
    };
    const discover = async () => {
      cap = await ok("hetu_plugins_capabilities", binding);
      return cap;
    };
    const cli = (action: string, input: any) => {
      const r = spawnSync(
        path.join(bin, "hetu"),
        [
          "--client",
          "codex",
          "--collaboration-dir",
          env.HETU_COLLABORATION_DIR,
          "call",
          action,
          "--input",
          "-",
        ],
        {
          input: JSON.stringify(input),
          env,
          encoding: "utf8",
          timeout: 60000,
          maxBuffer: 4 * 1024 * 1024,
        },
      );
      assert.equal(r.status, 0, r.stderr || r.stdout);
      return JSON.parse(r.stdout);
    };
    await writeFile(
      path.join(directory, "machine-context.json"),
      JSON.stringify({
        binding,
        capabilities_sha256: cap.capabilities_sha256,
        workspace: begin.target_path,
      }),
      { mode: 0o600 },
    );
    return {
      coreVersion,
      directory,
      workspace: begin.target_path,
      created,
      management,
      work,
      pkg,
      binding,
      get cap() {
        return cap;
      },
      tools,
      client,
      env,
      call,
      ok,
      raw,
      invoke,
      apply,
      discover,
      actions,
      cli,
    };
  } catch (error) {
    await client.close();
    throw error;
  }
}
