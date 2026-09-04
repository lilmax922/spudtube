# Issue tracker: GitHub Issues

Issues and specs for this repo live as GitHub Issues on `lilmax922/spudtube`. Operate them with the `gh-axi` CLI (`gh-axi issue ...`), never by hand-editing local files.

## Conventions

- One GitHub issue per feature spec or ticket. The spec is the issue body, written with the to-spec template.
- Triage state is a GitHub label from the five-role vocabulary (see `triage-labels.md`). A spec is done when it carries `ready-for-agent`.
- Comments and conversation history live in the issue thread (`gh-axi issue comment <number>`), not in local files.
- Reference issues by number (e.g. `#42`) in commits, PRs, and conversation.

## When a skill says "publish to the issue tracker"

Create a GitHub issue (`gh-axi issue create --title ... --body-file ...`) and apply the triage label the skill asks for. Do not create local files.

## When a skill says "fetch the relevant ticket"

Read the GitHub issue (`gh-axi issue view <number>`). The user will normally pass the issue number directly.

## History

`.scratch/` holds frozen pre-GitHub history (specs and tickets from before the migration). It is read-only reference; never add new files there.
