// Run a read-only plan first. --apply inserts missing users, never updates users.
const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const { loadEnvConfig } = require('@next/env');
const { parseEnv } = require('node:util');

function planTransfer(sourceUsers, targetUsers) {
    const missing = [];
    let existing = 0;
    let credentialsDiffer = 0;
    for (const user of sourceUsers) {
        const matches = targetUsers.filter(target => target.id === user.id || target.phone === user.phone ||
            (user.email && target.email && target.email.toLowerCase() === user.email.toLowerCase()));
        if (matches.length > 1) throw new Error('Conflicting account identifiers in target database. No accounts imported.');
        if (matches.length === 0) {
            missing.push(user);
            continue;
        }
        const target = matches[0];
        if (target.id === user.id && target.phone !== user.phone &&
            !(user.email && target.email && user.email.toLowerCase() === target.email.toLowerCase())) {
            throw new Error('Account ID belongs to a different target identity. No accounts imported.');
        }
        existing++;
        if (target.password !== user.password) credentialsDiffer++;
    }
    return { missing, existing, credentialsDiffer };
}

function transferConnectionUrl(value) {
    const url = new URL(value);
    if (url.protocol === 'postgres:' || url.protocol === 'postgresql:') {
        url.searchParams.set('connection_limit', '1');
        if (!url.searchParams.has('connect_timeout')) url.searchParams.set('connect_timeout', '30');
        if (!url.searchParams.has('pool_timeout')) url.searchParams.set('pool_timeout', '30');
    }
    return url.toString();
}

async function main() {
    loadEnvConfig(process.cwd(), true);
    const targetFile = path.resolve('.env.production.local');
    if (!fs.existsSync(targetFile)) throw new Error('Missing .env.production.local. Pull production configuration before transferring accounts.');
    const targetUrl = parseEnv(fs.readFileSync(targetFile, 'utf8')).DATABASE_URL;
    const sourceUrl = process.env.DATABASE_URL;
    if (!sourceUrl || !targetUrl) throw new Error('Both local and production DATABASE_URL are required.');
    if (sourceUrl === targetUrl) throw new Error('Source and target database URLs must differ.');
    const source = new PrismaClient({ datasources: { db: { url: transferConnectionUrl(sourceUrl) } } });
    const target = new PrismaClient({ datasources: { db: { url: transferConnectionUrl(targetUrl) } } });
    try {
        const accountFields = {
            id: true, phone: true, email: true, password: true, fullName: true, role: true,
            isApproved: true, isLocked: true, accountStatus: true, deletedAt: true,
            approvedAt: true, createdAt: true, updatedAt: true, failedAttempts: true,
            lockUntil: true, lastLoginAt: true, passwordUpdatedAt: true,
        };
        const users = await source.user.findMany({ select: accountFields, orderBy: { id: 'asc' } });
        const apply = process.argv.includes('--apply');
        const summary = await target.$transaction(async tx => {
            const targetUsers = await tx.user.findMany({ select: { ...accountFields, identityNumber: true } });
            const plan = planTransfer(users, targetUsers);
            let created = 0;
            if (apply && plan.missing.length) {
                const result = await tx.user.createMany({ data: plan.missing });
                created = result.count;
                const imported = await tx.user.findMany({ select: accountFields, where: { id: { in: plan.missing.map(user => user.id) } } });
                if (imported.length !== plan.missing.length || imported.some(user => {
                    const original = plan.missing.find(row => row.id === user.id);
                    return user.password !== original.password || user.isApproved !== original.isApproved ||
                        user.isLocked !== original.isLocked || user.role !== original.role ||
                        String(user.deletedAt) !== String(original.deletedAt);
                })) throw new Error('Imported account verification failed; transaction rolled back.');
            }
            return {
                mode: apply ? 'apply' : 'dry-run', sourceAccounts: users.length,
                targetAccountsBefore: targetUsers.length, missing: plan.missing.length,
                existingUnchanged: plan.existing, existingWithDifferentPasswordHash: plan.credentialsDiffer,
                created, lockedSourceAccounts: users.filter(user => user.isLocked).length,
            };
        }, { isolationLevel: 'Serializable', timeout: 60000 });
        console.log(JSON.stringify(summary, null, 2));
    } finally {
        await Promise.allSettled([source.$disconnect(), target.$disconnect()]);
    }
}

if (require.main === module) main().catch(error => {
    // Prisma error messages may contain query parameters or connection details.
    console.error('Account transfer failed:', error.code || (error.constructor === Error ? error.message : error.name));
    if (error.meta?.column) console.error('Missing column:', error.meta.column);
    if (error.meta?.table) console.error('Missing table:', error.meta.table);
    process.exitCode = 1;
});
module.exports = { planTransfer };
