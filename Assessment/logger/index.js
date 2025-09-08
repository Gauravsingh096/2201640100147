const { postJSON } = require('./httpClient');

const API_URL = 'http://20.244.56.144/evaluation-service/logs';

const VALID_STACK = new Set(['backend', 'frontend']);
const VALID_LEVEL = new Set(['debug', 'info', 'warn', 'error', 'fatal']);
const VALID_PACKAGE = new Set([
    // backend 
    'cache',
    'controller',
    'cron_job',
    'db',
    'domain',
    'handler',
    'repository',
    'route',
    'service',
    // frontend 
    'api',
    'component',
    'hook',
    'page',
    'state',
    'style',
    // shared
    'auth',
    'config',
    'middleware',
    'utils'
]);

function validateInput(stack, level, pkg, message) {
    if (!VALID_STACK.has(stack)) throw new Error('Invalid stack');
    if (!VALID_LEVEL.has(level)) throw new Error('Invalid level');
    if (!VALID_PACKAGE.has(pkg)) throw new Error('Invalid package');
    if (typeof message !== 'string' || message.trim() === '') {
        throw new Error('Message must be a non-empty string');
    }
}

function loadEnvIfNeeded() {
    if (process.env.access_token) return;
    try {
        const fs = require('fs');
        const path = require('path');
        const envPath = path.resolve(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf8');
            for (const line of content.split(/\r?\n/)) {
                if (!line || line.trim().startsWith('#')) continue;
                const idx = line.indexOf('=');
                if (idx === -1) continue;
                const key = line.slice(0, idx).trim();
                let val = line.slice(idx + 1).trim().replace(/^"|"$/g, '');
                if (val.endsWith(',')) val = val.slice(0, -1).trim();
                if (/^<.*>$/.test(val)) {
                    val = val.slice(1, -1);
                }
                if ((key === 'access_token') && val && !/^Bearer\s+/.test(val)) {
                    val = `Bearer ${val}`;
                }
                if (!(key in process.env)) process.env[key] = val;
            }
        }
    } catch (_) { /* no-op if .env not present */ }
}

async function log(stack, level, pkg, message) {
    loadEnvIfNeeded();
    validateInput(stack, level, pkg, message);
    const body = { stack, level, package: pkg, message };
    const tokenRaw = process.env.LOG_AUTH || process.env.access_token || process.env.ACCESS_TOKEN;
    const token = tokenRaw && !/^Bearer\s+/.test(tokenRaw) ? `Bearer ${tokenRaw}` : tokenRaw;
    const authHeader = token ? { Authorization: token } : {};
    return postJSON(API_URL, body, authHeader);
}

function expressLogger(stack, level, pkg) {
    return async function (req, res, next) {
        try {
            await log(stack, level, pkg, `${req.method} ${req.originalUrl}`);
        } catch (_) {
            
        }
        next();
    };
}

module.exports = { log, expressLogger };



