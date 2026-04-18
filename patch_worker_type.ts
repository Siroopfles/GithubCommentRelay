import * as fs from 'fs';

let content = fs.readFileSync('worker.ts', 'utf8');

content = content.replace("let contextFiles = null;", "let contextFiles: string | null = null;");

fs.writeFileSync('worker.ts', content);
