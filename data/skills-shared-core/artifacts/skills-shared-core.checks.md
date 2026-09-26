# Skills shared core checklist

- [x] Registry v1 strict schema validation
- [x] HTTPS fetch, TTL, ETag/Last-Modified, 304 revalidation, exact revision pinning, stale fallback warning
- [x] Allowlisted file digest and directory digest verification with path-component symlink checks
- [x] Exclusive temporary cache files, atomic rename, restrictive modes
- [x] Deterministic Unicode-normalized lexical ranking
- [x] 29 fixed natural-language ranking fixtures and irrelevant-query fixture
- [ ] Fetch CDN file content integration (caller supplies bytes to verified cache writer)
- [x] Full repository tests and typecheck
