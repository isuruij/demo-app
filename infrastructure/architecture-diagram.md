# Architecture Diagram – Notes App on AWS

```mermaid
graph TB
    subgraph Internet
        User(["👤 User / Browser"])
    end

    subgraph AWS["AWS Cloud (Free Tier)"]
        subgraph VPC["VPC – Default"]
            SG["🛡️ Security Group\nInbound: 80, 443 (public)\n22 (your IP only)"]

            subgraph EC2["EC2 t2.micro / t3.micro"]
                Nginx["🔀 Nginx\nReverse Proxy\n:80 / :443"]

                subgraph DockerNet["Docker Internal Network"]
                    Frontend["⚛️ React\n(Nginx container)\n:80"]
                    Backend["🐍 Django\n(Gunicorn)\n:8000"]
                    DB[("🐘 PostgreSQL\n:5432\n(internal only)")]
                end
            end

            subgraph S3["S3 Bucket (Public Reads via Bucket Policy)"]
                Uploads["📁 uploads/\n(public GetObject)\n(write restricted to IAM user)"]
            end
        end

        IAM["🔑 IAM User/Role\nLeast Privilege\nS3 PutObject/GetObject\nuploads/* only"]
    end

    User -- "HTTPS 443 / HTTP 80" --> SG
    SG --> Nginx
    Nginx -- "/api/ proxy" --> Backend
    Nginx -- "/ proxy" --> Frontend
    Backend -- "SQL" --> DB
    Backend -- "boto3 / django-storages" --> S3
    IAM -.-> Backend
    IAM -.-> S3
```

## Data Flow

1. **User** makes HTTPS request → EC2 Security Group (allows 80/443)
2. **Nginx** reverse proxy routes:
   - `/api/*` → Django backend (port 8000)
   - `/admin/*` → Django admin (port 8000)
   - `/*` → React SPA (port 80 of frontend container)
3. **Django** queries **PostgreSQL** (internal Docker network only, port 5432 never exposed externally)
4. **File uploads** → Django writes to **S3** via `boto3`/`django-storages` using IAM credentials restricted to `uploads/*` prefix only
