---
title: Numbers to know
slug: numbers-to-know
module: reference
order: 70
status: live
level: the card to review the morning of
summary: Every number worth memorising, on one page — latency, capacity, cost, availability, and the conversions that make estimation instant.
---

# Numbers to know

> **The card to review the morning of the interview.** Nothing here is
> derivable under pressure; all of it makes the estimation phase fast.

---

## 1 · Latency

| Operation | Time | Ratio to the one above |
|---|---|---|
| L1 cache reference | 1 ns | — |
| Branch mispredict | 3 ns | 3× |
| L2 cache reference | 4 ns | — |
| Mutex lock/unlock | 17 ns | — |
| **Main memory reference** | **100 ns** | 100× L1 |
| Compress 1 KB (Snappy) | 2 µs | — |
| Send 1 KB over 1 Gbps | 10 µs | — |
| **SSD random read** | **100 µs** | 1,000× memory |
| Read 1 MB sequentially from memory | 250 µs | — |
| **Datacentre round trip** | **500 µs** | — |
| Read 1 MB sequentially from SSD | 1 ms | — |
| **Disk seek (spinning)** | **10 ms** | 100× SSD |
| Read 1 MB from disk | 20 ms | — |
| **US ↔ Europe round trip** | **150 ms** | Physics |

**The three ratios that actually matter:**

```
memory : SSD        = 1 : 1,000       -> why you cache
SSD    : disk seek  = 1 : 100         -> why SSDs changed database design
DC hop : intercontinental = 1 : 300   -> why you use a CDN, and why
                                         multi-region writes are hard
```

---

## 2 · Capacity per commodity machine

| Component | Capacity |
|---|---|
| Web/app server | 10k–50k QPS (simple requests) |
| **SQL database writes** | **5k–10k/s per primary** |
| SQL database reads | 10k–50k/s (more with replicas) |
| Redis / Memcached | ~100k QPS per node |
| Kafka broker | ~100k messages/s |
| Nginx / Envoy | ~50k–100k connections |
| WebSocket connections | 10k–50k per server |
| Server RAM | 64–256 GB |
| Server SSD | 1–10 TB |
| NIC | 10–25 Gbps |

> **The 5k–10k writes per primary figure earns its keep more than any other.**
> It is the number that decides "one database" versus "shard", and being able to
> apply it instantly turns a guess into a justified decision.

---

## 3 · Sizes

| Item | Size |
|---|---|
| ASCII character | 1 byte |
| Unicode character (UTF-8) | 1–4 bytes |
| Integer / timestamp | 4–8 bytes |
| UUID | 16 bytes |
| Typical database row | ~1 KB |
| Tweet with metadata | ~1 KB |
| Compressed web page | ~100 KB |
| Photo (compressed) | ~1 MB |
| Photo (thumbnail) | ~10–200 KB |
| Minute of 1080p video | ~50 MB |
| Minute of 4K video | ~200 MB |

**Powers of two:**

| Power | ≈ | Unit |
|---|---|---|
| 2¹⁰ | 1 thousand | KB |
| 2²⁰ | 1 million | MB |
| 2³⁰ | 1 billion | GB |
| 2⁴⁰ | 1 trillion | TB |
| **2³²** | **4.3 billion** | Why 32-bit IDs run out |
| **2⁶⁴** | **1.8 × 10¹⁹** | Why 64-bit ones do not |

---

## 4 · Time conversions

**Use 100,000 seconds per day.** (Real: 86,400. Error: 16%. Worth it.)

| Per day | ≈ QPS |
|---|---|
| 1 million | 10 |
| 10 million | 100 |
| **100 million** | **1,000** ← anchor |
| 1 billion | 10,000 |
| 10 billion | 100,000 |

| Interval | Seconds |
|---|---|
| Minute | 60 |
| Hour | 3,600 |
| Day | 86,400 (~100k) |
| Month | 2.6M |
| Year | 31.5M (~30M) |

**Peak = 2–3× average.** Global services 2×; single-timezone 3×.

---

## 5 · Availability

| SLA | Downtime/year | /month | /week |
|---|---|---|---|
| 99% | 3.65 days | 7.2 h | 1.7 h |
| 99.9% ("three nines") | 8.8 h | 43 min | 10 min |
| 99.95% | 4.4 h | 22 min | 5 min |
| 99.99% ("four nines") | 53 min | 4.3 min | 1 min |
| 99.999% ("five nines") | 5.3 min | 26 s | 6 s |

```
SERIES (dependencies):    0.999^3 = 99.7%     -- each one costs you
PARALLEL (redundancy):    1 - 0.01^2 = 99.99% -- IF independent
```

**Correlated failure is why the parallel number is optimistic** — shared racks,
shared control planes, shared deploy pipelines.

---

## 6 · Cost, order of magnitude

| Resource | Rough monthly cost |
|---|---|
| Object storage | $20–25 / TB |
| Block storage (SSD) | $80–100 / TB |
| Database storage (managed) | $100–200 / TB |
| **Cloud egress** | **$50–90 / TB** ← usually dominates |
| CDN egress | $10–40 / TB |
| App server (4 vCPU, 16 GB) | $100–150 |
| Cache node (32 GB) | $200–400 |

> **Egress is the line item that surprises people.** For any media-serving
> system, bandwidth cost typically exceeds compute and storage combined — which
> is why the CDN and serving correctly-sized variants are architectural
> decisions, not optimisations.

---

## 7 · Ratios and rules of thumb

| Rule | Value |
|---|---|
| Read:write, social/content | 100:1 to 1000:1 |
| Cache hit rate, well-designed | 90–99% |
| Hot data (the 80/20 rule) | 20% of data = 80% of traffic |
| Compression ratio, text | 3–5× |
| Compression ratio, JSON | 5–10× |
| Index storage overhead | 10–30% of table size |
| Replication factor | 3 (2 for cheap, 5 for critical) |
| Peak:average traffic | 2–3× |
| Bloom filter | ~10 bits/element for ~1% false positives |

---

## 8 · The 60-second estimation script

```
1. DAU x actions/day        = actions/day
2. / 100,000                = average QPS
3. x 2-3                    = peak QPS
4. writes/day x bytes x 365 x 3   = storage/year
5. peak QPS / 10,000        = app servers (then round UP for headroom)
6. hot data x entry size    = cache RAM

7. CONCLUDE. "So this needs / does not need X."
```

**Step 7 is the only one being scored.** An estimate that changes no decision was
wasted time.

---

## 9 · Sanity checks

If your answer looks like one of these, recheck:

| Result | Likely error |
|---|---|
| > 1 PB/day of text | Dropped a factor of 1,000 |
| > 1M QPS for a normal app | Confused per-day with per-second |
| A single server at 500k QPS | Off by 10× |
| Storage without replication | Forgot the ×3 |
| Provisioning for average load | Forgot peak |
| More cache RAM than total data | Caching everything, including cold |

**Catching your own error out loud is a positive signal**, not a negative one.
*"That gives 200 TB a day, which is more than YouTube — let me recheck"* reads
as someone with calibrated intuition.
