import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, open, readFile, realpath, rename, rm } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve, sep } from "node:path";

export type FileRecord = { path: string; size: number; sha256: string };
export type Skill = { id: string; name: string; version: string; category: string; description: string; license: string; attribution: { name: string; url: string; text: string }[]; entrypoint: string; files: FileRecord[]; contentSha256: string };
export type Registry = { schemaVersion:  1; catalogVersion: string; revision: string; generatedAt: string; skills: Skill[] };
export function normalizePath(path: string): string {
  if (!path || path.startsWith("/") || /^[A-Za-z]:/.test(path) || path.includes("\\") || /[\u0000-\u001f\u007f]/.test(path)) throw new Error(`Invalid path: ${path}`);
  if (path.split("/").some((part) => !part || part === "." || part === "..")) throw new Error(`Invalid path: ${path}`);
  return path;
}
export function digestFiles(files: {path:string; bytes:Uint8Array}[]): string {
  const hash=createHash("sha256");
  for (const file of [...files].sort((a,b)=>Buffer.compare(Buffer.from(a.path),Buffer.from(b.path)))) { hash.update(normalizePath(file.path)); hash.update(Buffer.from([0])); hash.update(file.bytes); }
  return hash.digest("hex");
}
const record=(x:unknown): x is Record<string,any> => !!x && typeof x === "object" && !Array.isArray(x);
const nonempty=(x:unknown): x is string => typeof x === "string" && !!x.trim();
function keys(x:Record<string,any>, expected:string) { if(Object.keys(x).sort().join(",")!==expected) throw new Error("Invalid registry schema keys"); }
export function validateRegistry(v: unknown): asserts v is Registry {
  if(!record(v)) throw new Error("Invalid registry"); keys(v,"catalogVersion,generatedAt,revision,schemaVersion,skills");
  if(v.schemaVersion!==1 || !nonempty(v.catalogVersion)||!nonempty(v.revision)||!nonempty(v.generatedAt)||Number.isNaN(Date.parse(v.generatedAt))||!Array.isArray(v.skills)) throw new Error("Invalid registry schema");
  const ids=new Set<string>();
  for(const s of v.skills){ if(!record(s)) throw new Error("Invalid skill"); keys(s,"attribution,category,contentSha256,description,entrypoint,files,id,license,name,version");
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s.id)||ids.has(s.id)||![s.name,s.version,s.category,s.description,s.license,s.entrypoint].every(nonempty)||!Array.isArray(s.files)||!Array.isArray(s.attribution)||!s.attribution.length||! /^[a-f0-9]{64}$/.test(s.contentSha256)) throw new Error(`Invalid skill ${s.id}`); ids.add(s.id);
    const paths=new Set<string>(); for(const f of s.files){ if(!record(f)) throw new Error("Invalid file record"); keys(f,"path,sha256,size"); normalizePath(f.path); if(paths.has(f.path)||!Number.isSafeInteger(f.size)||f.size<0||!/^[a-f0-9]{64}$/.test(f.sha256)) throw new Error("Invalid file record"); for(const p of paths) if(p.startsWith(f.path+"/")||f.path.startsWith(p+"/")) throw new Error("Path collision"); paths.add(f.path); }
    if(!paths.has(s.entrypoint)) throw new Error("Missing entrypoint");
    for(const a of s.attribution) if(!record(a)||Object.keys(a).sort().join(",")!=="name,text,url"||![a.name,a.text].every(nonempty)||typeof a.url!=="string"||new URL(a.url).protocol!=="https:") throw new Error("Invalid attribution");
  }
}
export async function verifyFiles(skill: Skill, root: string): Promise<void> {
 const base=await realpath(root), content:{path:string;bytes:Uint8Array}[]=[];
 for(const f of skill.files){ const rel=normalizePath(f.path), target=resolve(base,...rel.split("/")); if(!target.startsWith(base+sep)) throw new Error("Path escapes root");
   let current=base; for(const part of rel.split("/")){ current=join(current,part); const stat=await lstat(current); if(stat.isSymbolicLink()) throw new Error("Symlink rejected"); if(current!==target&&!stat.isDirectory()) throw new Error("Non-directory path component"); }
   if(!(await lstat(target)).isFile()) throw new Error("Not a regular file"); const bytes=await readFile(target); if(bytes.length!==f.size||createHash("sha256").update(bytes).digest("hex")!==f.sha256) throw new Error(`Digest mismatch: ${rel}`); content.push({path:rel,bytes}); }
 if(digestFiles(content)!==skill.contentSha256) throw new Error("Content digest mismatch");
}
export async function writeCacheFile(root:string, registryId:string, revision:string, skill:Skill, path:string, bytes:Uint8Array):Promise<string>{
 const rel=normalizePath(path), f=skill.files.find(x=>x.path===rel); if(!f||bytes.length!==f.size||createHash("sha256").update(bytes).digest("hex")!==f.sha256) throw new Error("File not allowlisted or digest mismatch");
 const cache=resolve(root), destination=resolve(cache,normalizePath(registryId),normalizePath(revision),skill.id,...rel.split("/")); if(!destination.startsWith(cache+sep)) throw new Error("Cache path escapes root");
 await mkdir(cache,{recursive:true,mode:0o700}); if((await lstat(cache)).isSymbolicLink()) throw new Error("Symlink cache root");
 const parent=dirname(destination); await mkdir(parent,{recursive:true,mode:0o700}); const temp=destination+`.${randomUUID()}.tmp`; const handle=await open(temp,"wx",0o600);
 try { await handle.writeFile(bytes); await handle.close(); await rename(temp,destination); } catch(e){ await handle.close().catch(()=>{}); await rm(temp,{force:true}); throw e; } return destination;
}
export type Ranked={skill:Skill;score:number;matchQuality:"exact"|"strong"|"possible"|"weak"};
const norm=(s:string)=>s.normalize("NFKC").toLocaleLowerCase("und").replace(/[^\p{L}\p{N}]+/gu," ").trim();
export function rankSkills(query:string, skills:Skill[]):Ranked[]{ const q=norm(query); if(!q)return[]; const tokens=[...new Set(q.split(/\s+/))]; return skills.map(skill=>{ const id=norm(skill.id), name=id.replace(/-/g," "), desc=norm(skill.description), cat=norm(skill.category); let score=q===id||q===name?100:0; for(const t of tokens){ if(id.includes(t)||name.includes(t))score+=20; if(desc.includes(t))score+=8; if(cat.includes(t))score+=3; } if(name.includes(q)||desc.includes(q))score+=8; score=Math.min(score,100); return {skill,score,matchQuality:score>=100&&q===id||q===name?"exact":score>=50?"strong":score>=25?"possible": "weak"} as Ranked; }).filter(x=>x.score>=12).sort((a,b)=>b.score-a.score||Number(norm(b.skill.id)===q)-Number(norm(a.skill.id)===q)||a.skill.id.localeCompare(b.skill.id)); }
export type FetchResult={registry:Registry; freshness:"fresh"|"stale"; warning?:string};
export async function fetchRegistry(options:{url:string;cacheFile:string;ttlMs?:number;now?:number;fetcher?:(input:any, init?:any)=>Promise<Response>;revision?:string}):Promise<FetchResult>{
 const now=options.now??Date.now(), ttl=options.ttlMs??900_000, fetcher=options.fetcher??fetch; let cached: {registry:Registry;checkedAt:number;etag?:string;modified?:string}|undefined;
 try { const parsed=JSON.parse(await readFile(options.cacheFile,"utf8")) as typeof cached; if(parsed){validateRegistry(parsed.registry);cached=parsed;} } catch {}
 if(options.revision&&cached?.registry.revision===options.revision)return {registry:cached.registry,freshness:"fresh"};
 if(cached&&now-cached.checkedAt<ttl&&(!options.revision||cached.registry.revision===options.revision)) return {registry:cached.registry,freshness:"fresh"};
 const url=new URL(options.url); if(url.protocol!=="https:") throw new Error("HTTPS required");
 try { const headers=new Headers(); if(cached?.etag)headers.set("If-None-Match",cached.etag); if(cached?.modified)headers.set("If-Modified-Since",cached.modified);
   const response=await fetcher(url,{headers,redirect:"error"}); if(response.status===304&&cached){cached.checkedAt=now; await atomicJson(options.cacheFile,cached);return{registry:cached.registry,freshness:"fresh"};}
   if(!response.ok)throw new Error(`Registry fetch failed: ${response.status}`); const data=await response.json(); validateRegistry(data); if(options.revision&&data.revision!==options.revision)throw new Error("Pinned revision mismatch");
   const next={registry:data,checkedAt:now,etag:response.headers.get("etag")??undefined,modified:response.headers.get("last-modified")??undefined}; await atomicJson(options.cacheFile,next); return{registry:data,freshness:"fresh"};
 }catch(error){ if(cached&&now-cached.checkedAt<=86_400_000&&(!options.revision||cached.registry.revision===options.revision))return{registry:cached.registry,freshness:"stale",warning:`Using stale registry after fetch failure: ${String(error)}`}; throw error; }
}
async function atomicJson(path:string,value:unknown){await mkdir(dirname(path),{recursive:true,mode:0o700});const temp=path+`.${randomUUID()}.tmp`;const h=await open(temp,"wx",0o600);try{await h.writeFile(JSON.stringify(value));await h.close();await rename(temp,path);}catch(e){await h.close().catch(()=>{});await rm(temp,{force:true});throw e;}}
