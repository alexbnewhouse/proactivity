# Dissertation Support Plugin

A minimal, ADHD-friendly Obsidian plugin that reduces activation cost for dissertation (and prospectus) progress with proactive nudges, structured AI planning, and a lightweight daily micro task system.

## Features

✅ **Proactive Reminders** – Gentle, configurable nudges at your interval (default 60m) that invite a tiny action instead of demanding a long session.

✅ **AI Planning (Dissertation & Prospectus)** – Generate structured, phase‑appropriate plans. If you supply deadlines + target word count, prompts include timeline pacing and daily/weekly word targets.

✅ **Delta (Update) Planning** – Request incremental refinements & next steps instead of regenerating everything. Preserves historical plans.

✅ **Inline Plan Actions** – Each generated plan file ends with buttons to seed micro tasks or trigger a delta update—no command palette required.

✅ **Micro Task Board** – Daily note embeds a compact board of actionable micro tasks (click to cycle todo → doing → done; drag to reorder). Seed directly from plan bullets.

✅ **Context Resume Card** – Remembers where you left off and injects a resume panel into today's daily note with fast-start actions.

✅ **Word Count Pacing** – Uses deadline & target word count to compute remaining days/weeks + suggested daily & weekly writing targets.

✅ **Low Friction** – Minimal UI surface: commands, inline buttons, subtle status bar pulse, and gentle notifications.

## Installation

1. Copy plugin files into your vault at `.obsidian/plugins/dissertation-support/`
2. Enable it in Settings → Community Plugins
3. Open Settings → Dissertation Support to configure basics

## Quick Start

1. Configure in Settings:
   - OpenAI API key
   - Dissertation topic (and/or prospectus topic)
   - Deadline(s) (optional but enables pacing)
   - Target word count (optional; improves pacing hints)
   - Plan output folder (optional path; auto-created if missing)
   - Reminder interval (minutes)
2. Run a plan command (dissertation or prospectus)
3. Open the generated plan → use inline buttons to seed tasks or later request a delta update
4. Open today's daily note to view/edit the micro task board and resume card
5. Let proactive reminders keep a gentle heartbeat of progress

## Commands

Planning:
- `Plan my dissertation with AI` – Generate a fresh dissertation plan
- `Plan my prospectus with AI` – Generate an early-phase prospectus plan
- `Update (delta) dissertation plan` – Incremental refinements based on last plan
- `Update (delta) prospectus plan` – Delta update for prospectus

Activation & Tasks:
- `Seed micro tasks from last plan` – Parse latest plan bullets into today's micro task board
- `Toggle proactive reminders` – Enable / disable reminders

Inline (inside plan files):
- Seed micro tasks button
- Delta update button

## Settings Overview

| Setting | Purpose |
|---------|---------|
| OpenAI API Key | Required for AI planning calls |
| Dissertation Topic | Core subject context for planning |
| Prospectus Topic | Optional earlier-phase topic (can reuse dissertation topic) |
| Dissertation Deadline | Enables pacing (days/weeks remaining) |
| Prospectus Deadline | Same for prospectus stage |
| Target Word Count | Drives suggested daily / weekly word targets |
| Plan Output Folder | Destination folder for generated plan files (auto-created) |
| Reminder Interval (minutes) | Frequency of proactive nudges |
| Last Plan Metadata | Internal (hash, timestamps) for delta context |

## Inline Plan Actions

Every new plan file appends an action block:

```
[ Seed micro tasks ]   [ Delta update plan ]
```

Use them to:
- Seed: Extract concise actionable bullet lines (hyphen / number / asterisk) into today's micro task board (skips duplicates & long lines)
- Delta: Generate a refinement / next steps plan—original plans remain preserved

## Delta Planning Flow
1. Load last plan content + metadata
2. Build a delta-focused prompt (avoid full repetition)
3. Generate refined plan
4. Save as a new timestamped file in the output folder
5. Update metadata for future iterations

## Micro Task Seeding Logic
The parser scans bullet-like lines, filters out headings, duplicates, and overly long entries, then creates micro tasks (state = todo) appended in order. You can manually edit or reorder them afterward.

## The Problem This Solves
Traditional productivity tooling expects initiation energy you often don't have. This plugin lowers the threshold: it brings context, small tasks, and gentle prompts directly into your daily note so you can restart quickly and iteratively refine direction without overwhelming resets.

## Privacy & Data
- API key stored locally only
- Requests go straight to OpenAI; no third-party relay
- Plans are plain Markdown in your vault
- Task + context + metadata state stored locally in plugin settings / daily notes

## Future Enhancements (Potential)
- Progress velocity metrics
- Section-level completion estimates
- Consolidated diff views between plan versions
- Effort tagging & prioritization heuristics
- AI summarization of daily progress

---

Built for ADHD minds who need proactive support—not another app you must remember to open.