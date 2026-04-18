import * as fs from 'fs';

let content = fs.readFileSync('src/app/repositories/page.tsx', 'utf8');

const regex = /type Repo = \{([\s\S]*?)julesPromptTemplate\?: string/m;
content = content.replace(regex, `type Repo = {$1maxConcurrentTasks: number\n  julesPromptTemplate?: string`);

fs.writeFileSync('src/app/repositories/page.tsx', content);
