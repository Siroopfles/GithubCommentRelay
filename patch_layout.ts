import * as fs from 'fs';

let content = fs.readFileSync('src/app/layout.tsx', 'utf8');

if (!content.includes('ListTodo')) {
    content = content.replace(
        "import { Settings, GitBranch, Users, Activity, FileText } from 'lucide-react'",
        "import { Settings, GitBranch, Users, Activity, FileText, ListTodo } from 'lucide-react'"
    );
}

if (!content.includes('href="/tasks"')) {
    const replacement = `<Link href="/tasks" className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  <ListTodo size={20} />
                  Tasks
                </Link>
                <Link href="/repositories"`;

    content = content.replace('<Link href="/repositories"', replacement);
}

fs.writeFileSync('src/app/layout.tsx', content);
