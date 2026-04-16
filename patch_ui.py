import sys

with open("src/app/repositories/page.tsx", "r") as f:
    content = f.read()

# Fix types
search1 = """  julesChatForwardMode: string
  julesChatForwardDelay: number"""
replace1 = """  julesChatForwardMode: string
  julesChatForwardDelay: number
  aiSystemPrompt?: string | null
  commentTemplate?: string | null"""

# Fix Create form data payload
search2 = """          julesPromptTemplate: data.julesPromptTemplate,
          julesChatForwardMode: data.julesChatForwardMode,
          julesChatForwardDelay: Number(data.julesChatForwardDelay)"""
replace2 = """          julesPromptTemplate: data.julesPromptTemplate,
          julesChatForwardMode: data.julesChatForwardMode,
          julesChatForwardDelay: Number(data.julesChatForwardDelay),
          aiSystemPrompt: data.aiSystemPrompt,
          commentTemplate: data.commentTemplate"""

# Fix Edit form data payload
search3 = """          julesPromptTemplate: editData.julesPromptTemplate,
          julesChatForwardMode: editData.julesChatForwardMode,
          julesChatForwardDelay: Number(editData.julesChatForwardDelay)"""
replace3 = """          julesPromptTemplate: editData.julesPromptTemplate,
          julesChatForwardMode: editData.julesChatForwardMode,
          julesChatForwardDelay: Number(editData.julesChatForwardDelay),
          aiSystemPrompt: editData.aiSystemPrompt,
          commentTemplate: editData.commentTemplate"""

# Add to create form UI
search4 = """            <label htmlFor="julesChatForwardDelay" className="block text-sm font-medium text-gray-700 mb-2">Jules Chat Forward Delay (mins)</label>
            <input type="number" id="julesChatForwardDelay" {...register("julesChatForwardDelay")} className="w-full px-4 py-2 border border-gray-300 rounded-md" min="0" />
          </div>
        </div>"""
replace4 = """            <label htmlFor="julesChatForwardDelay" className="block text-sm font-medium text-gray-700 mb-2">Jules Chat Forward Delay (mins)</label>
            <input type="number" id="julesChatForwardDelay" {...register("julesChatForwardDelay")} className="w-full px-4 py-2 border border-gray-300 rounded-md" min="0" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="aiSystemPrompt" className="block text-sm font-medium text-gray-700 mb-2">AI System Prompt (Optional)</label>
            <textarea id="aiSystemPrompt" {...register("aiSystemPrompt")} placeholder="E.g. @ai-agent, analyze this..." className="w-full px-4 py-2 border border-gray-300 rounded-md" rows={3}></textarea>
          </div>
          <div>
            <label htmlFor="commentTemplate" className="block text-sm font-medium text-gray-700 mb-2">Comment Template (Optional)</label>
            <textarea id="commentTemplate" {...register("commentTemplate")} placeholder="Markdown template, use {{bot_name}} and {{body}}" className="w-full px-4 py-2 border border-gray-300 rounded-md" rows={3}></textarea>
          </div>
        </div>"""

# Add to edit form UI
search5 = """                          <input type="number" id="editJulesChatForwardDelay" {...registerEdit("julesChatForwardDelay")} className="w-full px-2 py-1 border rounded" min="0" />
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">"""
replace5 = """                          <input type="number" id="editJulesChatForwardDelay" {...registerEdit("julesChatForwardDelay")} className="w-full px-2 py-1 border rounded" min="0" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <label htmlFor="editAiSystemPrompt" className="block text-xs text-gray-500 mb-1">AI System Prompt</label>
                          <textarea id="editAiSystemPrompt" {...registerEdit("aiSystemPrompt")} className="w-full px-2 py-1 border rounded" rows={2}></textarea>
                        </div>
                        <div>
                          <label htmlFor="editCommentTemplate" className="block text-xs text-gray-500 mb-1">Comment Template</label>
                          <textarea id="editCommentTemplate" {...registerEdit("commentTemplate")} className="w-full px-2 py-1 border rounded" rows={2}></textarea>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">"""

# Reset form handling
search6 = """      reset({ owner: '', name: '', autoMergeEnabled: false, requiredApprovals: 1, requireCI: true, mergeStrategy: 'merge', taskSourceType: 'none', taskSourcePath: '', julesPromptTemplate: '', julesChatForwardMode: 'off', julesChatForwardDelay: 5 })"""
replace6 = """      reset({ owner: '', name: '', autoMergeEnabled: false, requiredApprovals: 1, requireCI: true, mergeStrategy: 'merge', taskSourceType: 'none', taskSourcePath: '', julesPromptTemplate: '', julesChatForwardMode: 'off', julesChatForwardDelay: 5, aiSystemPrompt: '', commentTemplate: '' })"""

# Initializing edit form correctly
search7 = """                        onClick={() => {
                          setEditingId(repo.id)
                          resetEdit({
                            isActive: repo.isActive,
                            autoMergeEnabled: repo.autoMergeEnabled,
                            requiredApprovals: repo.requiredApprovals,
                            requireCI: repo.requireCI,
                            mergeStrategy: repo.mergeStrategy,
                            taskSourceType: repo.taskSourceType,
                            taskSourcePath: repo.taskSourcePath || '',
                            julesPromptTemplate: repo.julesPromptTemplate || '',
                            julesChatForwardMode: repo.julesChatForwardMode,
                            julesChatForwardDelay: repo.julesChatForwardDelay
                          })
                        }}"""
replace7 = """                        onClick={() => {
                          setEditingId(repo.id)
                          resetEdit({
                            isActive: repo.isActive,
                            autoMergeEnabled: repo.autoMergeEnabled,
                            requiredApprovals: repo.requiredApprovals,
                            requireCI: repo.requireCI,
                            mergeStrategy: repo.mergeStrategy,
                            taskSourceType: repo.taskSourceType,
                            taskSourcePath: repo.taskSourcePath || '',
                            julesPromptTemplate: repo.julesPromptTemplate || '',
                            julesChatForwardMode: repo.julesChatForwardMode,
                            julesChatForwardDelay: repo.julesChatForwardDelay,
                            aiSystemPrompt: repo.aiSystemPrompt || '',
                            commentTemplate: repo.commentTemplate || ''
                          })
                        }}"""

content = content.replace(search1, replace1).replace(search2, replace2).replace(search3, replace3).replace(search4, replace4).replace(search5, replace5).replace(search6, replace6).replace(search7, replace7)

with open("src/app/repositories/page.tsx", "w") as f:
    f.write(content)
