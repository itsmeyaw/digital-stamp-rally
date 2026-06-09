# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`, filtering comments by `jq` and also fetching labels.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v` — `gh` does this automatically when run inside a clone.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Issue → PRD parent relationship

When an implementation issue is produced from a PRD (i.e. the issue is a vertical slice that implements part of the PRD), the implementation issue must be created as a sub-issue of the corresponding PRD issue.

**Workflow:**

1. Find the PRD's GitHub issue number: `gh issue list --label "ready-for-agent" --state open` (or search by title).
2. Create the implementation issue normally: `gh issue create --title "..." --body "..."`. Reference the PRD in the issue body's "Parent" section.
3. Immediately link it as a sub-issue of the PRD: `gh api repos/{owner}/{repo}/issues/{issue_number}/sub_issues --method POST --field parent_issue_id={prd_issue_number}` — or use the MCP tool `sub_issue_write` if available.

If the PRD does not yet have a corresponding GitHub issue, create one first (publish the PRD per the `to-prd` skill), then attach the implementation issues as its sub-issues.
