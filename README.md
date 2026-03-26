
---

## 📐 1. Architecture Design

```
Internet → [EC2 Security Group: 80, 443]
              ↓
           [Nginx] (reverse proxy)
          /        \
   /api/*            /*
      ↓               ↓
 [Django:8000]   [React:80]
      ↓
 [PostgreSQL:5432]  ←  (internal Docker network only)
      +
   [S3 Bucket]  ←  (file uploads via boto3)
```

**Stack:**
| Layer | Technology |
|-------|-----------|
| Frontend | React 18 (Vite) served by Nginx |
| Backend | Django 4.2 + DRF + Gunicorn |
| Database | PostgreSQL 15 (Docker volume) |
| Reverse Proxy | Nginx 1.25 |
| File Storage | AWS S3 (both dev & prod — public reads via bucket policy) |
| Container | Docker + Docker Compose |
| Hosting | AWS EC2 t2.micro – US East (N. Virginia) `us-east-1` |

See **[infrastructure/architecture-diagram.md](infrastructure/architecture-diagram.md)** for the full Mermaid diagram.

---

## 📋 2. Deployment Steps

### Prerequisites
- Docker + Docker Compose installed
- Git installed
- AWS account (for S3 + EC2)

---

### Local Development

```bash
# 1. Clone repository
git clone https://github.com/isuruij/demo-app.git
cd YOUR_REPO

# 2. Create environment file
cp .env.example .env
# Edit .env – fill in SECRET_KEY, DB_PASSWORD, and real AWS credentials
# S3 is used in BOTH dev and prod — AWS keys are always required

# 3. Build and start all containers
docker compose up --build -d

# 4. View logs
docker compose logs -f backend

# 5. Access the app
# Frontend: http://localhost
# API:      http://localhost/api/notes/
# Admin:    http://localhost/admin/
```

#### Create a Django superuser (optional)
```bash
docker compose exec backend python manage.py createsuperuser
```

---

### AWS EC2 Deployment

#### Step 1 – Launch EC2 Instance
1. Go to **EC2 → Launch Instance** (Region: **US East (N. Virginia) `us-east-1`**)
2. **Name**: `demo-server`
3. **AMI**: Ubuntu Server 24.04 LTS (HVM), SSD Volume Type
   - AMI ID: `ami-0ec10929233384c7f`
   - AMI name: `ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-20260313`
4. **Instance type**: `t2.micro` (1 vCPU, 1 GiB Memory — Free Tier eligible)
5. **Key pair**: Select existing (`demo server`) or create a new one — download `.pem` file
6. **Security Group** (`launch-wizard-1`):
   - ✅ Allow HTTP (80) from Anywhere (0.0.0.0/0)
   - ✅ Allow HTTPS (443) from Anywhere (0.0.0.0/0)
   - ✅ Allow SSH (22) from **your IP only** (`175.157.18.9/32`)
7. **Storage**: 8 GiB gp3 (3000 IOPS)
8. Click **Launch Instance**

#### Step 2 – Set Up S3 Bucket
```
AWS Console → S3 → Create Bucket
  Name: uploads-demo-v1
  Region: ap-south-1
```

Then add a **Bucket Policy** (S3 → your bucket → Permissions → Bucket policy):
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadUploads",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::uploads-demo-v1/uploads/*"
        }
    ]
}
```
> This makes uploaded files publicly readable by URL. Only the `uploads/*` prefix is public — the bucket root is not browseable.

#### Step 3 – Create IAM User
```
IAM → Users → Create User → notes-app-user
Attach policy: Create inline policy → paste infrastructure/iam-policy.json
  (replace YOUR-BUCKET-NAME with your actual bucket name)
Create Access Key → Application (CLI) → save credentials
```

#### Step 4 – Deploy to EC2
```bash
# SSH into your EC2 instance
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# Run the deployment script
curl -O https://raw.githubusercontent.com/isuruij/demo-app/main/infrastructure/ec2-deploy.sh
bash ec2-deploy.sh
# Edit /opt/notes-app/.env with real AWS credentials + SECRET_KEY
```

#### Step 5 – Set Up SSL
```bash
# Replace with your real domain (DNS must point to EC2 IP first)
bash /opt/notes-app/infrastructure/ssl-setup.sh yourdomain.com your@email.com
```

---

## 🔑 3. IAM Configuration

**Policy file**: [`infrastructure/iam-policy.json`](infrastructure/iam-policy.json)

**Principle of Least Privilege:**
- `s3:PutObject` – upload files
- `s3:GetObject` – retrieve files
- `s3:DeleteObject` – delete files from S3
- `s3:HeadObject` – check file existence
- `s3:ListBucket` – only for `uploads/*` prefix

**Recommended for Production**: Use an **EC2 IAM Instance Profile/Role** instead of access keys. This eliminates the need to store credentials in `.env` at all.

```
IAM → Roles → Create Role
  Trusted entity: EC2
  Attach: NotesAppS3Policy (from iam-policy.json)
  Assign to EC2 instance → Instance → Security → Modify IAM Role
```

---

## 🛡️ 4. Security Group Rules

**Security Group name**: `notes-app-sg`

### Inbound Rules

| Protocol | Port | Source | Purpose |
|----------|------|--------|---------|
| TCP | 80 | 0.0.0.0/0 | HTTP |
| TCP | 443 | 0.0.0.0/0 | HTTPS |
| TCP | 22 | `175.157.18.9/32` | SSH — your IP only |

> ⚠️ **Never open port 22 to 0.0.0.0/0.** Restrict to your specific IP.

### Outbound Rules

| Protocol | Port | Destination |
|----------|------|-------------|
| All | All | 0.0.0.0/0 |

**Database**: PostgreSQL (5432) is **never exposed** – it only runs inside Docker's internal network.

---

## ☁️ 5. AWS Free Tier Setup

| Service | Free Tier Allowance | This Project |
|---------|-------------------|-------------|
| EC2 | 750 hrs/month t2.micro | 1 instance = 744 hrs ✅ |
| EBS gp3 | 30 GB | 8 GiB root volume ✅ |
| S3 Storage | 5 GB | File uploads ✅ |
| S3 PUT requests | 2,000/month | File uploads ✅ |
| S3 GET requests | 20,000/month | File views ✅ |
| Data Transfer Out | 1 GB/month | API + static files ✅ |


---

## 📂 Project Structure

```
├── backend/                    # Django REST Framework
│   ├── core/
│   │   ├── settings/
│   │   │   ├── base.py         # Shared settings
│   │   │   ├── dev.py          # Development overrides
│   │   │   └── prod.py         # Production (S3, security headers)
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── notes/                  # CRUD app
│   │   ├── models.py           # Note model
│   │   ├── serializers.py      # DRF serializer
│   │   ├── views.py            # ModelViewSet
│   │   └── urls.py             # Router
│   ├── Dockerfile              # Multi-stage Python build
│   ├── entrypoint.sh           # Wait for DB, migrate, start gunicorn
│   └── requirements.txt
├── frontend/                   # React + Vite
│   ├── src/
│   │   ├── api/notesApi.js     # Axios client
│   │   ├── components/         # NoteList, NoteCard, NoteForm
│   │   ├── App.jsx             # Root CRUD component
│   │   └── App.css             # Dark-mode styles
│   ├── Dockerfile              # Node build → Nginx serve
│   └── nginx.conf              # SPA routing
├── nginx/
│   └── nginx.conf              # Reverse proxy (HTTP)
├── infrastructure/
│   ├── iam-policy.json         # Least-privilege S3 policy
│   ├── security-groups.md      # Security group rules
│   ├── ec2-deploy.sh           # EC2 bootstrap script
│   ├── ssl-setup.sh            # Let's Encrypt automation
│   └── architecture-diagram.md # Mermaid diagram
├── docker-compose.yml          # Local development
├── docker-compose.prod.yml     # Production overrides
├── .env.example                # Template – copy to .env
├── .gitignore
└── README.md
```

---

## 🔒 Security & Production Readiness

| Requirement | Implementation |
|------------|---------------|
| No hardcoded secrets | All via `.env` / environment variables |
| Dev/Prod config separation | `settings/dev.py` vs `settings/prod.py` |
| Secure Security Groups | Only ports 80, 443 public; DB never exposed |
| Least privilege IAM | `uploads/*` prefix only |
| HTTPS | Let's Encrypt + auto-renewal cron |
| DB isolation | PostgreSQL only on Docker internal network |

---

## 📈 Scaling Strategy

### Horizontal Scaling (Future)
1. **Migrate to RDS** (Managed PostgreSQL) → Remove DB from Docker, use `DB_HOST=rds-endpoint`
2. **Auto Scaling Group** → Multiple EC2 instances behind an **Application Load Balancer (ALB)**
3. **CloudFront CDN** → S3 + CloudFront for static assets and media files
4. **ElastiCache** → Redis for Django sessions/caching

### Backup Strategy
| Data | Strategy |
|------|---------|
| PostgreSQL | `pg_dump` cron job → upload to S3; or migrate to RDS with automated backups |
| S3 uploads | Enable S3 Versioning + lifecycle rules for older versions |
| EC2 | EBS snapshots (manual or AWS Backup) |

---

## 🚀 Quick Reference

```bash
# Local: start
docker compose up --build -d

# Local: stop
docker compose down

# Local: view logs
docker compose logs -f

# Local: run migrations manually
docker compose exec backend python manage.py migrate

# Local: create superuser
docker compose exec backend python manage.py createsuperuser

# Production: deploy
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Production: check status
docker compose ps
```

---

## 🔗 API Endpoints

### Notes CRUD
| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/notes/` | List all notes |
| POST | `/api/notes/` | Create note (JSON: `title`, `description`) |
| GET | `/api/notes/{id}/` | Retrieve note |
| PATCH | `/api/notes/{id}/` | Update note |
| DELETE | `/api/notes/{id}/` | Delete note |

### S3 File Upload
| Method | URL | Description |
|--------|-----|-------------|
| POST | `/api/upload/` | Upload file to S3 → returns `{url, key, filename, size}` |
