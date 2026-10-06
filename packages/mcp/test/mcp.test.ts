import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { createHandlers, createServer } from "../src/index.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Registry } from "../../core/src/index.js";

const body = new TextEncoder().encode("---\nname: demo\ndescription: secret-description\n---\n# Demo skill\n" + "x".repeat(24_500));
const ref = new TextEncoder().encode("# Reference\n" + "y".repeat(51_000));
const record = (path: string, bytes: Uint8Array) => ({path,size:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex")});
const skill = {id:"demo",name:"Demo Skill",version:"1.0.0",category:"Tools",description:"A short demo for testing",license:"MIT",attribution:[{name:"Test",url:"https://example.com",text:"Test attribution"}],entrypoint:"SKILL.md",files:[record("SKILL.md",body),record("references/guide.md",ref)],contentSha256:"0".repeat(64)};
const registry: Registry={schemaVersion:1,catalogVersion:"1.0.0",revision:"rev1",generatedAt:"2026-01-01T00:00:00Z",skills:[skill]};
const handlers=createHandlers({catalog:async()=>({registry,freshness:"fresh"}),fetchFile:async(_r,_i,p)=>p==="SKILL.md"?body:ref,cacheDir:"/tmp/grimoire-mcp-test"});

describe("MCP tool budgets and exposure",()=>{
 test("discovery schemas do not include catalog descriptions; search reveals them only on call",async()=>{
   const [clientTransport,serverTransport]=InMemoryTransport.createLinkedPair();
   const client=new Client({name:"test",version:"1"});
   await Promise.all([client.connect(clientTransport), (async()=>{await (await createServer(handlers)).connect(serverTransport);})()]);
   const initialized=JSON.stringify(client.getServerVersion());
   expect(initialized).not.toContain(skill.description);
   expect(JSON.stringify(await client.listTools())).not.toContain(skill.description);
   const searchResult=await client.callTool({name:"search_skills",arguments:{query:"demo"}});
   expect(searchResult.content).toContainEqual(expect.objectContaining({text:expect.stringContaining(skill.description)}));
   expect(Buffer.byteLength(JSON.stringify(searchResult))).toBeLessThanOrEqual(1200);
   await client.close();
 });
 test("responses stay within strict budgets and large entrypoints are rejected",async()=>{
   expect(Buffer.byteLength(await handlers.search_skills({query:"demo"}))).toBeLessThanOrEqual(1200);
   await expect(handlers.read_skill({id:"demo"})).rejects.toThrow("ceiling");
   expect(Buffer.byteLength(await handlers.fetch_skill_files({id:"demo",paths:["references/guide.md"]}))).toBeLessThanOrEqual(50_000);
   expect(Buffer.byteLength(await handlers.prepare_skill_files({id:"demo",paths:["references/guide.md"],dry_run:true}))).toBeLessThanOrEqual(1500);
   expect(Buffer.byteLength(await handlers.list_skills({explicit_request:true}))).toBeLessThanOrEqual(4000);
 });
 test("validates explicit list and blocks entrypoint fetch",async()=>{
   await expect(handlers.list_skills({explicit_request:false})).rejects.toThrow();
   const response=JSON.parse(await handlers.fetch_skill_files({id:"demo",paths:["SKILL.md","../escape"]}));
   expect(response.files).toHaveLength(0);
   expect(response.omitted).toHaveLength(2);
 });
});

describe("search_skills byte ceiling and ranking reliability",()=>{
 const manyRecord=(path:string,bytes:Uint8Array)=>({path,size:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex")});
 const manySkillBody=new TextEncoder().encode("---\nname: many\ndescription: many\n---\n# Many\n");
 const manyRegistry: Registry={schemaVersion:1,catalogVersion:"1.0.0",revision:"many-rev",generatedAt:"2026-01-01T00:00:00Z",skills:Array.from({length:10},(_,i)=>({
   id:`skill-review-quality-variant-${i}`,name:`Skill Review Quality Variant ${i}`,version:"1.0.0",
   category:"Code Quality and Testing Extended Category",
   description:`Reviews code for quality, correctness, and maintainability in pull requests. Variant ${i} covering linting, testing, and documentation practices for teams working on large codebases.`,
   license:"MIT",attribution:[{name:"Test",url:"https://example.com",text:"Test"}],entrypoint:"SKILL.md",
   files:[manyRecord("SKILL.md",manySkillBody)],contentSha256:"0".repeat(64),
 }))};
 const manyHandlers=createHandlers({catalog:async()=>({registry:manyRegistry,freshness:"fresh"}),fetchFile:async()=>manySkillBody});

 test("a realistic multi-word sentence that matches many skills returns bounded bytes without throwing",async()=>{
   const raw=await manyHandlers.search_skills({query:"I need help reviewing the quality and correctness of this pull request for my team",limit:5});
   expect(Buffer.byteLength(raw,"utf8")).toBeLessThanOrEqual(1200);
   const parsed=JSON.parse(raw);
   expect(Array.isArray(parsed.skills)).toBe(true);
   expect(typeof parsed.truncated).toBe("boolean");
   expect(parsed.truncated).toBe(true);
   expect(parsed.skills.length).toBeLessThan(5);
 });

 test("the byte ceiling is honored at the maximum permitted limit regardless of match count",async()=>{
   for(const limit of [1,2,3,4,5] as const){
     const raw=await manyHandlers.search_skills({query:"reviewing quality correctness pull request teams codebases",limit});
     expect(Buffer.byteLength(raw,"utf8")).toBeLessThanOrEqual(1200);
   }
 });

 test("a no-match query returns an empty result instead of throwing or guessing",async()=>{
   const raw=await manyHandlers.search_skills({query:"xyz nonexistent widget",limit:5});
   expect(JSON.parse(raw)).toEqual({skills:[],truncated:false});
 });
});
