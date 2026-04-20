# 1. Fix SSE route polling comment
cat << 'SSEPATCH' > patch_sse_comment.js
const fs = require('fs');
let code = fs.readFileSync('src/app/api/repositories/[id]/sse/route.ts', 'utf8');
code = code.replace("// Wait 3 seconds before polling again", "// Wait 10 seconds before polling again");
fs.writeFileSync('src/app/api/repositories/[id]/sse/route.ts', code);
SSEPATCH
node patch_sse_comment.js && rm patch_sse_comment.js

# 2. Fix worker.ts unused variables
cat << 'WORKERPATCH' > patch_worker_unused.js
const fs = require('fs');
let code = fs.readFileSync('worker.ts', 'utf8');
const search = `              // Attempt to parse line number and commit ID to post inline review comment
              let postedInline = false;
              let lineToComment: number | null = null;
              let pathToFile: string | null = null;

              // Basic heuristic: check if any of the batched comments had a path and line`;

const replace = `              // Attempt to parse line number and commit ID to post inline review comment
              let postedInline = false;

              // Basic heuristic: check if any of the batched comments had a path and line`;

code = code.replace(search, replace);
fs.writeFileSync('worker.ts', code);
WORKERPATCH
node patch_worker_unused.js && rm patch_worker_unused.js
