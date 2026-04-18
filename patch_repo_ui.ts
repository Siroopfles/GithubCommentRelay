import * as fs from 'fs';

let content = fs.readFileSync('src/app/repositories/page.tsx', 'utf8');

const interfaceRegex = /interface Repository \{([\s\S]*?)julesPromptTemplate\?: string\n/m;
content = content.replace(interfaceRegex, `interface Repository {\n$1maxConcurrentTasks: number\n  julesPromptTemplate?: string\n`);

const repoDataRegex = /julesPromptTemplate\?: string\n    julesChatForwardMode: string\n    julesChatForwardDelay: number\n\}/g;
content = content.replace(repoDataRegex, `maxConcurrentTasks: number\n    julesPromptTemplate?: string\n    julesChatForwardMode: string\n    julesChatForwardDelay: number\n}`);

const addSaveRegex = /taskSourcePath: data\.taskSourcePath,\n          julesPromptTemplate: data\.julesPromptTemplate,/;
content = content.replace(addSaveRegex, `taskSourcePath: data.taskSourcePath,\n          maxConcurrentTasks: data.maxConcurrentTasks,\n          julesPromptTemplate: data.julesPromptTemplate,`);

const editModalSetRegex = /setValueEdit\("taskSourcePath", repo\.taskSourcePath \|\| ""\)/;
content = content.replace(editModalSetRegex, `setValueEdit("taskSourcePath", repo.taskSourcePath || "")\n    setValueEdit("maxConcurrentTasks", repo.maxConcurrentTasks)`);

const addFormHtmlRegex = /<div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200 dark:border-gray-700">/;
const maxConcurrentHtml = `            <div className="mb-4">
              <label htmlFor="maxConcurrentTasks" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Max Concurrent Tasks</label>
              <input id="maxConcurrentTasks" type="number" min="1" {...register("maxConcurrentTasks", { valueAsNumber: true, value: 3 })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md" />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Limits how many tasks AI can run simultaneously.</p>
            </div>
`;
content = content.replace(addFormHtmlRegex, maxConcurrentHtml + '\n<div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200 dark:border-gray-700">');


const editFormHtmlRegex = /<td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">/;
const maxConcurrentEditHtml = `                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Max Concurrent Tasks</label>
                          <input type="number" min="1" {...registerEdit("maxConcurrentTasks", { valueAsNumber: true })} className="w-full px-2 py-1 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded" />
                        </div>
`;
content = content.replace(editFormHtmlRegex, `<td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">\n${maxConcurrentEditHtml}`);


fs.writeFileSync('src/app/repositories/page.tsx', content);
