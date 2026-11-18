import type { BackendContext } from "../vendor/hetu-sdk.ts";
import { Project } from "./application/project.ts";
let app: Project | undefined;
export function apply(context: BackendContext) {
  app = new Project(context);
  context.effect(() => {
    app = undefined;
  });
}
export async function invoke(action: string, input: unknown) {
  if (!app) throw Error("插件未激活。");
  return app.invoke(action, input);
}
