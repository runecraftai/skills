# Skills static release pipeline checklist

Scope: design report sections 4, 5, and 7; slice 2 only. Immutable catalog artifacts are version-tagged; the mutable stable pointer identifies the exact version and registry digest.

- [x] Release workflow accepts only `catalog-vX.Y.Z` tags and checks tag/version agreement. **Repository tag protection must be configured by an owner.**
- [x] Skill-forge validation is a required release job.
- [x] Strict registry builder reproduces the checked-in registry and allowlisted file bytes before packaging.
- [x] Semgrep, Gitleaks, and OSV-Scanner are gates before publish; OSV input discovery is limited to skill payloads.
- [x] Build packages the registry, all per-file blobs, SHA-256 manifest, and `stable.json` with immutable tag URL.
- [x] Registry and content snapshot are attested and verified before GitHub release publication.
- [x] Release workflow checks CDN registry and every referenced file byte-for-byte.
- [x] Mutable `stable.json` is published on `catalog-stable` and served through jsDelivr with ETag/Last-Modified revalidation. Documented deviation: jsDelivr controls its revalidation TTL; it is not guaranteed to be exactly 900 seconds.
- [x] Published-byte equality is an enforced release CI gate; actual CDN verification runs when a protected catalog tag is released.
- [x] New release-workflow GitHub Actions are pinned to full commit SHAs and job permissions are scoped.
