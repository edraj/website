---
tags: [skill-creator]
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

My dmart server is at $DMART (admin user `dmart`, password in $DMART_PASSWORD); the space `helpdesk` already exists. I want support tickets there to follow a workflow: a new ticket is `open`; from `open` it can be started (`in_progress`) or rejected (`closed`, which needs a reason); from `in_progress` it can be resolved (`resolved`, which also needs a reason). `resolved` and `closed` are final. Set that up, file a ticket "Printer on floor 2 is jammed", start it, and resolve it with the reason "paper removed". Write the ticket's final state to answer.md.
