#!/usr/bin/env node
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { fetchRegistry, normalizePath, rankSkills, writeCacheFile, type Registry } from "../../core/src/index.js";

const BASE = process.env.GRIMOIRE_CATALOG_BASE ?? "https://cdn.jsdelivr.net/gh/runecraftai/skills@main/packages/skills/catalog/v1";
const CACHE = process.env.GRIMOIRE_MCP_CACHE ?? join(homedir(), ".cache/runecraft/grimoire-mcp");
const MAX = { search: 1200, read: 24000, fetch: 50000, prepare: 1500, list: 4000 } as const;
type Catalog = { registry: Registry; freshness: "fresh" | "stale"; warning?: string };
const validId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
function bounded(value: unknown, ceiling: number): string {
  const text = JSON.stringify(value);
  if (Buffer.byteLength(text, "utf8") > ceiling) throw new Error(`Response exceeds ${ceiling} byte ceiling`);
  return text;
}
function text(value: unknown, ceiling = 50_000) {
  const output = typeof value === "string" ? value : JSON.stringify(value);
  if (Buffer.byteLength(output, "utf8") > ceiling) throw new Error(`Response exceeds ${ceiling} byte ceiling`);
  return { content: [{ type: "text" as const, text: output }] };
}
function stripFrontmatter(content: string) { return content.replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---\r?\n/, ""); }
function assertRevision(requested: string | undefined, current: string) {
  if (requested !== undefined && requested !== current) throw new Error("Requested revision is not available");
}
export function createHandlers(options: { catalog: () => Promise<Catalog>; fetchFile: (revision: string, id: string, path: string) => Promise<Uint8Array>; cacheDir?: string }) {
  const catalog = options.catalog;
  async function getSkill(id: string, revision?: string) {
    validId.parse(id);
    const result = await catalog(); assertRevision(revision, result.registry.revision);
    const skill = result.registry.skills.find((item) => item.id === id);
    if (!skill) throw new Error(`Unknown skill: ${id}`);
    return { result, skill };
  }
  return {
    async search_skills({ query, limit = 5 }: { query: string; limit?: number }) {
      if (typeof query !== "string" || query.length > 300) throw new Error("query must be at most 300 characters");
      if (!Number.isInteger(limit) || limit < 1 || limit > 5) throw new Error("limit must be between 1 and 5");
      const { registry } = await catalog();
      const skills = rankSkills(query, registry.skills).slice(0, limit).map(({skill, score, matchQuality}) => ({ id: skill.id, name: skill.name, category: skill.category, description: skill.description.slice(0, 100), score, matchQuality, version: skill.version }));
      return bounded({ skills }, MAX.search);
    },
    async read_skill({ id, revision }: { id: string; revision?: string }) {
      const { result, skill } = await getSkill(id, revision);
      const entry = skill.files.find((f) => f.path === skill.entrypoint)!;
      const bytes = await options.fetchFile(result.registry.revision, id, entry.path);
      if (bytes.length !== entry.size || createHash("sha256").update(bytes).digest("hex") !== entry.sha256) throw new Error("Digest mismatch");
      const body = stripFrontmatter(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
      const payload = { id, revision: result.registry.revision, body, files: skill.files.filter((f) => f.path !== skill.entrypoint).map(({path, sha256, size}) => ({path, sha256, size})) };
      const output = JSON.stringify(payload);
      if (Buffer.byteLength(output) > MAX.read) throw new Error("SKILL.md exceeds response ceiling");
      return output;
    },
    async fetch_skill_files({ id, paths, revision }: { id: string; paths: string[]; revision?: string }) {
      const { result, skill } = await getSkill(id, revision);
      if (!Array.isArray(paths) || paths.length < 1 || paths.length > 20) throw new Error("paths must contain 1 to 20 paths");
      const files: {path:string; content:string}[] = [], omitted: {path:string; reason:string}[] = [];
      let used = 0;
      for (const raw of paths) {
        let path: string; try { path = normalizePath(raw); } catch { omitted.push({path:String(raw).slice(0,100),reason:"invalid path"}); continue; }
        const file = skill.files.find((f) => f.path === path);
        if (!file || path === skill.entrypoint) { omitted.push({path,reason:"not an allowlisted non-entrypoint file"}); continue; }
        try {
          const bytes = await options.fetchFile(result.registry.revision,id,path);
          if(bytes.length !== file.size || createHash("sha256").update(bytes).digest("hex") !== file.sha256) throw new Error("digest mismatch");
          const content = new TextDecoder("utf-8",{fatal:true}).decode(bytes);
          const record={path,content}, size=Buffer.byteLength(JSON.stringify(record));
          if(used+size > MAX.fetch) { omitted.push({path,reason:"response ceiling"}); continue; }
          files.push(record); used+=size;
        } catch { omitted.push({path,reason:"fetch or verification failed"}); }
      }
      let payload={id,revision:result.registry.revision,files,omitted};
      while(Buffer.byteLength(JSON.stringify(payload),"utf8")>MAX.fetch && files.length) {
        const removed=files.pop()!; omitted.push({path:removed.path,reason:"response ceiling"});
        payload={id,revision:result.registry.revision,files,omitted};
      }
      return bounded(payload,MAX.fetch);
    },
    async prepare_skill_files({ id, paths, revision, dry_run = false }: { id: string; paths: string[]; revision?: string; dry_run?: boolean }) {
      const { result, skill } = await getSkill(id, revision);
      if (!Array.isArray(paths) || paths.length < 1 || paths.length > 20 || typeof dry_run !== "boolean") throw new Error("invalid paths or dry_run");
      const selected = [...new Set(paths.map((p) => normalizePath(p)))];
      for(const path of selected) if(path===skill.entrypoint || !skill.files.some(f=>f.path===path)) throw new Error(`File not allowlisted: ${path}`);
      const root = options.cacheDir ?? CACHE, files=[] as {path:string;uri:string;sha256:string}[];
      if (!dry_run) {
        for(const path of selected) {
          const bytes=await options.fetchFile(result.registry.revision,id,path), record=skill.files.find(f=>f.path===path)!;
          if(bytes.length!==record.size || createHash("sha256").update(bytes).digest("hex")!==record.sha256) throw new Error("Digest mismatch");
          const uri=await writeCacheFile(root,"runecraft",result.registry.revision,skill,path,bytes);
          files.push({path,uri:`file://${uri}`,sha256:record.sha256});
        }
      }
      const digest=createHash("sha256").update(selected.map(p=>`${p}\0${skill.files.find(f=>f.path===p)!.sha256}`).join("\n")).digest("hex");
      return bounded({id,revision:result.registry.revision,dryRun:dry_run,files,digest},MAX.prepare);
    },
    async list_skills({ explicit_request, offset = 0, limit = 20 }: { explicit_request: boolean; offset?: number; limit?: number }) {
      if(explicit_request!==true) throw new Error("Set explicit_request=true to browse the catalog");
      if(!Number.isInteger(offset)||offset<0||!Number.isInteger(limit)||limit<1||limit>30) throw new Error("invalid pagination");
      const {registry}=await catalog(); const all=[...registry.skills].sort((a,b)=>a.id.localeCompare(b.id));
      const entries=all.slice(offset,offset+limit).map(({id,category,description})=>({id,category,description:description.slice(0,100)}));
      const result={offset,limit,total:all.length,skills:entries,nextOffset:offset+entries.length<all.length?offset+entries.length:null};
      let output=JSON.stringify(result);
      while(Buffer.byteLength(output)>MAX.list && entries.length){entries.pop();result.nextOffset=offset+entries.length;output=JSON.stringify(result);}
      return output;
    }
  };
}

export async function createServer(handlersOverride?: ReturnType<typeof createHandlers>) {
  const registryUrl = `${BASE}/registry.json`;
  let cached: Catalog | undefined;
  const load = async (): Promise<Catalog> => {
    if(cached) return cached;
    const result=await fetchRegistry({url:registryUrl,cacheFile:join(CACHE,"registry.json")});
    cached={registry:result.registry,freshness:result.freshness,warning:result.warning}; return cached;
  };
  const handlers=handlersOverride ?? createHandlers({catalog:load,fetchFile:async(revision,id,path)=>{
    const response=await fetch(`${BASE.replace(/@[^/]+(?=\/packages)/,`@${revision}`)}/skills/${encodeURIComponent(id)}/${path.split("/").map(encodeURIComponent).join("/")}`,{redirect:"error",signal:AbortSignal.timeout(15000)});
    if(!response.ok) throw new Error(`Content fetch failed: ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }});
  const server=new McpServer({name:"grimoire-mcp",version:"1.0.0"});
  server.registerTool("search_skills",{description:"Search the skill catalog on demand",inputSchema:{query:z.string().max(300),limit:z.number().int().min(1).max(5).default(5)}},async(args)=>text(await handlers.search_skills(args),MAX.search));
  server.registerTool("read_skill",{description:"Read one skill entrypoint and its compact file index",inputSchema:{id:z.string(),revision:z.string().optional()}},async(args)=>text(await handlers.read_skill(args),MAX.read));
  server.registerTool("fetch_skill_files",{description:"Fetch explicitly requested allowlisted non-entrypoint skill files",inputSchema:{id:z.string(),paths:z.array(z.string()).min(1).max(20),revision:z.string().optional()}},async(args)=>text(await handlers.fetch_skill_files(args),MAX.fetch));
  server.registerTool("prepare_skill_files",{description:"Verify and stage explicitly requested files in the revision-keyed cache",inputSchema:{id:z.string(),paths:z.array(z.string()).min(1).max(20),revision:z.string().optional(),dry_run:z.boolean().default(false)}},async(args)=>text(await handlers.prepare_skill_files(args),MAX.prepare));
  server.registerTool("list_skills",{description:"Browse short catalog descriptions only on explicit request",inputSchema:{explicit_request:z.boolean(),offset:z.number().int().min(0).default(0),limit:z.number().int().min(1).max(30).default(20)}},async(args)=>text(await handlers.list_skills(args),MAX.list));
  return server;
}
export async function start(transport: { connect(server: McpServer): Promise<void> }) { const server=await createServer(); await transport.connect(server); }
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) start({connect:async(server)=>server.connect(new StdioServerTransport())}).catch((error)=>{console.error(error);process.exitCode=1;});
