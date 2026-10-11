import "./load-env.js";
import { spawn, type ChildProcess } from "node:child_process";
import { parseScenario } from "../src/domain/scenario.js";

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx >= 0) return process.argv[idx + 1];
  const pref = process.argv.find((a) => a.startsWith(`${flag}=`));
  return pref ? pref.split("=").slice(1).join("=") : undefined;
}

const scenario = parseScenario(argValue("--scenario") || process.env.DEMO_SCENARIO || "healthy");
process.env.DEMO_MODE = "true";
process.env.DEMO_SCENARIO = scenario;
process.env.NODE_ENV = "production";

const children: ChildProcess[] = [];

function run(cmd: string, args: string[]) {
  const result = spawn(cmd, args, { stdio: "inherit", env: process.env, shell: true });
  return new Promise<void>((resolve, reject) => {
    result.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} exited ${code}`));
    });
  });
}

async function main() {
  await run("npm", ["run", "db:migrate"]);
  await run("npm", ["run", "db:seed"]);
  await run("npm", ["run", "build"]);

  const child = spawn("node", ["dist/server/index.js"], {
    stdio: "inherit",
    env: process.env,
  });
  children.push(child);
  console.log(JSON.stringify({ event: "demo_up", scenario, port: process.env.PORT || 3000 }));

  const shutdown = () => {
    for (const c of children) if (!c.killed) c.kill("SIGTERM");
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
