---
description: "Cut an ESPForge release: bump version, sync lockfile, draft changelog, and prepare a release commit."
argument-hint: "New version number, e.g. 0.2.0"
agent: "agent"
---

You are preparing a new ESPForge release. The new version is: **$args**

Follow these steps in order:

## 1. Check current version

Read [espforge/config.yaml](../../espforge/config.yaml) and [espforge/package.json](../../espforge/package.json) to confirm the current version. Show it to the user before proceeding.

## 2. Gather recent commits

Run `git log --oneline <current-version-tag>..HEAD` (substitute the actual current version tag, e.g. `v0.1.5`). If no tag exists yet, use `git log --oneline -20`. Show the raw list of commits to the user.

## 3. Draft the CHANGELOG entry

From the commit list, draft a concise bullet-point entry for [espforge/CHANGELOG.md](../../espforge/CHANGELOG.md). Use this format at the top of the file:

```
## $args

- <change one>
- <change two>
```

Group or omit noise commits (merge commits, dependency bumps, typo fixes). Present the draft to the user and ask for approval or edits before writing the file.

## 4. Apply all version bumps

Once the changelog draft is approved, make the following changes atomically:

- In [espforge/config.yaml](../../espforge/config.yaml): set `version: "$args"`
- In [espforge/package.json](../../espforge/package.json): set `"version": "$args"`
- In [espforge/CHANGELOG.md](../../espforge/CHANGELOG.md): prepend the approved changelog entry

Then run in a terminal from the `espforge/` directory:

```
npm install --package-lock-only
```

This syncs `package-lock.json` without installing anything.

## 5. Confirm files changed

Show the user the four files that must be included in the release commit:

1. `espforge/config.yaml`
2. `espforge/package.json`
3. `espforge/package-lock.json`
4. `espforge/CHANGELOG.md`

Ask the user to confirm before proceeding to step 6.

## 6. Commit

Stage only those four files and create the commit:

```
git add espforge/config.yaml espforge/package.json espforge/package-lock.json espforge/CHANGELOG.md
git commit -m "chore: release v$args"
```

Do NOT push. Remind the user to push to `main` when ready -- the `docker.yml` workflow will auto-create the GitHub Release and build multi-arch Docker images.
