---
tags: [skill-creator]
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

My dmart server is at $DMART (admin user `dmart`, password in $DMART_PASSWORD). The `shop` space has our products under `/products` (each has a category, a price, an in_stock flag and tags). Create a user `auditor` with the password `Audit-pass-2026` who can read those products and nothing else, and can't change anything. Then, signed in as the auditor, find the products that are in stock, priced from 10 to 50 inclusive and not tagged `discontinued`, and give me how many there are and their average price, per category. Have dmart do the counting. Write the result to answer.md.
