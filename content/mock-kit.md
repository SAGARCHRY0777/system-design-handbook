---
title: The self-mock kit
slug: mock-kit
module: reference
order: 75
status: live
level: use this, not another page
summary: Run a real 45-minute round alone and score it — the rubric, the recording protocol, the review checklist, and what each score means for what to fix.
---

# The self-mock kit

> **The reading is finished. This page is the one you use.**
>
> Every other page here is input. This one produces **output**: a number, a
> recording, and a specific thing to fix. Without that loop, more reading
> changes nothing.

---

## 1 · Why score at all

**Because "that felt okay" is not information.** After an unscored practice
attempt you know only whether you enjoyed it. After a scored one you know that
you never stated a trade-off's cost, or that you were still scoping at minute
22 — and those are fixable.

> **A number you gave yourself is worth more than a feeling**, even when the
> number is rough. It is comparable across attempts, which a feeling is not.

---

## 2 · Setup — 3 minutes

```
[ ] Pick a prompt you have NOT read the write-up for
        -> question-bank.html, or pick blind from the eight shapes
[ ] Timer: 45 minutes. Visible. Do NOT pause it.
[ ] Stand at a whiteboard, or a blank digital canvas. NOT an editor.
[ ] Start a screen + audio recording. Phone camera propped up works.
[ ] Close every tab. No handbook, no search, no notes.
[ ] Speak out loud the entire time, to an empty room.
```

**The recording is non-negotiable and it is the part people skip.** You cannot
hear your own filler, hedging, or silence while producing it. You can hear all
three on playback, immediately.

**No lookups.** An attempt with a tab open measures your reading speed. The
interview does not have that tab.

---

## 3 · The scorecard

Score each 0–3 immediately after, before watching the recording.
**Maximum 24.**

| # | Dimension | 0 | 1 | 2 | 3 |
|---|---|---|---|---|---|
| 1 | **Scoping** | Started designing immediately | Asked one or two questions | Asked about scale and core actions | Wrote in/out on the board and confirmed it |
| 2 | **Estimation** | Skipped it | Did maths that changed nothing | One number changed a decision | Numbers drove ≥2 decisions, stated aloud |
| 3 | **Structure** | Interviewer would have had to steer | Drifted, recovered | Followed the phases loosely | Ran the clock; announced each transition |
| 4 | **Justification** | Named technologies, no reasons | Some choices justified | Most choices tied to a requirement | Every major choice traced to a stated requirement |
| 5 | **Depth** | Stayed at box level | One component at level 2 | One at level 3 | Level 3 on two, and offered the interviewer a choice |
| 6 | **Trade-offs** | None stated | Named without resolving | Resolved with a reason | **Volunteered the cost of your own choice, unprompted** |
| 7 | **Failure** | Never reached it | Mentioned redundancy | Walked the diagram killing boxes | Also named the assumption the design leans on hardest |
| 8 | **Communication** | Board unreadable; long silences | Followable with effort | Clear, mostly narrated | Narrated throughout; board readable at minute 45 |

**Add it up.**

| Score | Where you are | Do next |
|---|---|---|
| **0–8** | Not yet a round | Drill the framework alone. Re-run the same prompt tomorrow |
| **9–14** | Recognisable, thin | You are reciting. Attack **depth (5)** and **justification (4)** |
| **15–19** | Would pass some loops | Push **trade-offs (6)** and **failure (7)** — the two most-skipped |
| **20–24** | Above the bar | New shapes, not repeat prompts. Book a real mock |

> **Row 6 at a 3 is the single strongest predictor.** Volunteering what your own
> choice costs — before anyone asks — is the behaviour that separates hire from
> strong hire, and almost nobody does it unprompted.

---

## 4 · Watch the recording — 20 minutes

**This is the highest-value part of the whole exercise and it is uncomfortable.**
Watch at 1.5×, with a pen.

```
[ ] Count the silences longer than 10 seconds.        ______
[ ] Count "um", "like", "basically", "sort of".        ______
[ ] Timestamp when you first drew a box.               ______   (target: ~13 min)
[ ] Timestamp when you started the deep dive.          ______   (target: ~25 min)
[ ] Timestamp when you first mentioned failure.        ______   (target: ~40 min)
[ ] Did you ever say a number and then use it?         Y / N
[ ] Did you ever say "which costs me..."?              Y / N
[ ] Is the board readable in the final frame?          Y / N
[ ] Count choices with no "because".                   ______
```

> **The three timestamps are the most diagnostic thing on this page.** They are
> objective, they take seconds to collect, and they tell you exactly which phase
> is eating your clock. Nearly every failed round is visible in them.

---

## 5 · Symptom → fix

| What you observe | Actual problem | Fix |
|---|---|---|
| First box after minute 20 | Over-scoping | Hard-stop scoping at 5 minutes, even mid-question |
| Never reached failure | Deep dive ran long | Watch the clock at 40; stop adding, start killing boxes |
| Many silences | Thinking without narrating | Say the uncertainty out loud — it is scored |
| Choices with no "because" | Reciting an architecture | For each box ask "what requirement demanded this?" |
| Only level 2 depth | Breadth reflex | Pick one component; force three levels before moving |
| No trade-off costs | The commonest gap | Add "which costs me…" to every decision, mechanically, until it is habit |
| Unreadable board | No layout plan | Scope box top-left, flow left-to-right, leave the lower third empty |
| Ran out of things at minute 30 | Scoped too small | Add a requirement yourself: "what if this were multi-region?" |

---

## 6 · A four-week schedule that produces reps

**Twelve attempts. Not twelve read pages.**

| Week | Attempts | Focus |
|---|---|---|
| **1** | 3 | Framework and clock. Repeat the same prompt on days 1 and 3 — the improvement is the point |
| **2** | 3 | New shapes. Target depth: three levels on one component |
| **3** | 3 | Target trade-offs and failure. **Book one real mock this week** |
| **4** | 3 | Full dress rehearsal. No new material |

**Rules that make it work:**

```
1. Never do the same prompt twice in a week -- you are testing recall,
   not memory of yesterday.
2. Score EVERY attempt. An unscored attempt is practice you cannot compare.
3. Read the write-up only AFTER attempting, and mark only where you
   DIFFERED. Places you matched teach nothing.
4. One fix per attempt. Chasing all eight rows at once fixes none.
```

---

## 7 · The twelve prompts

**Do not read the write-up first.** Grouped so consecutive attempts exercise
different shapes.

| # | Prompt | Shape | Write-up |
|---|---|---|---|
| 1 | URL shortener | Read-heavy key lookup | [design](design-url-shortener.html) |
| 2 | Rate limiter | Algorithms, distributed counting | [block](rate-limiting.html) |
| 3 | News feed | Fan-out, hot keys | [design](design-news-feed.html) |
| 4 | Chat | Stateful connections | [design](design-chat.html) |
| 5 | Ticket booking | Strong consistency | [design](design-ticketing.html) |
| 6 | Web crawler | Queues, politeness, dedup | [design](design-web-crawler.html) |
| 7 | Video platform | Pipelines, bandwidth economics | [design](design-video-streaming.html) |
| 8 | Ride-sharing | Geospatial | [design](design-ride-sharing.html) |
| 9 | E-commerce | Breadth + inventory correctness | [design](design-ecommerce.html) |
| 10 | Key-value store | Distributed systems, undisguised | [design](design-key-value-store.html) |
| 11 | Logging & monitoring | Write-heavy, cardinality | [design](design-logging-monitoring.html) |
| 12 | Collaborative editor | Conflict resolution | [design](design-collaborative-editor.html) |

**If you only manage six: 1, 3, 5, 8, 9, 10.** They cover six of the eight
shapes.

---

## 8 · The tracker

One row per attempt. A spreadsheet is fine; the columns are the point.

```
date | prompt | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | total | first box | deep dive | the ONE fix
-----|--------|---|---|---|---|---|---|---|---|-------|-----------|-----------|-------------
     |        |   |   |   |   |   |   |   |   |       |           |           |
```

> **Sort by column, not by total.** A flat total hides everything. Seeing that
> row 6 has been 0 or 1 for six consecutive attempts tells you precisely what to
> work on — and that pattern is invisible in an average.

---

## 9 · When to stop practising

You are ready when, across three consecutive attempts on **unseen** prompts:

```
[ ] total >= 18 every time
[ ] first box drawn before minute 15, every time
[ ] you reached failure analysis, every time
[ ] row 6 (trade-off costs) scored >= 2, every time
[ ] fewer than three silences over 10 seconds
```

**Consistency matters more than a peak.** One good attempt is luck; three in a
row on prompts you had not seen is a skill.

> **And the thing this page cannot give you: a real person interrupting.**
> Self-mocks train structure, depth and narration. They cannot train being
> pushed back on, being asked something you did not prepare, or being wrong in
> front of someone. **Book one real mock.** Everything here makes that mock more
> useful; none of it replaces it.
