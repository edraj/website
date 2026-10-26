---
tags: [skill-creator]
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

My dmart server is at $DMART (admin user `dmart`, password in $DMART_PASSWORD). Set up a small book catalog there: a space called `bookshop` with a `books` folder, and a schema so every book must have a title (text), author (text), year (whole number) and price (number). Add these four books:

- The Left Hand of Darkness, Ursula K. Le Guin, 1969, 18.50
- Never Let Me Go, Kazuo Ishiguro, 2005, 14.99
- The Overstory, Richard Powers, 2018, 32.00
- Klara and the Sun, Kazuo Ishiguro, 2021, 27.50

Then ask dmart which books came out after 2000 and cost under 30, newest first, and write that list to answer.md.
