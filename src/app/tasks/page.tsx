'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, GripVertical, AlertCircle, GitPullRequest, Trash2, Edit2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

type Task = {
  id: string;
  repositoryId: string;
  title: string;
  body: string | null;
  status: string;
  source: string;
  priority: number;
  githubIssueNumber: number | null;
  julesSessionId: string | null;
  prNumber: number | null;
  dependsOnId?: string | null;
};

type Repository = {
  id: string;
  owner: string;
  name: string;
  maxConcurrentTasks: number;
};

const COLUMNS = [
  { id: 'backlog', title: 'Backlog', color: 'bg-gray-100 dark:bg-gray-800' },
  { id: 'todo', title: 'To Do', color: 'bg-blue-50 dark:bg-blue-900/20' },
  { id: 'in_progress', title: 'In Progress (Jules)', color: 'bg-purple-50 dark:bg-purple-900/20' },
  { id: 'in_review', title: 'In Review (PR)', color: 'bg-yellow-50 dark:bg-yellow-900/20' },
  { id: 'blocked', title: 'Blocked', color: 'bg-red-50 dark:bg-red-900/20' },
  { id: 'done', title: 'Done', color: 'bg-green-50 dark:bg-green-900/20' },
];

export default function TasksPage() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const { register, handleSubmit, reset, setValue } = useForm();

  useEffect(() => {
    fetch('/api/repositories')
      .then(res => res.json())
      .then(data => {
        setRepositories(data);
        if (data.length > 0 && !selectedRepo) {
          setSelectedRepo(data[0].id);
        }
      });
  }, []);

  useEffect(() => {
    if (selectedRepo) {
      fetchTasks();
    }
  }, [selectedRepo]);

  const fetchTasks = async () => {
    if (!selectedRepo) return;
    const res = await fetch(`/api/tasks?repositoryId=${selectedRepo}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        setTasks(data);
      }
    } else {
      console.error('Failed to fetch tasks');
    }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const task = tasks.find(t => t.id === draggableId);
    if (task && task.dependsOnId) {
       const dependency = tasks.find(t => t.id === task.dependsOnId);
       const gatedTargets = ['todo', 'in_progress', 'in_review', 'done'];
       if ((!dependency || dependency.status !== 'done') && gatedTargets.includes(destination.droppableId)) {
           alert('Cannot move this task because its dependency is missing or not done.');
           return;
       }
    }



    // Optimistic UI update
    const sourceColTasks = tasks.filter(t => t.status === source.droppableId).sort((a, b) => b.priority - a.priority);
    const destColTasks = source.droppableId === destination.droppableId
      ? sourceColTasks
      : tasks.filter(t => t.status === destination.droppableId).sort((a, b) => b.priority - a.priority);

    const movedTask = tasks.find(t => t.id === draggableId)!;

    // Update local state first
    const updatedTasks = tasks.map(t => {
      if (t.id === draggableId) {
        return { ...t, status: destination.droppableId };
      }
      return t;
    });

    // We also need to update priorities to reflect the new order.
    // A simple way is to reassign priorities based on the new index within the column.
    // Higher priority = lower index (top of the list).

    setTasks(updatedTasks);

    try {
      await fetch(`/api/tasks/${draggableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: destination.droppableId,
          // We'd ideally send the new priority here based on sibling positions,
          // but for now, moving between columns is the primary function.
        })
      });
      // Optionally fetchTasks() to ensure perfect sync
    } catch (e) {
      console.error(e);
      fetchTasks(); // revert on error
    }
  };

  const onSubmitTask = async (data: any) => {
    const payload = {
      ...data,
      repositoryId: selectedRepo,
      priority: parseInt(data.priority || '0', 10)
    };

    const url = editingTask ? `/api/tasks/${editingTask.id}` : '/api/tasks';
    const method = editingTask ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setEditingTask(null);
        reset();
        fetchTasks();
      } else {
        throw new Error('Failed to save task');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete task');
      fetchTasks();
    } catch (e) {
      console.error(e);
    }
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setValue('title', task.title);
    setValue('body', task.body || '');
    setValue('status', task.status);
    setValue('priority', task.priority);
    setValue('dependsOnId', task.dependsOnId || '');
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Tasks</h1>
        <div className="flex gap-4">
          {repositories.find(r => r.id === selectedRepo)?.maxConcurrentTasks === 0 && (
            <span className="flex items-center px-3 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-md border border-amber-200">
              Worker paused
            </span>
          )}
          <select
            value={selectedRepo}
            onChange={(e) => setSelectedRepo(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            {repositories.map(repo => (
              <option key={repo.id} value={repo.id}>{repo.owner}/{repo.name}</option>
            ))}
          </select>
          <button
            onClick={() => { reset(); setEditingTask(null); setIsModalOpen(true); }}
            disabled={!selectedRepo}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
          >
            <Plus size={18} /> Add Task
          </button>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-200px)]">
        <DragDropContext onDragEnd={onDragEnd}>
          {COLUMNS.map(column => {
            const columnTasks = tasks
              .filter(t => t.status === column.id)
              .sort((a, b) => b.priority - a.priority);

            return (
              <div key={column.id} className={`flex-shrink-0 w-80 rounded-xl flex flex-col ${column.color} border border-gray-200 dark:border-gray-700/50`}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700/50 flex justify-between items-center bg-white/50 dark:bg-gray-900/50 rounded-t-xl">
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300">{column.title}</h3>
                  <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-1 rounded-full font-medium">
                    {columnTasks.length}
                  </span>
                </div>
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`flex-1 p-3 overflow-y-auto ${snapshot.isDraggingOver ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                    >
                      {columnTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`mb-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm group ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500' : ''}`}
                            >
                              <div className="flex items-start gap-2">
                                <div {...provided.dragHandleProps} className="text-gray-400 mt-1 cursor-grab hover:text-gray-600">
                                  <GripVertical size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start">
                                    <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate pr-2" title={task.title}>
                                      {task.title}
                                    </h4>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => openEditModal(task)} className="text-gray-400 hover:text-blue-500"><Edit2 size={14}/></button>
                                      <button onClick={() => deleteTask(task.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                                    </div>
                                  </div>
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {task.source === 'github_issue' && (
                                      <span className="inline-flex items-center gap-1 text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">
                                        Issue #{task.githubIssueNumber}
                                      </span>
                                    )}
                                    {task.prNumber && (
                                      <span className="inline-flex items-center gap-1 text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                                        <GitPullRequest size={10} /> PR #{task.prNumber}
                                      </span>
                                    )}
                                    {task.priority > 0 && (
                                      <span className="inline-flex items-center gap-1 text-[10px] bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded">
                                        <AlertCircle size={10} /> Prio: {task.priority}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </DragDropContext>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-200 dark:border-gray-700 shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              {editingTask ? 'Edit Task' : 'Create Task'}
            </h2>
            <form onSubmit={handleSubmit(onSubmitTask)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input {...register('title', { required: true })} className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea {...register('body')} rows={3} className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Depends On (Blocker)</label>
                  <select {...register('dependsOnId')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black dark:text-gray-100">
                    <option value="">None</option>
                    {tasks.filter(t => t.id !== editingTask?.id).map(t => (
                      <option key={t.id} value={t.id}>{t.title} ({t.status})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select {...register('status')} className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600">
                    {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                  <input type="number" {...register('priority')} defaultValue="0" className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
