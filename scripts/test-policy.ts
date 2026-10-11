import { runPolicyCheck } from "./lib/policy-check.js";

const findings = runPolicyCheck();
if (findings.length) {
  console.error(JSON.stringify({ ok: false, findings }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, findings: [] }));
