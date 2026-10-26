# The `dmart` agent skill

An [Agent Skill](https://agentskills.io) that teaches an AI agent to work with a dmart
instance: sign-in, spaces, folders, schemas, entries, tickets, permissions and the search
syntax, through the REST API, the MCP tools or `dmart cli`.

- `SKILL.md`: the hand-written part, with the rules and the recipes.
- The `references/` the skill ships with are this site's docs pages, written by
  `app/scripts/build-skill.mjs` from the same export the site is built from. The skill and
  the site cannot disagree. The build fails if SKILL.md and the docs navigation name
  different pages.
- `test-recipes.sh`: runs every `bash` block of SKILL.md against a throwaway dmart and checks
  what each one did. CI runs it on every change, against the newest dmart release.
- `evals/`: tasks for comparing an agent with and without the skill. Each case has a prompt,
  the expected outcome and one grader per check, in the layout `claude plugin eval` reads.
  The prompts expect `$DMART` and `$DMART_PASSWORD` for a fresh dmart, seeded as each
  case's prompt describes.

Published with the site: `https://dmart.cc/skill/dmart.zip` (the folder), the unpacked files under
`https://dmart.cc/skill/dmart/`, and `https://dmart.cc/llms.txt`.
