import * as fs from 'fs';

let content = fs.readFileSync('src/app/api/repositories/[id]/route.ts', 'utf8');

const replacement = `    if (json.taskSourceType !== undefined) {
      if (!["none", "local_folder", "github_issues"].includes(json.taskSourceType)) {
        return NextResponse.json({ error: "Invalid taskSourceType" }, { status: 400 })
      }
      updateData.taskSourceType = json.taskSourceType
    }
    if (json.taskSourcePath !== undefined) {
      updateData.taskSourcePath = json.taskSourcePath === "" ? null : json.taskSourcePath
    }
    if (json.maxConcurrentTasks !== undefined) {
      const maxConcurrent = parseInt(json.maxConcurrentTasks, 10)
      if (isNaN(maxConcurrent) || maxConcurrent < 0) {
        return NextResponse.json({ error: "maxConcurrentTasks must be a non-negative number" }, { status: 400 })
      }
      updateData.maxConcurrentTasks = maxConcurrent
    }`;

content = content.replace(/    if \(json\.taskSourceType !== undefined\) \{[\s\S]*?if \(json\.taskSourcePath !== undefined\) \{\s*updateData\.taskSourcePath = json\.taskSourcePath === "" \? null : json\.taskSourcePath\s*\}/, replacement);

fs.writeFileSync('src/app/api/repositories/[id]/route.ts', content);
