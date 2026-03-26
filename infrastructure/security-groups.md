# Security Group Configuration

## EC2 Instance Security Group: `launch-wizard-1`

> Region: **US East (N. Virginia)** `us-east-1`
> Instance: **`demo-server`** — Ubuntu 24.04 LTS, **t2.micro** (Free Tier eligible)
> Security group ID: `sg-00a071fb476373fe5`

### Inbound Rules

| Rule | Protocol | Port | Source | Purpose |
|------|----------|------|--------|---------|
| HTTP | TCP | 80 | 0.0.0.0/0 | Public web traffic |
| HTTPS | TCP | 443 | 0.0.0.0/0 | Public HTTPS traffic |
| SSH | TCP | 22 | `175.157.18.9/32` | Admin access — **your IP only** |

> ✅ SSH is restricted to a single trusted IP (`175.157.18.9/32`). This follows the principle of least privilege — no public SSH access.

### Outbound Rules

| Rule | Protocol | Port | Destination | Purpose |
|------|----------|------|-------------|---------|
| All traffic | All | All | 0.0.0.0/0 | Allow outbound (package installs, S3 calls) |

---

## Database Isolation

PostgreSQL runs inside the Docker network (`compose` default bridge). It is only accessible from the `backend` container. The `expose:` directive in `docker-compose.yml` makes the port available only within Docker — NOT on the host.

---
