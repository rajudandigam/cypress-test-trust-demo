import { spawn, type ChildProcess } from "node:child_process";

async function waitForHealth(url: string, timeoutMs = 60_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const body = (await res.json()) as { status?: string };
        if (body.status === "ready") return;
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

export async function withBuiltServer<T>(fn: () => Promise<T>): Promise<T> {
  let child: ChildProcess | undefined;
  const alreadyUp = await fetch("http://127.0.0.1:3000/api/health")
    .then(async (r) => r.ok && ((await r.json()) as { status?: string }).status === "ready")
    .catch(() => false);

  if (!alreadyUp) {
    child = spawn("npm", ["start"], {
      stdio: "inherit",
      env: { ...process.env, NODE_ENV: "production" },
      shell: true,
    });
    await waitForHealth("http://127.0.0.1:3000/api/health");
  }

  try {
    return await fn();
  } finally {
    if (child && !child.killed) {
      child.kill("SIGTERM");
    }
  }
}
