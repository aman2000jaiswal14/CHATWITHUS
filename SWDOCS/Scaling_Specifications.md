# WCA Secure Chat - Scaling & Performance Specifications (Tier-Based)

## 1. Overview
WCA Secure Chat is designed for extreme scale, from local teams to millions of users. This document provides the mathematical justification for resource allocation across all tiers, optimized for low-bandwidth (1 Mbps) and high-concurrency environments.

---

## 2. Resource Allocation Master Table

| Tier | Total Users | Concurrent WS | CPU Cores | RAM | 90-Day SSD | 180-Day SSD | Deployment Mode |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Small** | 2,000 | ~500 | 2 | 4 GB | 100 GB | 180 GB | Single VPS (SQLite) |
| **Medium** | 5,000 | ~1,500 | 4 | 8 GB | 250 GB | 450 GB | High-Perf VPS (Postgres) |
| **Large** | 10,000 | ~3,000 | 8 | 16 GB | 500 GB | 900 GB | Multi-Process (Daphne) |
| **Enterprise** | 20,000 | ~6,000 | 12 | 32 GB | 1.0 TB | 1.8 TB | Horizontal Cluster (3 Nodes) |
| **Massive** | 50,000 | ~15,000 | 40 | 64 GB | 2.5 TB | 4.8 TB | K8s / Autoscale Cluster |
| **Global** | 1M+ | ~250k+ | 500+ | 1TB+ | 50 TB+ | 100 TB+ | Multi-Region K8s Mesh |

---

## 3. Detailed Scaling Math per Tier

The following calculations assume a **High-Activity Profile**: 10% of users sending one 5MB file daily, plus constant Protobuf-wrapped text/PTT traffic.

### A. Storage Calculation (The 90 & 180 Day Formula)
*Formula: `(Total Users * 10% * 5MB * Days) + OS/DB Overhead (20%)`*

- **2k Users**: `(200 * 5MB * 90) = 90GB`. Total: **~100GB** (90D) / **~180GB** (180D).
- **5k Users**: `(500 * 5MB * 90) = 225GB`. Total: **~250GB** (90D) / **~450GB** (180D).
- **10k Users**: `(1000 * 5MB * 90) = 450GB`. Total: **~500GB** (90D) / **~900GB** (180D).
- **20k Users**: `(2000 * 5MB * 90) = 900GB`. Total: **~1.0TB** (90D) / **~1.8TB** (180D).
- **50k Users**: `(5000 * 5MB * 90) = 2.25TB`. Total: **~2.5TB** (90D) / **~4.8TB** (180D).
- **1M Users**: `(100k * 5MB * 90) = 45TB`. Total: **~50TB** (90D) / **~100TB** (180D). *Requires distributed object storage (S3/Ceph).*

### B. RAM Calculation (Why this much?)
*Formula: `(Concurrent WS * 128KB) + Redis Buffers + OS/DB Cache`*

- **2k (500 WS)**: `(500 * 0.128MB) = 64MB`. OS/DB Cache takes rest of **4GB**.
- **10k (3k WS)**: `(3000 * 0.128MB) = 384MB`. Shared Buffers (4GB) + OS Cache = **16GB**.
- **50k (15k WS)**: `(15,000 * 0.128MB) = 1.9GB`. Redis Clustered Buffers (2GB) + DB Buffers (16GB) + VFS Cache = **64GB**.
- **1M (250k WS)**: `(250,000 * 0.128MB) = 32GB`. Requires large-scale distributed RAM Mesh (Redis Cluster) = **1TB+ total across nodes**.

### C. CPU cores (Why this many?)
Calculated based on the **"Fan-out" Effect**: Sending a 1KB message to a group of 1,000 members requires 1,000 Protobuf serializations.
- **Tiers 2k-10k**: Single machine handles interrupts easily.
- **Tiers 50k - 1M**: Requires horizontal distribution so no single node handles more than 2,000 "fan-out" events per core, maintaining **<50ms** backend latency.

---

## 4. Latency Specifications (Network Speed Wise)
Validation for **1 Mbps restricted pipes** vs high-speed links.

| Metric | 1 Mbps (Isolated) | 10 Mbps (Sat) | 100 Mbps (Fiber) | **Math / Justification** |
| :--- | :--- | :--- | :--- | :--- |
| **Text Msg** | ~180ms | ~80ms | < 20ms | `(450B Protobuf) / Speed` + RTT |
| **PTT Start** | ~1.2s | < 0.5s | Instant | Chunk buffering + Handshake |
| **File (5MB)** | ~45s | ~5s | < 1s | `5MB / Effective Speed` |

### Why these durations?
On a **1 Mbps** link, a 5MB file takes exactly `(5 * 1024 * 1024 * 8 bits) / 1,000,000 bps = 41.9 seconds`. Adding 10% TCP overhead results in the **~45s** benchmark. Any system taking longer is inefficient; WCA Secure Chat hits this theoretical maximum.

---

## 5. Deployment Strategies for 1M+ Users
- **Multi-Region**: Deploy clusters in separate geographical zones.
- **Global Redis Mesh**: Use Redis Enterprise or Valkey with CRDTs for global state.
- **Content Routing**: Use Geo-DNS to route 1M users to the nearest regional K8s cluster.
- **Cold Storage**: Mandatory automated migration to Glacier/Tape for attachments older than 180 days.
