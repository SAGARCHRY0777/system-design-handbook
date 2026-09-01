---
title: Rate limiting
slug: rate-limiting
module: blocks
order: 24
status: live
level: core — and a common standalone question
summary: The five algorithms with their exact trade-offs, why the fixed window is wrong, distributed counting, and what to return when you reject.
---

# Rate limiting

> Rate limiting appears twice in the round: as a component of a larger design,
> and as a **standalone question** — "design a rate limiter" is a classic. Both
> want the same thing: the algorithm, why, and how it works across many servers.

---

## 1 · Why

| Reason | Example |
|---|---|
| **Protect capacity** | One client cannot exhaust the fleet |
| **Fairness** | One tenant cannot starve the others |
| **Cost control** | Downstream calls cost money per request |
| **Abuse** | Credential stuffing, scraping |
| **Tiering** | Free 100/hr, paid 10,000/hr |

**Rate limiting is a load-shedding mechanism**, which means it is part of your
availability story, not just a security feature. Framing it that way is better
than "to stop abuse".

---

## 2 · The five algorithms

### Fixed window

Count requests per fixed interval; reset at the boundary.

```
limit 100/minute

12:00:00 - 12:00:59   counter -> 100
12:01:00              counter resets to 0
```

**Its flaw is the boundary burst, and you should name it:**

```
12:00:59   100 requests  |
12:01:00   100 requests  |  200 requests in ONE second
                            while "never exceeding 100/minute"
```

Simple, memory-cheap, and permits 2× the limit at any boundary.

### Sliding window log

Store the timestamp of every request; count those inside the window.

**Exact** — no boundary problem. Costs memory proportional to the number of
requests, which is why it does not scale to high limits.

```python
def allow(user_id, limit=100, window=60):
    now = time.time()
    key = f"rl:{user_id}"
    pipe = redis.pipeline()
    pipe.zremrangebyscore(key, 0, now - window)   # drop expired
    pipe.zadd(key, {str(uuid4()): now})           # record this one
    pipe.zcard(key)                               # count the window
    pipe.expire(key, window)
    _, _, count, _ = pipe.execute()
    return count <= limit
```

### Sliding window counter

The practical compromise: weight the previous window by how much of it is still
in view.

```
limit 100/min.  It is 12:01:15, so 75% of the window is in 12:01
and 25% is still in 12:00.

  estimate = current + previous x 0.25
           = 40      + 90       x 0.25   =  62.5   -> allow
```

**O(1) memory, no boundary burst, approximate.** The approximation assumes
requests were spread evenly across the previous window — accurate enough that
this is what most production limiters use, and saying that is a good answer.

### Token bucket

A bucket of capacity B refills at rate R. Each request takes a token; empty
bucket means reject.

```
capacity 10, refill 1/second

  idle for 10s  -> bucket full  -> a BURST of 10 is allowed
  sustained     -> throttled to 1/second
```

**Token bucket allows bursts up to the bucket size while enforcing a long-run
average.** That is usually what you actually want — real clients are bursty, and
a limiter that rejects a legitimate burst after a quiet period is annoying
without being safer.

```python
def allow(user_id, capacity=10, refill_rate=1.0):
    now = time.time()
    tokens, last = redis.hmget(f"tb:{user_id}", "tokens", "last")
    tokens = float(tokens or capacity)
    last = float(last or now)

    # Refill lazily: no background job, just compute what accrued.
    tokens = min(capacity, tokens + (now - last) * refill_rate)

    if tokens < 1:
        return False
    redis.hset(f"tb:{user_id}", mapping={"tokens": tokens - 1, "last": now})
    return True
```

**Lazy refill is the implementation detail worth mentioning** — you never run a
timer, you compute the accrued tokens from the elapsed time on each request.

### Leaky bucket

A queue drained at a fixed rate. **Smooths output completely** — no bursts pass
through at all. Right when the thing you are protecting cannot absorb bursts,
such as a downstream API with a hard rate limit.

| Algorithm | Memory | Burst | Exact | Use |
|---|---|---|---|---|
| Fixed window | O(1) | 2× at boundary | ✗ | Rough internal limits |
| Sliding log | O(requests) | None | ✓ | Low limits, exactness required |
| Sliding counter | O(1) | Minimal | ~ | **The general default** |
| Token bucket | O(1) | Up to capacity | ✓ | **APIs — bursts are desirable** |
| Leaky bucket | O(queue) | None | ✓ | Protecting a fixed-rate downstream |

> **Token bucket for public APIs, sliding window counter when you want strict
> per-window semantics.** Being able to pick and say why in one sentence is the
> whole question.

---

## 3 · Doing it across many servers

The real problem. Ten servers each enforcing 100/min gives an effective limit of
1,000/min.

| Approach | How | Trade-off |
|---|---|---|
| **Central store** | Redis holds the counters | Correct; a network hop and a dependency |
| **Local, divided** | Each server enforces limit/N | No coordination; wrong under uneven balancing |
| **Local + async sync** | Enforce locally, reconcile periodically | Fast, approximate, temporarily over-permissive |
| **Sticky routing** | Same client always to the same server | Correct; couples limiting to load balancing |

**Redis is the standard answer**, and the important detail is atomicity: a
read-then-write race lets concurrent requests both pass. Use `INCR` (atomic by
construction) or a **Lua script**, which Redis executes atomically — that is the
implementation answer for anything more complex than a counter.

```lua
-- Atomic token bucket. The whole script runs as one operation, so
-- there is no window between reading the tokens and writing them back.
local tokens = tonumber(redis.call("HGET", KEYS[1], "tokens")) or ARGV[1]
local last   = tonumber(redis.call("HGET", KEYS[1], "last"))   or ARGV[3]
local filled = math.min(ARGV[1], tokens + (ARGV[3] - last) * ARGV[2])
if filled < 1 then return 0 end
redis.call("HSET", KEYS[1], "tokens", filled - 1, "last", ARGV[3])
redis.call("EXPIRE", KEYS[1], ARGV[4])
return 1
```

**And say what happens when Redis is down.** Fail open (allow everything —
availability over protection) or fail closed (reject everything — protection
over availability)? For a public API, fail open with a conservative local
fallback: a rate limiter that takes down your service is worse than the abuse it
was preventing. **Volunteering this choice is a strong signal.**

---

## 4 · What to limit on

| Key | Catches | Problem |
|---|---|---|
| **API key / user ID** | Per-customer fairness | Only works when authenticated |
| **IP address** | Anonymous traffic | NAT and mobile carriers share IPs; IPv6 is cheap to rotate |
| **IP + endpoint** | Targeted abuse (login) | More keys to track |
| **Session / device** | Per-device fairness | Spoofable |
| **Global** | Total system protection | No fairness between clients |

**Layer them.** A strict limit on `POST /login` per IP, a generous per-user API
limit, and a global circuit breaker are three different defences against three
different failures.

---

## 5 · What to return

**Getting the response right is easy points**, and many candidates skip it.

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 30
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1735689600
```

**429, not 503.** 503 means the server is broken; 429 means the client should
slow down — and well-behaved clients read `Retry-After` and back off.

**Return the headers on successful responses too**, so clients can self-throttle
before they hit the wall rather than discovering it by being rejected.

> **Rate limit at the edge, not in the application.** The whole point is to
> reject cheaply — spending a service call, a database query, and a thread on a
> request you are about to refuse defeats the purpose. API gateway or load
> balancer, before the expensive work.

---

## 6 · What to say in the round

> *"Token bucket at the API gateway, keyed by API key, with a separate stricter
> IP-based limit on the auth endpoints. Bucket capacity ten, refill at the
> tier's sustained rate — bursts are legitimate and I'd rather allow them than
> reject a client that was idle. Counters in Redis, updated by a Lua script so
> the read-modify-write is atomic; without that, concurrent requests race and
> both pass. If Redis is unavailable I fail open with a conservative local limit
> — a limiter that causes an outage is worse than the abuse it prevents. Clients
> get 429 with `Retry-After`, and the limit headers on every response so they
> can self-throttle."*

---

## 7 · Interview questions

| Question | What to say |
|---|---|
| ⭐ "Which algorithm?" | Token bucket for a public API, because bursts after idle are legitimate and it still bounds the long-run average. Sliding window counter when I need strict per-window semantics with O(1) memory. Fixed window I would avoid — it permits 2× the limit across a boundary. |
| ⭐ "How does it work across 10 servers?" | Shared counters in Redis, atomic via INCR or a Lua script — a read-then-write races and lets concurrent requests through. Dividing the limit locally by server count breaks under uneven load balancing. |
| ⭐ "What if Redis is down?" | A decision to state explicitly. For a public API, fail open with a conservative in-process fallback: the limiter causing an outage is worse than the abuse it stops. For something like payments, fail closed. |
| "IP or user ID?" | User ID where authenticated — it is the unit of fairness. IP for anonymous traffic, knowing NAT makes it coarse and IPv6 makes it cheap to evade. Layer both, plus a global limit. |
| "What do you return?" | 429 with `Retry-After`, plus limit/remaining/reset headers on all responses so well-behaved clients throttle themselves instead of discovering the wall. |
| "Where does it run?" | At the edge — gateway or LB. Rejecting a request after a database query has already spent the resource the limiter exists to protect. |
| "How do you handle a legitimate burst?" | That is exactly what token bucket's capacity is for. If the burst is large and predictable, a per-tier bucket size, or queue and shape it with a leaky bucket rather than rejecting. |

---

## Stop condition

You know this block when you can:

1. name all five algorithms and the fixed window's boundary flaw,
2. explain token bucket's lazy refill,
3. justify the sliding window counter's approximation,
4. explain why the Redis update must be atomic, and
5. make and defend the fail-open/fail-closed call.
