import type { FC, FormEvent } from 'react';
import { useState } from 'react';
import { Check, User, Calendar, Plus, Flag, Trash2 } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';

export interface ActionItem {
  id: string;
  task: string;
  assignee?: string;
  deadline?: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
}

interface ActionItemsListProps {
  items: ActionItem[];
  onToggleItem: (id: string) => void;
  onAddItem: (task: string, assignee?: string, priority?: string) => void;
  onDeleteItem?: (id: string) => void;
}

export const ActionItemsList: FC<ActionItemsListProps> = ({
  items,
  onToggleItem,
  onAddItem,
  onDeleteItem,
}) => {
  const { hapticImpact } = useTelegram();
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [newTaskText, setNewTaskText] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const filteredItems = items.filter((item) => {
    if (filter === 'pending') return !item.completed;
    if (filter === 'completed') return item.completed;
    return true;
  });

  const handleToggle = (id: string) => {
    hapticImpact('medium');
    onToggleItem(id);
  };

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    hapticImpact('light');
    onAddItem(newTaskText.trim());
    setNewTaskText('');
    setIsAdding(false);
  };

  const getPriorityBadge = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
            <Flag className="w-2.5 h-2.5 fill-current" /> High
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
            <Flag className="w-2.5 h-2.5 fill-current" /> Med
          </span>
        );
      case 'low':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <Flag className="w-2.5 h-2.5 fill-current" /> Low
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Filter Tabs */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs">
          {(['all', 'pending', 'completed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                hapticImpact('light');
                setFilter(tab);
              }}
              className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-all ${
                filter === tab
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 px-3 py-1.5 rounded-xl transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Quick Add Form */}
      {isAdding && (
        <form onSubmit={handleCreate} className="glass-panel p-3 rounded-xl flex gap-2">
          <input
            type="text"
            placeholder="Type task description..."
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            className="flex-1 bg-slate-900/80 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            autoFocus
          />
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Save
          </button>
        </form>
      )}

      {/* Checklist items */}
      <div className="flex flex-col gap-2.5">
        {filteredItems.length === 0 ? (
          <div className="glass-panel p-8 text-center rounded-2xl text-slate-400 text-sm">
            No action items in this view.
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className={`glass-panel p-4 rounded-xl flex items-start gap-3.5 transition-all duration-200 ${
                item.completed ? 'opacity-65 border-emerald-500/20' : 'hover:border-slate-700'
              }`}
            >
              {/* Checkbox */}
              <button
                onClick={() => handleToggle(item.id)}
                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border transition-all ${
                  item.completed
                    ? 'bg-emerald-500 border-emerald-400 text-white shadow-sm shadow-emerald-500/30'
                    : 'bg-slate-900/80 border-slate-700 text-transparent hover:border-slate-500'
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </button>

              {/* Task details */}
              <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                <span
                  className={`text-sm leading-snug break-words ${
                    item.completed ? 'line-through text-slate-400' : 'text-slate-100 font-medium'
                  }`}
                >
                  {item.task}
                </span>

                {/* Metadata Pills */}
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  {getPriorityBadge(item.priority)}

                  {item.assignee && (
                    <span className="text-[11px] text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-md flex items-center gap-1 border border-slate-700/60">
                      <User className="w-3 h-3 text-slate-400" />
                      {item.assignee}
                    </span>
                  )}

                  {item.deadline && (
                    <span className="text-[11px] text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-md flex items-center gap-1 border border-slate-700/60">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {item.deadline}
                    </span>
                  )}
                </div>
              </div>

              {onDeleteItem && (
                <button
                  onClick={() => onDeleteItem(item.id)}
                  className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors opacity-0 hover:opacity-100 focus:opacity-100"
                  title="Delete task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
