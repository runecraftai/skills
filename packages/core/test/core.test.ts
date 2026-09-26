import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fetchRegistry, rankSkills, validateRegistry, type Registry } from "../src/index.js";

const registry = JSON.parse(await readFile(new URL("../../skills/catalog/v1/registry.json", import.meta.url), "utf8")) as Registry;
const fixtures:[string,string][]=[
 ["design a REST API contract","api-and-interface-design"],["test my website in a browser","browser-testing-with-devtools"],["automate build and deploy pipelines","ci-cd-and-automation"],["review code quality","code-review-and-quality"],["simplify complicated code","code-simplification"],["constraint driven development","constraint-driven-development"],["manage context for AI agents","context-engineering"],["debug an error and recover","debugging-and-error-recovery"],["migrate deprecated APIs","deprecation-and-migration"],["write technical documentation and ADRs","documentation-and-adrs"],["build accessible responsive frontend UI","frontend-ui-engineering"],["learn from git commits","git-commit-learning"],["create a git worktree","git-worktree"],["discover ideas","idea-discovery"],["refine an idea","idea-refine"],["implement features incrementally","incremental-implementation"],["conduct an interview","interview-me"],["audit my LinkedIn profile","linkedin-audit"],["manage project memory","memory-management"],["add observability and instrumentation","observability-and-instrumentation"],["optimize application performance","performance-optimization"],["security and hardening","security-and-hardening"],["ship and launch a product","shipping-and-launch"],["skill forge","skill-forge"],["develop from source","source-driven-development"],["spec driven","spec-driven"],["use a spec loop","spec-loop"],["task cutting","task-cutting"],["practice test driven development","test-driven-development"]
];
describe("shared core",()=>{
 test("validates generated registry and rejects malformed schema",()=>{expect(()=>validateRegistry(registry)).not.toThrow();expect(()=>validateRegistry({...registry, extra:true})).toThrow();});
 test.each(fixtures)("ranks %s first",(query,id)=>expect(rankSkills(query,registry.skills)[0]?.skill.id).toBe(id));
 test("irrelevant query has no matches",()=>expect(rankSkills("quantum underwater basket weaving",registry.skills)).toEqual([]));
 test("revalidates and serves warm registry stale on network failure",async()=>{const dir=await mkdtemp(join(tmpdir(),"grimoire-core-"));try{const cache=join(dir,"registry.json"),url="https://example.invalid/registry.json";await writeFile(cache,JSON.stringify({registry,checkedAt:0}));const result=await fetchRegistry({url,cacheFile:cache,now:1_000_000,ttlMs:1,fetcher:async()=>{throw Error("offline")}});expect(result.freshness).toBe("stale");expect(result.warning).toContain("stale");}finally{await rm(dir,{recursive:true,force:true});}});
});
