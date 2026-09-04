---
title: Networking fundamentals
slug: networking
module: blocks
order: 26
status: live
level: the layer under everything else
summary: DNS, TCP versus UDP, the HTTP versions and what each fixed, forward versus reverse proxies, and where TLS costs you.
---

# Networking fundamentals

> **This is the layer every other page assumes.** It rarely gets a whole
> question, but it produces the follow-ups — *"what happens when you type a URL
> and press enter?"* is still the most-asked warm-up in the industry.

---

## 1 · What happens when you press enter

The canonical question, in the order it happens:

```
1. BROWSER CACHE      already have it, and still fresh? done.
2. DNS                example.com -> 93.184.216.34
                      browser -> OS -> resolver -> root -> TLD -> authoritative
                      (each layer caches, so most lookups stop early)
3. TCP HANDSHAKE      SYN, SYN-ACK, ACK   -- one round trip
4. TLS HANDSHAKE      certificate, key exchange
                      TLS 1.2: two round trips.  TLS 1.3: one.
5. HTTP REQUEST       GET / HTTP/2, headers, cookies
6. SERVER             LB -> app -> cache/DB -> response
7. RESPONSE           status, headers, body
8. RENDER             parse HTML, fetch subresources, paint
```

> **The point of the question is the round trips.** Before a single byte of your
> page moves, you have spent one RTT on TCP and one or two on TLS. Across an
> ocean at 150 ms per round trip, that is 300–450 ms of pure latency — which is
> why connection reuse, HTTP/2 and CDNs matter more than shaving server time.

---

## 2 · DNS

Hierarchical name resolution, cached at every layer.

| Record | Maps |
|---|---|
| **A / AAAA** | Name → IPv4 / IPv6 address |
| **CNAME** | Name → another name |
| **MX** | Mail servers |
| **TXT** | Arbitrary text — domain verification, SPF |
| **NS** | Which servers are authoritative |

**Routing policies** — how DNS becomes a traffic tool:

| Policy | Behaviour |
|---|---|
| Simple | One answer |
| **Weighted** | Split by percentage — canary releases |
| **Latency / geo** | Nearest or fastest region |
| Failover | Secondary when the health check fails |
| Round robin | Rotate answers — crude balancing |

> **DNS is a poor failover mechanism, and knowing why is the useful part.**
> Records are cached by resolvers, operating systems and browsers, and **many
> ignore your TTL**. Setting TTL to 60 seconds does not mean traffic moves in 60
> seconds — a meaningful tail keeps hitting the dead address for much longer.
> For real failover use anycast or a health-checked load balancer, and treat DNS
> as coarse routing.

**Anycast** — the same IP announced from many locations, with BGP routing each
client to the nearest. It is how CDNs and public resolvers work, and it fails
over in seconds rather than TTL-minutes.

---

## 3 · TCP versus UDP

| | TCP | UDP |
|---|---|---|
| Connection | Handshake first | None — just send |
| Delivery | Guaranteed, retransmits | Best effort |
| Ordering | Guaranteed | None |
| Congestion control | Yes | You build it |
| Overhead | 20-byte header + handshake | 8-byte header |
| Head-of-line blocking | **Yes** | No |
| Used by | HTTP, databases, most things | DNS, video calls, gaming, QUIC |

**Choose UDP when late data is worthless.** In a video call, a packet from 200 ms
ago has no value — retransmitting it delays everything behind it and makes the
call worse. Dropping it is correct.

> **Head-of-line blocking is the concept to be able to explain.** TCP guarantees
> ordering, so one lost segment stalls *everything* behind it until it is
> retransmitted — even data that arrived fine and belongs to an unrelated
> request. That single property drove the design of HTTP/2 and then HTTP/3.

---

## 4 · The HTTP versions

**Each version fixed the previous one's bottleneck.** Being able to say what
each fixed is the whole answer.

| | Fixed | Remaining problem |
|---|---|---|
| **HTTP/1.0** | — | New TCP connection per request |
| **HTTP/1.1** | Keep-alive, so connections are reused | **One request at a time per connection** — browsers opened ~6 connections and sharded domains to work around it |
| **HTTP/2** | **Multiplexing** — many streams over one connection; header compression; server push | Still TCP, so **one lost packet stalls every stream** |
| **HTTP/3** | Runs on **QUIC over UDP** — loss in one stream does not block others; 0-RTT resumption | Newer; some middleboxes interfere with UDP |

> **HTTP/2 moved head-of-line blocking down a layer rather than removing it.**
> It removed it at the HTTP layer — six requests share one connection — but TCP
> still guarantees byte ordering underneath, so a single dropped packet stalls
> all six streams. HTTP/3 solves it properly by abandoning TCP. **That
> progression is the cleanest way to show you understand the stack.**

**A consequence worth knowing:** domain sharding and sprite sheets were HTTP/1.1
workarounds and are actively *harmful* under HTTP/2 — more domains means more
connections and less multiplexing.

---

## 5 · Proxies

**The distinction is who it acts for.**

```
FORWARD PROXY  -- acts for the CLIENT; the server does not know the real client
   client -> [proxy] -> internet
   corporate egress filtering, VPNs, caching for a network

REVERSE PROXY  -- acts for the SERVER; the client does not know the real server
   client -> [proxy] -> your servers
   load balancing, TLS termination, caching, WAF, rate limiting
```

| | Forward | Reverse |
|---|---|---|
| Hides | The client | The servers |
| Configured by | The client or its network | The service owner |
| Examples | Squid, VPN, Tor | Nginx, Envoy, CloudFront, ALB |

**Almost everything in a system design diagram is a reverse proxy** — load
balancers, API gateways and CDN edges are all reverse proxies with different
emphases.

---

## 6 · TLS, and what it costs

**TLS 1.3 is one round trip; TLS 1.2 was two.** With session resumption, 1.3
can achieve 0-RTT for repeat visits — at the cost that 0-RTT data is replayable,
so it must only carry idempotent requests.

**Where to terminate it:**

| Terminate at | Consequence |
|---|---|
| **Load balancer** | Backends speak plain HTTP — simpler, faster, but the internal network is trusted |
| **Each service** | Encrypted end to end; certificate management on every service |
| **Both (mTLS internally)** | Zero-trust; a service mesh usually manages the certificates |

> **Terminating at the edge is the common answer, and the honest follow-up is
> that it assumes a trusted internal network.** If that assumption is wrong —
> multi-tenant infrastructure, compliance requirements — you need mTLS between
> services, which is precisely what a service mesh exists to automate.

---

## 7 · Keeping a connection open

| Mechanism | Direction | Use for |
|---|---|---|
| **Polling** | Client asks repeatedly | Infrequent updates; simple and wasteful |
| **Long polling** | Client asks, server holds the request open | A fallback where WebSockets are blocked |
| **SSE** | Server → client, one way, over plain HTTP | Feeds, notifications, progress |
| **WebSocket** | Full duplex | [Chat](design-chat.html), collaborative editing, games |

**Server-sent events are underrated in interviews.** If updates only flow one
way, SSE is plain HTTP — it reconnects automatically, passes through proxies,
and needs no protocol upgrade. Reaching for WebSockets when SSE would do adds
stateful connections for nothing.

---

## 8 · Interview questions

| Question | What to say |
|---|---|
| ⭐ "What happens when you type a URL?" | Cache, DNS resolution through the hierarchy, TCP handshake, TLS handshake, HTTP request, server work, response, render. The interesting part is the round trips: one for TCP and one or two for TLS before any data moves, which is why connection reuse and CDNs matter more than server time. |
| ⭐ "TCP or UDP?" | TCP unless late data is worthless. In a video call a 200 ms-old packet has no value and retransmitting it delays everything behind it, so UDP is correct. TCP's ordering guarantee is also its weakness — one lost segment blocks everything behind it. |
| ⭐ "What did HTTP/2 fix, and what did it not?" | It fixed HTTP-level head-of-line blocking with multiplexing, so many streams share one connection. It did not fix TCP-level blocking — one dropped packet still stalls every stream, because TCP guarantees byte order. HTTP/3 fixes that by moving to QUIC over UDP. |
| "Why is DNS bad for failover?" | Resolvers, operating systems and browsers cache records and many ignore the TTL, so a dead address keeps receiving traffic well past your TTL. Use anycast or a health-checked balancer, and treat DNS as coarse routing. |
| ⭐ "Forward or reverse proxy?" | A forward proxy acts for the client and hides it from the server. A reverse proxy acts for the server and hides the backends from the client. Nearly every box in a design diagram — load balancer, gateway, CDN edge — is a reverse proxy. |
| "Where do you terminate TLS?" | At the edge, usually, for simplicity and offload — which assumes the internal network is trusted. Where it is not, mTLS between services, typically managed by a service mesh so certificate rotation is not a per-team problem. |
| "WebSocket or SSE?" | SSE if updates only flow server-to-client — it is plain HTTP, reconnects on its own, and traverses proxies. WebSockets when you genuinely need full duplex, accepting stateful servers. |

---

## Stop condition

You know this block when you can:

1. walk the URL question and identify the round trips as the point,
2. explain head-of-line blocking at both the HTTP and TCP layers,
3. say what each HTTP version fixed and what it left,
4. explain why DNS TTL does not control failover time,
5. distinguish forward from reverse proxies by who they act for, and
6. choose SSE over WebSockets when the traffic is one-way.
