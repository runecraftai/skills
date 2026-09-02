---
name: git-worktree
description: >
  Use git worktrees for parallel feature branches without stashing or cloning.
  Creates isolated working directories from a single local clone.
  EN triggers: /worktree, git worktree, parallel branches, multiple features, isolate work.
  PT triggers: /worktree, branches paralelas, trabalho isolado, múltiplas features.
  Do NOT use for: simple single-branch work, fixing merge conflicts, or repos where disk space is extremely constrained.
license: CC-BY-4.0
---

# git-worktree

Use git worktrees to work on multiple branches simultaneously from a single local clone — no stashing, no cloning, no context-switching friction. Each worktree is an independent working directory on its own branch, sharing the same `.git` repository.

```
DECIDE BRANCH → ADD WORKTREE → WORK INDEPENDENTLY → MERGE → CLEAN UP
```

---

## Overview

A git worktree is an additional working directory attached to the same local repository. Instead of cloning the repo again or stashing unfinished work to switch branches, you create a worktree — a separate directory that checks out a different branch — and work there independently.

Each worktree shares the same object database (`.git`), so commits made in one worktree are immediately visible to all others. There is no duplication of git history, only a sparse checkout of the working tree for each branch.

**Benefits:**
- No stashing — keep your current branch exactly as-is while starting something else
- No re-cloning — disk cost per worktree is only the checked-out files, not the full history
- True parallelism — run tests, builds, and edits in different branches side by side
- Hotfix safety — ship a critical fix from a clean `main` checkout while your feature branch sits untouched

---

## When to Use

| Scenario | Why worktrees help |
|----------|-------------------|
| Parallel epics or features | Each epic gets its own directory; no branch-switching or stashing |
| Hotfix while on a feature branch | Checkout `main` in a new worktree, fix, push, and return to your feature — nothing stashed |
| Reviewing or testing another branch | Checkout a PR branch in a worktree, build and test without touching your current work |
| CI isolation | Run a long build or test suite in one worktree while continuing development in another |
| Comparing branches | Have two branches checked out side by side for diffing or manual verification |

**Do not use when:**
- You're working on a single branch — standard git workflow is simpler
- You need to fix merge conflicts — worktrees don't help with conflict resolution
- Disk space is extremely constrained — each worktree costs the checkout size of that branch

---

## Process

### Step 1: Create a Worktree

From your main repository directory, use `git worktree add`:

```bash
# Create a worktree from the current HEAD (starts on same commit)
git worktree add ../path-to-worktree

# Create a worktree on an existing branch
git worktree add ../path-to-worktree existing-branch

# Create a worktree with a new branch
git worktree add -b new-branch-name ../path-to-worktree base-branch
```

**Convention:** Place worktrees as siblings to your main repo directory (e.g., `../project-hotfix`, `../project-epic-2`). Avoid nesting worktrees inside other worktrees.

### Step 2: List Worktrees

```bash
git worktree list
```

Output shows the path, HEAD commit, and branch for every worktree. The main worktree is marked with `[main]` or `[bare]`.

### Step 3: Work Independently

Navigate to the new directory and work as usual:

```bash
cd ../path-to-worktree
# Edit, stage, commit, push — all commands work the same
git add .
git commit -m "feat(epic-2): start new feature"
git push origin new-branch-name
```

The main worktree is unaffected. You can run builds, tests, or linters in each worktree independently.

### Step 4: Clean Up

When the branch is merged or no longer needed:

```bash
# Remove the worktree and its directory
git worktree remove ../path-to-worktree

# Prune stale worktree references (if a worktree directory was deleted manually)
git worktree prune
```

`git worktree remove` fails if the branch has unmerged changes — this is a safety check. Force with `--force` only if you're certain.

---

## Safety Rules

- **Never nest worktrees.** A worktree must not be created inside another worktree's directory. Nesting corrupts the relationship between `.git` files.
- **One worktree per branch.** Git refuses to check out the same branch in two worktrees simultaneously. If you need a second checkout of the same branch, create a new branch from it.
- **Shared `.git` means shared state.** Commits, fetches, and branch updates in one worktree are visible in all others. If you delete a branch in worktree A, it's gone everywhere.
- **Clean up stale worktrees.** If you delete a worktree directory manually (without `git worktree remove`), run `git worktree prune` to remove the stale reference.
- **Prune periodically.** After merging branches, run `git worktree prune` to keep the worktree list clean.
- **Bare repositories.** Worktrees also work from bare repos, but the commands differ. This skill focuses on standard (non-bare) use.

---

## Common Patterns

### Parallel Epics

Start multiple epics from `main`, each in its own directory:

```bash
git worktree add -b epic-payments ../epic-payments main
git worktree add -b epic-notifications ../epic-notifications main
git worktree add -b epic-search ../epic-search main
```

Work on each independently. When one is ready, push and open a PR. The others continue unaffected.

### Hotfix from Main

You're deep in a feature branch with uncommitted changes. A critical bug needs an immediate fix on `main`:

```bash
# Create hotfix worktree from main — your feature branch stays untouched
git worktree add -b hotfix/critical-bug ../hotfix main

# Navigate, fix, commit, push
cd ../hotfix
# ... make the fix ...
git add .
git commit -m "fix(billing): prevent double charge on retry"
git push origin hotfix/critical-bug

# Return to your feature — nothing was stashed, nothing was interrupted
cd ../project
```

### Review a PR Locally

Checkout and test a PR branch without disrupting your work:

```bash
git worktree add ../review-pr-billing main
cd ../review-pr-billing
git fetch origin pull/42/head:pr-42
git checkout pr-42
# Build, test, review — your main working directory is untouched
```

### CI / Long-Running Tasks

Run a full test suite or build in an isolated worktree while you keep coding:

```bash
git worktree add ../ci-build main
cd ../ci-build
bun test  # runs while you continue editing in the main directory
```

---

## Merge Strategy

After worktrees finish their work:

1. **Merge in dependency order.** If epic-1 depends on epic-2, merge epic-2 first.
2. **Resolve conflicts in the main worktree.** Conflicts must be resolved before the branch can be merged. Standard merging applies — worktrees don't change this.
3. **Push and open PRs** from each worktree as usual.
4. **Clean up** after merge:

```bash
# After the branch is merged on the remote
git branch -d branch-name       # delete local branch (from any worktree)
git worktree remove ../path     # remove the worktree directory
```

5. **Prune periodically** to remove stale worktree references:

```bash
git worktree prune
```

---

## Verification

After setting up a worktree:

- [ ] `git worktree list` shows the new worktree with the correct branch and path
- [ ] Navigating to the worktree directory shows the expected branch's files
- [ ] `cd` into the worktree and run `git status` — clean state on the target branch
- [ ] Commits made in the worktree appear in `git log` from the main directory
- [ ] The main worktree is unaffected — your original work is exactly as you left it
- [ ] After merging, the branch is deleted and `git worktree remove` cleans up the directory
- [ ] `git worktree prune` confirms no stale references remain

---

## See Also

- [Git Worktree Documentation](https://git-scm.com/docs/git-worktree)
- [Git Worktree Tutorial (Atlassian)](https://www.atlassian.com/git/tutorials/git-worktree)
- `git-worktree` man page: `man git-worktree` or `git worktree --help`
- For learning patterns from your project's git history, see the `git-commit-learning` spell
