import sys

with open("src/app/api/repositories/[id]/route.ts", "r") as f:
    content = f.read()

search = """    if (json.julesChatForwardDelay !== undefined) {
      const delay = parseInt(json.julesChatForwardDelay, 10)
      if (isNaN(delay) || delay < 0) {
        return NextResponse.json({ error: "julesChatForwardDelay must be a non-negative number" }, { status: 400 })
      }
      updateData.julesChatForwardDelay = delay
    }"""

replace = """    if (json.julesChatForwardDelay !== undefined) {
      const delay = parseInt(json.julesChatForwardDelay, 10)
      if (isNaN(delay) || delay < 0) {
        return NextResponse.json({ error: "julesChatForwardDelay must be a non-negative number" }, { status: 400 })
      }
      updateData.julesChatForwardDelay = delay
    }

    if (json.aiSystemPrompt !== undefined) {
      updateData.aiSystemPrompt = json.aiSystemPrompt === "" ? null : json.aiSystemPrompt
    }

    if (json.commentTemplate !== undefined) {
      updateData.commentTemplate = json.commentTemplate === "" ? null : json.commentTemplate
    }"""

content = content.replace(search, replace)

with open("src/app/api/repositories/[id]/route.ts", "w") as f:
    f.write(content)
