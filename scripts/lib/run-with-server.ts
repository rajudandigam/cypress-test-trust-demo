import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type ServerExpectation = {
  baseUrl?: string;
  scenario: string;
  appIdentity: string;
};

function healthUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/api/health`;
}

export function computeAppIdentity(cwd = process.cwd()): string {
  const pkg = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8")) as {
    name: string;
    version: string;
  };
  let git = "nogit";
  try {
    git = fs.readFileSync(path.join(cwd, ".git/HEAD"), "utf8").trim();
  } catch {
    /* ignore */
  }
  const hash = createHash("sha256").update(`${pkg.name}@${pkg.version}|${git}`).digest("hex").slice(0, 12);
  return `${pkg.name}@${pkg.version}+${hash}`;
}

async function readHealth(baseUrl: string): Promise<{
  status?: string;
  scenario?: string;
  appIdentity?: string;
} | null> {
  try {
    const res = await fetch(healthUrl(baseUrl));
    if (!res.ok) return null;
    return (await res.json()) as { status?: string; scenario?: string; appIdentity?: string };
  } catch {
    return null;
  }
}

async function waitForMatchingHealth(
  expected: ServerExpectation,
  timeoutMs = 60_000,
): Promise<void> {
  const baseUrl = expected.baseUrl || "http://127.0.0.1:3000";
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const body = await readHealth(baseUrl);
    if (
      body?.status === "ready" &&
      body.scenario === expected.scenario &&
      body.appIdentity === expected.appIdentity
    ) {
      return;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    `Timed out waiting for matching app at ${baseUrl} (scenario=${expected.scenario}, identity=${expected.appIdentity})`,
  );
}

function killTree(child: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (!child.pid) {
      resolve();
      return;
    }
    try {
      // Kill the process group when detached; otherwise the process itself.
      process.kill(-child.pid, "SIGTERM");
    } catch {
      try {
        child.kill("SIGTERM");
      } catch {
        /* ignore */
      }
    }
    const t = setTimeout(() => {
      try {
        process.kill(-child.pid!, "SIGKILL");
      } catch {
        try {
          child.kill("SIGKILL");
        } catch {
          /* ignore */
        }
      }
      resolve();
    }, 3000);
    child.once("exit", () => {
      clearTimeout(t);
      resolve();
    });
  });
}

export async function withBuiltServer<T>(
  expected: ServerExpectation,
  fn: () => Promise<T>,
): Promise<T> {
  const baseUrl = expected.baseUrl || "http://127.0.0.1:3000";
  let child: ChildProcess | undefined;
  let owned = false;

  const existing = await readHealth(baseUrl);
  if (existing?.status === "ready") {
    if (
      existing.scenario !== expected.scenario ||
      existing.appIdentity !== expected.appIdentity
    ) {
      throw new Error(
        `Refusing stale/unrelated server on ${baseUrl}: got scenario=${existing.scenario} identity=${existing.appIdentity}, expected scenario=${expected.scenario} identity=${expected.appIdentity}`,
      );
    }
  } else {
    // Always rebuild before spawning so APP_IDENTITY / health fields match source.
    const built = spawnSync("npm", ["run", "build"], {
      stdio: "inherit",
      env: process.env,
    });
    if (built.status !== 0) {
      throw new Error(`npm run build failed with status ${built.status}`);
    }
    child = spawn("npm", ["run", "start"], {
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_ENV: "production",
        DEMO_MODE: "true",
        DEMO_SCENARIO: expected.scenario,
        APP_IDENTITY: expected.appIdentity,
      },
      detached: process.platform !== "win32",
    });
    owned = true;
    await waitForMatchingHealth(expected);
  }

  try {
    return await fn();
  } finally {
    if (owned && child) {
      await killTree(child);
    }
  }
}
