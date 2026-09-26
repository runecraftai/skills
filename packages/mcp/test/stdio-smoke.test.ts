import { afterAll, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createServer as createHttpsServer } from "node:https";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const content = new TextEncoder().encode("---\nname: smoke\ndescription: smoke fixture\n---\n# Smoke skill\n");
const file = { path: "SKILL.md", size: content.length, sha256: createHash("sha256").update(content).digest("hex") };
const registry = {
  schemaVersion: 1, catalogVersion: "1.0.0", revision: "smoke-rev", generatedAt: "2026-01-01T00:00:00Z",
  skills: [{ id: "smoke-skill", name: "Smoke Skill", version: "1.0.0", category: "Testing", description: "A smoke fixture skill", license: "MIT", attribution: [{ name: "Test", url: "https://example.com", text: "Test" }], entrypoint: "SKILL.md", files: [file], contentSha256: "0".repeat(64) }],
};
const certDir = mkdtempSync(`${tmpdir()}/grimoire-mcp-cert-`);
const keyFile = resolve(certDir, "key.pem"), certFile = resolve(certDir, "cert.pem");
execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", keyFile, "-out", certFile, "-days", "1", "-subj", "/CN=localhost", "-addext", "subjectAltName=IP:127.0.0.1"], { stdio: "ignore" });
const http = createHttpsServer({ key: readFileSync(keyFile), cert: readFileSync(certFile) }, (request, response) => {
  if (request.url === "/registry.json") {
    response.setHeader("content-type", "application/json"); response.end(JSON.stringify(registry));
  } else if (request.url === "/skills/smoke-skill/SKILL.md") response.end(content);
  else { response.statusCode = 404; response.end(); }
});
await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve));
const address = http.address();
if (!address || typeof address === "string") throw new Error("Expected local HTTP address");
const transport = new StdioClientTransport({
  command: "bun", args: [resolve(import.meta.dir, "../dist/index.js")],
  env: { ...process.env, GRIMOIRE_CATALOG_BASE: `https://127.0.0.1:${address.port}`, GRIMOIRE_MCP_CACHE: `/tmp/grimoire-mcp-smoke-${process.pid}`, NODE_TLS_REJECT_UNAUTHORIZED: "0" },
});
const client = new Client({ name: "grimoire-stdio-smoke", version: "1.0.0" });
afterAll(async () => { await client.close(); http.close(); rmSync(certDir, { recursive: true, force: true }); });

describe("stdio MCP roundtrip", () => {
  test("launches, discovers tools, and reads one bounded skill", async () => {
    await client.connect(transport);
    const discovered = await client.listTools();
    expect(discovered.tools.map((tool) => tool.name)).toContain("read_skill");
    const result = await client.callTool({ name: "read_skill", arguments: { id: "smoke-skill" } });
    const output = JSON.stringify(result);
    expect(result.isError).not.toBe(true);
    expect(output).toContain("# Smoke skill");
    expect(Buffer.byteLength(output, "utf8")).toBeLessThan(24_000);
  });
});
