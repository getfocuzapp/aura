// Vercel serverless function — keeps the real Discord webhook URL server-side
// only, never shipped to the browser. Set DISCORD_WEBHOOK_URL as an
// Environment Variable in the Vercel project settings (not in this file, and
// never committed to the repo).
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
        return res.status(500).json({ error: 'Webhook not configured' });
    }

    // This endpoint's own URL is necessarily public (any page calling it reveals
    // it in network requests), so unlike the raw webhook it's protecting, it has
    // no secret to hide — the real defense here is this shape check, which stops
    // it being usable as a generic "post anything to our Discord" relay even
    // though it will always be publicly callable.
    const body = req.body;
    if (!body || !Array.isArray(body.embeds) || body.embeds.length !== 1) {
        return res.status(400).json({ error: 'Invalid payload' });
    }
    const embed = body.embeds[0];
    if (typeof embed.title !== 'string' || embed.title.length > 200 || !Array.isArray(embed.fields)) {
        return res.status(400).json({ error: 'Invalid embed' });
    }

    try {
        const discordRes = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        return res.status(discordRes.ok ? 200 : 502).json({ ok: discordRes.ok });
    } catch (e) {
        return res.status(500).json({ error: 'Failed to reach Discord' });
    }
}
