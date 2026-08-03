import express from 'express';
import crypto from 'crypto';
import * as githubWebhookController from '../controllers/github-webhook.controller.js';

const router = express.Router();

// Middleware to verify GitHub webhook signature
const verifySignature = (req, res, next) => {
    const signature = req.headers['x-hub-signature-256'];
    const secret = process.env.GITHUB_WEBHOOK_SECRET;

    if (!secret || secret === 'your_webhook_secret_here') {
        console.warn('⚠️ GITHUB_WEBHOOK_SECRET is not configured or uses the placeholder. Skipping signature verification.');
        return next();
    }

    if (!signature) {
        return res.status(401).json({ error: 'Missing GitHub signature (x-hub-signature-256)' });
    }

    if (!req.rawBody) {
        return res.status(400).json({ error: 'Missing raw request body buffer' });
    }

    try {
        const hmac = crypto.createHmac('sha256', secret);
        const digest = 'sha256=' + hmac.update(req.rawBody).digest('hex');

        if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
            return res.status(401).json({ error: 'Invalid GitHub signature verification failed' });
        }
        next();
    } catch (err) {
        console.error('Error verifying webhook signature:', err.message);
        return res.status(401).json({ error: 'Signature verification error' });
    }
};

router.post('/', verifySignature, githubWebhookController.handleWebhook);

export default router;
