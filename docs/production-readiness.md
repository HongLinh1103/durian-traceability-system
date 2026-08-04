# Production readiness

## Environments

Maintain separate development, staging, and production resources. Each environment must have its own database, storage, domain, accounts, and secrets. Never copy production personal data into staging.

## Required environment variables

- `DATABASE_URL`: PostgreSQL connection with SSL and pooling where supported.
- `NEXTAUTH_URL`: canonical HTTPS application URL.
- `NEXTAUTH_SECRET`: long random secret for NextAuth.
- `AUTH_JWT_SECRET`: separate long random secret for the custom login token.
- `CRON_SECRET`: bearer secret used by the scheduler.

Call the reminder job with `Authorization: Bearer <CRON_SECRET>`. An authenticated Admin may also run it from the management screen.

## Release workflow

1. Create and commit a Prisma migration in development.
2. Deploy to staging and run `npm run prisma:migrate:deploy`.
3. Run smoke tests for authentication, permissions, uploads, notifications, farming logs, and QR lookup.
4. Back up production and verify the recovery procedure.
5. Run `npm run prisma:migrate:deploy` against production.
6. Deploy the immutable application image.
7. Check `/api/health`, login, and one public QR lookup.

This repository currently has no committed `prisma/migrations` baseline. Create and validate the baseline against the existing database before enabling automated production migrations.

## Storage blocker

Documents and application identity files currently use local `.storage`; farming-log images are stored as database data URLs. These approaches are not suitable for serverless or multi-instance production. Introduce an S3-compatible storage adapter before accepting real identity documents. Keep identity documents private and serve them only through short-lived signed URLs after authorization.

## Operational checklist

- Enforce HTTPS and rotate all seed passwords and secrets.
- Configure managed PostgreSQL backups and perform a restore drill.
- Use a persistent distributed rate limiter for multi-instance deployments; the repository limiter is only a single-instance safety baseline.
- Add external error tracking and structured logs without passwords, tokens, CCCD numbers, or private file URLs.
- Monitor `/api/health`, database connections, cron failures, storage usage, and HTTP error rates.
- Define the support owner, incident process, RPO, RTO, and account recovery process.
- Obtain a legal review for privacy notices, consent, retention, deletion, and handling of personal data before collecting real CCCD documents.

