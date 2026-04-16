import sys

with open("src/app/api/repositories/route.ts", "r") as f:
    content = f.read()

search = """export async function POST(request: Request) {
  const { owner, name, autoMergeEnabled, requiredApprovals, requireCI, mergeStrategy, taskSourceType, taskSourcePath, julesPromptTemplate, julesChatForwardMode, julesChatForwardDelay } = await request.json()"""

replace = """export async function POST(request: Request) {
  const { owner, name, autoMergeEnabled, requiredApprovals, requireCI, mergeStrategy, taskSourceType, taskSourcePath, julesPromptTemplate, julesChatForwardMode, julesChatForwardDelay, aiSystemPrompt, commentTemplate } = await request.json()"""

search2 = """        taskSourcePath: taskSourcePath || null,
        julesPromptTemplate: julesPromptTemplate || null,
        julesChatForwardMode: validJulesChatForwardMode,
        julesChatForwardDelay: parsedDelay"""

replace2 = """        taskSourcePath: taskSourcePath || null,
        julesPromptTemplate: julesPromptTemplate || null,
        julesChatForwardMode: validJulesChatForwardMode,
        julesChatForwardDelay: parsedDelay,
        aiSystemPrompt: aiSystemPrompt || null,
        commentTemplate: commentTemplate || null"""

content = content.replace(search, replace).replace(search2, replace2)

with open("src/app/api/repositories/route.ts", "w") as f:
    f.write(content)
