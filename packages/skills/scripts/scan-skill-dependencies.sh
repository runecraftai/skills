#!/usr/bin/env bash
set -euo pipefail
root="packages/skills/skills"
mapfile -d '' manifests < <(find "$root" -type f \( -name package.json -o -name package-lock.json -o -name npm-shrinkwrap.json -o -name yarn.lock -o -name pnpm-lock.yaml -o -name bun.lock -o -name bun.lockb -o -name Cargo.toml -o -name Cargo.lock -o -name go.mod -o -name go.sum -o -name Pipfile -o -name Pipfile.lock -o -name pyproject.toml -o -name poetry.lock -o -name uv.lock -o -name requirements.txt -o -name Gemfile -o -name Gemfile.lock -o -name composer.json -o -name composer.lock -o -name pom.xml -o -name build.gradle -o -name build.gradle.kts \) -print0)
if ((${#manifests[@]} == 0)); then
  echo "No dependency manifests or lockfiles in skill payloads."
  exit 0
fi
for manifest in "${manifests[@]}"; do
  echo "Scanning skill payload dependency file: $manifest"
  osv-scanner scan source --lockfile "$manifest"
done
