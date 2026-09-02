---
title: Observability
slug: observability
module: distributed
order: 43
status: live
level: advanced — cheap marks, rarely claimed
summary: Metrics, logs and traces; why percentiles beat averages and cannot be averaged; RED and USE; SLOs and error budgets; and what to actually alert on.
---

# Observability

> **Almost nobody brings this up unprompted, which makes it cheap signal.** Two
> sentences on what you would measure and alert on, at the end of a design, marks
> you as someone who has operated a system rather than only drawn one.

---

## 1 · The three signals

| Signal | Is | Cost | Answers |
|---|---|---|---|
| **Metrics** | Numbers over time, aggregated | Cheap, bounded | *Is something wrong?* |
| **Logs** | Discrete events with detail | Expensive at volume | *What exactly happened?* |
| **Traces** | One request across services | Sampled | *Where did the time go?* |

**They form a workflow, and describing it that way is better than listing
them:** a metric alert tells you something is wrong, a trace tells you which
service, and logs from that service tell you why.

**Structured logs, not prose.** `{"event":"charge_failed","user_id":42,
"provider":"stripe","code":"card_declined","latency_ms":230}` is queryable;
`"Failed to charge user 42"` is not. At scale, logs you cannot aggregate are
logs you cannot use.

---

## 2 · Percentiles, and the mistake

**Averages hide everything that matters.**

```
1,000 requests: 990 at 10ms, 10 at 5,000ms

  average = 59ms          "looks fine"
  p99     = 5,000ms       1 in 100 users waits 5 seconds
```

| Percentile | Means |
|---|---|
| p50 | The typical experience |
| p95 | Where degradation first shows |
| **p99** | **The number to design against** |
| p99.9 | Where your worst-hit customers live |

> **Two things worth saying about p99, and the second is the one that impresses:**
>
> 1. **A p99 is not one unlucky user.** A page making 100 backend calls hits its
>    p99 on nearly every page load — the tail becomes the median experience.
> 2. **You cannot average percentiles.** The p99 of two servers is not the mean
>    of their p99s; you need the merged distribution. This is why percentiles
>    must be computed from histograms rather than pre-aggregated numbers, and
>    naming it shows you have actually built dashboards.

---

## 3 · RED and USE

Two checklists that stop you inventing metrics ad hoc.

**RED — for services (request-driven):**

| | |
|---|---|
| **R**ate | Requests per second |
| **E**rrors | Failed requests per second |
| **D**uration | Latency distribution |

**USE — for resources (CPU, disk, pools):**

| | |
|---|---|
| **U**tilisation | % of time busy |
| **S**aturation | Queue depth — work waiting |
| **E**rrors | Error count |

> **Saturation is the leading indicator, and it is the one people omit.**
> Utilisation at 80% tells you today; a queue that is growing tells you about
> ten minutes from now. Connection-pool wait time, thread-pool queue depth and
> consumer lag are the metrics that give you warning rather than confirmation.

---

## 4 · Distributed tracing

A trace ID generated at the edge and propagated through every call.

```
trace_id: 7b3f...            [=========== 340ms ===========]
  api-gateway                [==]                             12ms
  user-service                 [====]                         45ms
    postgres:SELECT              [==]                          18ms
  feed-service                       [==================]     240ms
    redis:MGET                        [=]                        8ms
    ranking-service                     [===============]     210ms  <-- here
  render                                                [==]   30ms
```

**Propagation is the whole trick**: every service passes the trace context
(W3C `traceparent`) to everything it calls. One service that drops it breaks the
trace from there down.

**Sample, don't record everything** — 1% of traces plus 100% of errors and slow
requests is the standard approach. Head-based sampling decides at the start and
is cheap; tail-based decides after seeing the result and always keeps the
interesting ones, at the cost of buffering.

**Put the trace ID in every log line and return it in error responses.** A user
reports a problem, quotes the ID, and you have the whole request. It is a small
thing that is obviously born of experience.

---

## 5 · SLIs, SLOs and error budgets

| Term | Is |
|---|---|
| **SLI** | The measurement — "% of requests under 200ms" |
| **SLO** | The internal target — "99.9% under 200ms over 30 days" |
| **SLA** | The contractual promise, with penalties — always looser than the SLO |

**The error budget is the useful idea:**

```
SLO 99.9% over 30 days  ->  budget = 0.1% = ~43 minutes of failure

Budget remaining  -> ship features, take risks
Budget exhausted  -> freeze features, spend the time on reliability
```

> **This converts "how reliable should it be?" from an argument into a
> measurement.** 100% is the wrong target — it is unachievable and the last
> nine costs more than it returns. The budget makes the trade explicit and gives
> both sides an agreed rule. Mentioning error budgets in a design round is
> unusual and lands well.

**Set the SLO from user impact, not from what is easy to hit.** And measure it
where the user is — a backend p99 of 50 ms means little if the edge adds 400.

---

## 6 · What to alert on

**Alert on symptoms, not causes.** High CPU is not a problem; users getting
errors is. Cause-based alerts produce noise, and noise produces ignored pages.

| Alert on | Not on |
|---|---|
| Error rate above SLO burn rate | CPU above 80% |
| p99 latency past target | A single server unhealthy |
| Queue depth growing steadily | A single failed request |
| Consumer lag rising | Memory at 70% |
| Error budget burning fast | Disk at 60% |

**Multi-window burn-rate alerting** is the mature version: page when the budget
is being consumed fast enough to matter (14× normal over an hour), ticket when
it is slow-burning (2× over six hours). It catches real incidents quickly
without paging for a blip.

> **Every alert should be actionable and have a runbook.** An alert nobody can
> act on gets muted, and a muted alert is worse than none because it creates the
> illusion of coverage. If your honest answer to "what do I do about this page?"
> is "watch it", it should be a dashboard, not a page.

---

## 7 · What to say in the round

> *"RED metrics on every service — rate, errors, duration as a histogram so I can
> compute real percentiles rather than averaging p99s, which does not work.
> Tracing with a trace ID minted at the edge and propagated, sampled at 1% plus
> everything that errors or runs slow, and the trace ID in every log line and
> error response so a user report is directly debuggable.*
>
> *For this design the leading indicators are cache hit rate, consumer lag on the
> fan-out queue, and replication lag — those degrade before anything user-visible
> does. I'd set an SLO of 99.9% of timeline reads under 200 ms, alert on
> error-budget burn rate rather than raw thresholds, and page on symptoms only."*

**Thirty seconds, and it covers the three signals, sampling, the leading
indicators specific to this design, and alerting philosophy.**

---

## 8 · Interview questions

| Question | What to say |
|---|---|
| ⭐ "What would you monitor?" | RED per service — rate, errors, duration as a histogram — plus the leading indicators for this design specifically: cache hit rate, consumer lag, replication lag. Those move before users notice. |
| ⭐ "Why p99 rather than average?" | Averages hide the tail. 990 fast requests and 10 five-second ones average to something that looks healthy. And a page making 100 backend calls hits its p99 almost every load, so the tail *is* the typical experience. |
| "Can you average p99s across servers?" | No — percentiles are not linear. You need the merged distribution, which is why latency is stored as histograms and the quantile is computed at query time. |
| ⭐ "How do you debug a slow request in a 12-service call chain?" | Distributed tracing: a trace ID minted at the edge and propagated through every hop, so the waterfall shows which span owns the time. It only works if every service propagates the context — one that drops it blinds everything downstream. |
| "What is an error budget?" | The inverse of the SLO — at 99.9% you have about 43 minutes a month. While budget remains you ship; when it is gone you stop and fix reliability. It turns a reliability argument into an agreed measurement. |
| ⭐ "What do you page on?" | Symptoms, not causes — user-visible error rate and latency, and error-budget burn rate rather than fixed thresholds. High CPU is not an incident. Every page needs an action and a runbook, or it gets muted, and a muted alert is worse than no alert. |
| "Logs are too expensive at this volume." | Sample the successful path, keep all errors, and make logs structured so aggregation replaces retrieval. Most of what people use logs for is really a metric or a trace. |

---

## Stop condition

You know this block when you can:

1. describe the metrics → traces → logs debugging workflow,
2. explain why p99 matters and why percentiles cannot be averaged,
3. recite RED and USE and name saturation as the leading indicator,
4. explain trace propagation and sampling strategy, and
5. define an error budget and say what you page on.
