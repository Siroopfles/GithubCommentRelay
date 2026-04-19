const fs = require('fs');
let code = fs.readFileSync('src/app/api/webhooks/route.ts', 'utf8');

code = code.replace(
  '// We skip HMAC verify if webhookSecret is missing for local Proxmox setups\n    // In production, you would uncomment this.',
  `if (settings?.webhookSecret) {
        if (!signature) {
             return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }
        const expected = 'sha256=' + crypto.createHmac('sha256', settings.webhookSecret).update(rawBody).digest('hex');
        const a = Buffer.from(signature);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
             return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }
    }`
);

fs.writeFileSync('src/app/api/webhooks/route.ts', code);
