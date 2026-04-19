const fs = require('fs');

const filesToPatch = [
    'src/app/api/settings/route.ts',
    'src/app/api/trigger-aggregation/route.ts',
    'src/app/api/preview-aggregation/route.ts',
    'src/app/api/system/update/route.ts',
    'src/app/api/repositories/[id]/prs/route.ts',
    'src/app/api/repositories/[id]/status/route.ts',
    'src/app/api/webhooks/route.ts'
];

for (const file of filesToPatch) {
    if (fs.existsSync(file)) {
        let code = fs.readFileSync(file, 'utf8');

        if (!code.includes("import { logger }")) {
             // Add import right after the first import or at the top
             if (code.includes("import { NextRequest")) {
                 code = code.replace("import { NextRequest", "import { logger } from '@/lib/logger';\nimport { NextRequest");
             } else {
                 code = "import { logger } from '@/lib/logger';\n" + code;
             }
        }

        code = code.replace(/console\.log/g, 'logger.info');
        code = code.replace(/console\.error/g, 'logger.error');
        code = code.replace(/console\.warn/g, 'logger.warn');

        fs.writeFileSync(file, code);
        console.log(`Patched ${file}`);
    }
}
