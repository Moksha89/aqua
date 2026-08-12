# Deployment

The app runs as four containers (Postgres, Redis, MinIO, API, Next.js web) behind nginx on
the host. nginx serves the web app on `/` and proxies `/api` to the API.

## First run

```bash
sudo apt-get install -y nginx
# install Docker Engine + compose plugin from get.docker.com

git clone https://github.com/Moksha89/aqua.git /opt/aqua
cd /opt/aqua
cp deploy/.env.example .env      # fill in POSTGRES_PASSWORD, JWT_SECRET, S3_* and PUBLIC_ORIGIN
sudo cp deploy/nginx/aqua.conf /etc/nginx/sites-available/aqua
sudo ln -sf /etc/nginx/sites-available/aqua /etc/nginx/sites-enabled/aqua
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

docker compose --env-file .env -f deploy/docker-compose.prod.yml up -d --build
docker compose --env-file .env -f deploy/docker-compose.prod.yml run --rm api pnpm exec prisma migrate deploy
```

For staging-only manual testing, `DEV_LOGIN_OTP` may be set to a non-empty fixed
OTP value. The value is accepted only for an unconsumed, unexpired login
challenge and all normal challenge attempt/consumption checks still apply. The
API logs a loud warning when this switch is enabled. **Never set
`DEV_LOGIN_OTP` in production**; leave it unset for production and CI.

`deploy/staging-seed.cjs` is a **staging-only fixture reset**, not a production
data migration. The API image carries this script solely so a maintainer can
run the one-off reset command below; it is not invoked by the API and never
runs automatically on boot:

```bash
docker compose --env-file .env -f deploy/docker-compose.prod.yml run --rm api \
  node /repo/deploy/staging-seed.cjs
```

Each run is intentionally destructive within the single staging business
named `Demo Aqua Farm`: it resets mutable demo records and restores the seeded
active crops and financial figures. **Do not run this command against a
production business, expose it through an application request path, or add it
to container startup.**

## Updating

```bash
cd /opt/aqua && git pull
docker compose --env-file .env -f deploy/docker-compose.prod.yml up -d --build
docker compose --env-file .env -f deploy/docker-compose.prod.yml run --rm api pnpm exec prisma migrate deploy
```

Secrets live only in `/opt/aqua/.env` on the server; `.env` is git-ignored.
