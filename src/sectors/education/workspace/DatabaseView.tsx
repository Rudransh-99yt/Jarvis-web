import React, { useState } from 'react';
import type { WorkspaceDatabase, DatabaseItem, DatabaseProperty } from '../../../types/workspace.ts';
import {
  Table as TableIcon,
  List as ListIcon,
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Filter,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface DatabaseViewProps {
  database: WorkspaceDatabase;
  onUpdateDatabase: (updated: WorkspaceDatabase) => void;
  onOpenPage?: (pageId: string) => void;
}

export const DatabaseView: React.FC<DatabaseViewProps> = ({
  database,
  onUpdateDatabase,
  onOpenPage
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'list'>(database.defaultView || 'table');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [items, setItems] = useState<DatabaseItem[]>(database.items || []);
  const properties = database.properties || [];

  const handleAddItem = () => {
    const newItem: DatabaseItem = {
      id: `item-${Date.now()}`,
      databaseId: database.id,
      properties: {
        'prop-topic': 'New Study Topic',
        'prop-subject': 'opt-phys',
        'prop-status': 'opt-prog',
        'prop-date': '2026-10-30',
        'prop-priority': 'opt-med'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedItems = [newItem, ...items];
    setItems(updatedItems);
    onUpdateDatabase({ ...database, items: updatedItems });
  };

  const handleCellChange = (itemId: string, propId: string, value: any) => {
    const updated = items.map((it) => {
      if (it.id !== itemId) return it;
      return {
        ...it,
        properties: { ...it.properties, [propId]: value },
        updatedAt: new Date().toISOString()
      };
    });
    setItems(updated);
    onUpdateDatabase({ ...database, items: updated });
  };

  const handleDeleteItem = (itemId: string) => {
    const updated = items.filter((it) => it.id !== itemId);
    setItems(updated);
    onUpdateDatabase({ ...database, items: updated });
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    const titleVal = String(item.properties['prop-topic'] || item.properties['prop-name'] || '').toLowerCase();
    const matchesQuery = !searchQuery || titleVal.includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.properties['prop-status'] === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* 1. Database Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-3xl p-1.5 rounded-xl bg-cyan-950/60 border border-cyan-500/30">
            {database.icon || '📊'}
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {database.title}
            </h1>
            <p className="text-xs sm:text-sm text-cyan-100/70 font-mono">
              {database.description || 'Structured workspace collection'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Controls Bar: View Toggle, Filter & Add Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center p-1 rounded-lg border border-cyan-500/20 bg-black/60 text-xs font-mono">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-cyan-400/60 hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors cursor-pointer ${
                viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-cyan-400/60 hover:text-white'
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-cyan-400/50 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-2.5 py-1 bg-black/60 border border-cyan-500/20 rounded-lg text-xs font-mono text-cyan-100 placeholder-cyan-400/40 outline-none focus:border-cyan-400/50 w-36 sm:w-48"
            />
          </div>
        </div>

        <button
          onClick={handleAddItem}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-cyan-400/50 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono font-bold transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Item</span>
        </button>
      </div>

      {/* 3. Table View */}
      {viewMode === 'table' && (
        <div className="rounded-2xl border border-cyan-500/20 bg-black/50 overflow-x-auto shadow-xl">
          <table className="w-full text-xs font-mono border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b border-cyan-500/30 bg-cyan-950/40 text-cyan-300">
                <th className="p-3 text-left font-bold w-2/5">Topic / Chapter</th>
                <th className="p-3 text-left font-bold w-1/5">Course</th>
                <th className="p-3 text-left font-bold w-1/6">Status</th>
                <th className="p-3 text-left font-bold w-1/6">Target Date</th>
                <th className="p-3 text-left font-bold w-1/6">Priority</th>
                <th className="p-3 text-center w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const statusProp = properties.find((p) => p.id === 'prop-status');
                const subjectProp = properties.find((p) => p.id === 'prop-subject');
                const priorityProp = properties.find((p) => p.id === 'prop-priority');

                return (
                  <tr
                    key={item.id}
                    className="border-b border-cyan-500/10 hover:bg-cyan-950/20 transition-colors group"
                  >
                    {/* Topic Title */}
                    <td className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={item.properties['prop-topic'] || ''}
                          onChange={(e) => handleCellChange(item.id, 'prop-topic', e.target.value)}
                          className="w-full bg-transparent font-bold text-white outline-none"
                        />
                        {item.pageId && onOpenPage && (
                          <button
                            onClick={() => onOpenPage(item.pageId!)}
                            title="Open Linked Workspace Page"
                            className="text-cyan-400 hover:text-white p-1 rounded hover:bg-cyan-500/20 shrink-0"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Subject */}
                    <td className="p-3">
                      <select
                        value={item.properties['prop-subject'] || ''}
                        onChange={(e) => handleCellChange(item.id, 'prop-subject', e.target.value)}
                        className="bg-black/60 border border-cyan-500/20 rounded px-2 py-1 text-cyan-300 text-xs font-mono outline-none"
                      >
                        {subjectProp?.options?.map((opt) => (
                          <option key={opt.id} value={opt.id} className="bg-slate-900">
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Status */}
                    <td className="p-3">
                      <select
                        value={item.properties['prop-status'] || ''}
                        onChange={(e) => handleCellChange(item.id, 'prop-status', e.target.value)}
                        className="bg-black/60 border border-cyan-500/20 rounded px-2 py-1 text-cyan-200 text-xs font-mono outline-none"
                      >
                        {statusProp?.options?.map((opt) => (
                          <option key={opt.id} value={opt.id} className="bg-slate-900">
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Target Date */}
                    <td className="p-3 text-cyan-400/80">
                      <input
                        type="date"
                        value={item.properties['prop-date'] || ''}
                        onChange={(e) => handleCellChange(item.id, 'prop-date', e.target.value)}
                        className="bg-transparent border border-cyan-500/15 rounded px-1.5 py-0.5 text-xs font-mono text-cyan-300 outline-none"
                      />
                    </td>

                    {/* Priority */}
                    <td className="p-3">
                      <select
                        value={item.properties['prop-priority'] || ''}
                        onChange={(e) => handleCellChange(item.id, 'prop-priority', e.target.value)}
                        className="bg-black/60 border border-cyan-500/20 rounded px-2 py-1 text-cyan-200 text-xs font-mono outline-none"
                      >
                        {priorityProp?.options?.map((opt) => (
                          <option key={opt.id} value={opt.id} className="bg-slate-900">
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Delete Item */}
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-300 p-1 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. List View */}
      {viewMode === 'list' && (
        <div className="space-y-2.5">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl border border-cyan-500/15 bg-black/40 hover:border-cyan-500/35 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-cyan-300 font-bold">
                    {item.properties['prop-topic'] || 'Untitled'}
                  </span>
                  <span aria-hidden="true" className="text-cyan-500/40">·</span>
                  <span className="text-cyan-400/70">Due: {item.properties['prop-date']}</span>
                </div>
              </div>

              {item.pageId && onOpenPage && (
                <button
                  onClick={() => onOpenPage(item.pageId!)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono shrink-0 cursor-pointer"
                >
                  <span>Open Notes</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
