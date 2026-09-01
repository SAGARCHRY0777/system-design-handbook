---
title: Estimation
slug: estimation
module: method
order: 12
status: live
level: foundational
summary: Back-of-envelope maths that finishes in three minutes: the numbers to memorise, the four shortcuts, and how to turn an estimate into an architectural decision.
---

# Estimation

> **The point is not the number. The point is the decision the number forces.**
> An estimate that does not change anything about the design was three wasted
> minutes.

---

## 1 · The three that matter

Almost every round needs these and nothing else:

| Estimate | Decides |
|---|---|
| **Write QPS** | Does this fit on one database, or must it shard? |
| **Read QPS (peak)** | How much cache, how many replicas, how many app servers? |
| **Storage per year** | One machine, or a fleet? Hot/cold tiering? |

Occasionally a fourth: **bandwidth**, when the payload is media rather than
text. A 5 MB photo changes the answer in a way a 300-byte tweet does not.

---

## 2 · Numbers to memorise

Eleven numbers. They are enough.

### Time

| Operation | Latency | In human terms |
|---|---|---|
| L1 cache reference | 1 ns | — |
| Main memory reference | 100 ns | 100× L1 |
| SSD random read | 100 µs | 1,000× memory |
| Round trip within a datacentre | 500 µs | — |
| Disk seek (spinning) | 10 ms | 100× SSD |
| Round trip US ↔ Europe | 150 ms | Physics; you cannot cache around it |

**The two ratios worth internalising:** memory is ~1,000× faster than SSD, and
cross-continent is ~300× a datacentre round trip. The first is why you cache.
The second is why you put a CDN in front and why multi-region writes are
genuinely hard.

### Size

| Item | Size |
|---|---|
| A character (ASCII) | 1 byte |
| A UUID | 16 bytes |
| A typical database row | ~1 KB |
| A tweet, with metadata | ~1 KB |
| A compressed photo | ~1 MB |
| A minute of 1080p video | ~50 MB |

### Throughput per commodity machine

| Component | Rough capacity |
|---|---|
| Web/app server | 10k–50k QPS (simple requests) |
| Cache node (Redis/Memcached) | ~100k QPS |
| SQL database | ~5k–10k writes/s per primary |
| Message queue (Kafka broker) | ~100k messages/s |
| Server RAM | 64–256 GB |
| Server SSD | 1–10 TB |

> **The 5k-writes-per-primary figure is the one that earns its keep.** It is why
> "40 writes a second" means one database and "40,000 writes a second" means
> sharding — and being able to say that instantly is the difference between a
> justified decision and a guess.

---

## 3 · Four shortcuts

### Seconds in a day: use 100,000

The real number is 86,400. Using 100,000 makes every division trivial and is
within 16% — far inside the precision anyone cares about.

```
1 billion events/day  ->  1e9 / 1e5  =  10,000 QPS
100 million/day       ->  1e8 / 1e5  =  1,000 QPS
1 million/day         ->  1e6 / 1e5  =  10 QPS
```

**Memorise the middle one.** 100M/day ≈ 1,000 QPS anchors everything else by
factors of ten.

### Peak is 2–3× average

Traffic is not flat. Multiply the average by 2 for a global service, 3 for one
with a concentrated timezone. **Say which you are using and why** — it shows you
know the average is not the number you provision for.

### Powers of two, in bytes

| Power | Value | Name |
|---|---|---|
| 2¹⁰ | ~1 thousand | KB |
| 2²⁰ | ~1 million | MB |
| 2³⁰ | ~1 billion | GB |
| 2⁴⁰ | ~1 trillion | TB |

Also: **2³² ≈ 4 billion** (why 32-bit IDs run out) and **2⁶⁴ ≈ 1.8 × 10¹⁹**
(why 64-bit ones do not).

### Round aggressively and say so

*"Call it 12,000 — I'll round to 10,000."* Nobody is checking your arithmetic;
they are checking whether you can hold magnitudes. Precision theatre wastes
clock and creates opportunities to make an error that derails you.

---

## 4 · The template

```
1. USERS       DAU, and actions per user per day
2. QPS         actions/day / 100,000  ->  average.  x2-3  ->  peak
3. STORAGE     writes/day x bytes/write x 365 x replication factor
4. BANDWIDTH   QPS x payload size     (only if payloads are large)
5. CONCLUDE    "so this needs / does not need X"
```

Step 5 is not optional. It is the only step being scored.

---

## 5 · Worked — Twitter-scale timeline

```
USERS
  500M DAU
  each posts 0.2 tweets/day   ->  100M tweets/day
  each reads timeline 2x/day  ->  1B reads/day

QPS
  writes:  1e8 / 1e5  = 1,000/s average,  ~3,000/s peak
  reads:   1e9 / 1e5  = 10,000/s average, ~30,000/s peak

STORAGE
  1e8 tweets/day x 1 KB       = 100 GB/day
  x 365                       = ~36 TB/year
  x 3 (replication)           = ~110 TB/year

CONCLUSION
  - 3,000 writes/s is past a single primary (~5-10k, and that is optimistic
    with indexes) -> shard the tweet store, by tweet ID
  - 30,000 reads/s cannot hit the database -> timelines served from cache
  - 36 TB/year of tweets is fine on a modest sharded fleet; the graph and
    the timeline cache will cost more RAM than the tweets cost disk
```

**Three numbers, three decisions.** That is a complete estimation phase, and it
took under three minutes.

### The follow-up that separates candidates

> *"How much RAM does the timeline cache need?"*

```
500M users x 800 cached tweet IDs x 8 bytes = 3.2 TB

...but 80% of users are not active on a given day, and inactive users can
be rebuilt on demand. Cache only the active 20%:

100M x 800 x 8 = 640 GB  ->  ~10 cache nodes at 64 GB
```

**The refinement is the answer, not the first number.** Noticing that you do not
have to cache everyone, and saying what the miss path costs, is the difference
between a level-2 and a level-3 answer.

---

## 6 · Worked — a photo service

Media changes which number binds.

```
USERS
  100M DAU, 0.5 uploads/day  ->  50M uploads/day
  20 photo views/day         ->  2B views/day

QPS
  writes: 5e7 / 1e5 = 500/s,  peak ~1,500/s
  reads:  2e9 / 1e5 = 20,000/s, peak ~60,000/s

STORAGE
  5e7 x 1 MB      = 50 TB/day        (!)
  x 365           = ~18 PB/year
  x 3 replication = ~55 PB/year

BANDWIDTH
  reads: 20,000/s x 200 KB (thumbnail) = 4 GB/s = 32 Gbps

CONCLUSION
  - 18 PB/year rules out storing blobs in a database. Object storage for
    the bytes; the DB holds metadata only.
  - 32 Gbps of egress is the dominant COST, not a capacity problem. A CDN
    is not an optimisation here, it is the architecture.
  - Serve resized variants, not originals. The 200 KB vs 1 MB choice is a
    5x bandwidth difference and dwarfs every other saving on the table.
```

> **Notice the shape changed.** For Twitter the binding constraint was read QPS.
> Here it is bandwidth and cost. Saying *"the interesting number here is egress,
> not QPS"* demonstrates you are reading the problem rather than running a
> ritual.

---

## 7 · Turning numbers into decisions

The table to have in your head:

| If you compute… | And it is… | Then |
|---|---|---|
| Write QPS | < 1,000 | Single primary; do not shard |
| Write QPS | > 10,000 | Shard; name the shard key |
| Read QPS | > 10× writes | Cache layer; consider precomputation |
| Read QPS | > 100k | CDN or edge cache, not just a cache tier |
| Storage/year | < 1 TB | One machine; it fits in RAM territory |
| Storage/year | > 100 TB | Sharded, tiered, lifecycle policies |
| Payload | > 1 MB | Object storage + CDN; DB holds metadata |
| Bandwidth | > 10 Gbps | CDN is the architecture, and cost is the driver |
| Peak/average | > 5× | Queue to absorb; autoscaling alone is too slow |

---

## 8 · Mistakes

| Mistake | Why it costs |
|---|---|
| Skipping estimation entirely | Every capacity decision becomes a guess |
| Ten minutes of arithmetic | Eats the deep dive, which is where the score is |
| Numbers with no conclusion | The phase had no purpose |
| Using the average, provisioning for it | Peak is 2–3×; you designed for the wrong load |
| Forgetting the replication factor | Storage off by 3× |
| Ignoring indexes and metadata | Real usage is often 2× the raw row size |
| False precision | 86,400 instead of 100,000 buys nothing and costs clock |
| Not sanity-checking | "40 PB of tweets a year" should feel wrong; catch it |

**Sanity-check out loud.** *"That gives 200 TB a day, which is more than
YouTube — let me check… I dropped a factor of a thousand."* Catching your own
error is a positive signal, not a negative one.

---

## 9 · Questions on estimation

| Question | What to say |
|---|---|
| ⭐ "How many servers would you need?" | Peak QPS divided by per-server capacity, plus headroom for failure. 30,000 QPS at 10k per server is 3, so provision 5 — you need to survive losing one and still absorb a spike. |
| "How do you size a cache?" | Working set, not total data. Estimate the active fraction, multiply by entry size, and state the assumed hit rate — then say what happens on a miss, because that determines the database sizing. |
| ⭐ "What if your estimate is off by 10×?" | The tiering conclusions mostly hold; the counts change. I'd design so capacity is a config change — stateless services, a chosen shard key, autoscaling — rather than an architecture change. The dangerous errors are the ones that change the *shape*: blobs in a database, or no shard key. |
| "Why 100,000 seconds a day?" | It is 86,400 rounded so every division is a power of ten. 16% error, and no arithmetic risk under pressure. |

---

## Stop condition

You can move on when you can:

1. recall the eleven numbers without looking,
2. convert events/day to QPS instantly,
3. state the per-primary write ceiling and what it implies,
4. run the Twitter estimate in three minutes out loud, and
5. finish every estimate with a *"so this means…"* sentence.

Next: the [building blocks](load-balancing.html).
