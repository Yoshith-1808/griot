'use client';

/**
 * @file packages/demo-client/components/MemoryTimeline.tsx
 * @description Sidebar timeline displaying 30 days of memories, people dossiers, and quick seed trigger.
 */

import type { MemoryItem } from '@griot/shared';
import React, { useState } from 'react';
import type { PersonItem } from '../lib/mcp-client.js';

interface MemoryTimelineProps {
  memories: MemoryItem[];
  people: PersonItem[];
  onSeed: () => Promise<void>;
  onSelectPerson: (name: string) => void;
  isLoadingSeed?: boolean;
}

export function MemoryTimeline({
  memories,
  people,
  onSeed,
  onSelectPerson,
  isLoadingSeed = false,
}: MemoryTimelineProps) {
  const [tab, setTab] = useState<'timeline' | 'people'>('timeline');
  const [search, setSearch] = useState('');

  const filteredMemories = memories.filter((m) =>
    m.content.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="w-full h-full flex flex-col bg-slate-950/60 backdrop-blur-xl border-l border-slate-800/60 p-4">
      {/* Header & Tabs */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex space-x-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setTab('timeline')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              tab === 'timeline'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Memories ({memories.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('people')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              tab === 'people'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            People ({people.length})
          </button>
        </div>

        <button
          type="button"
          onClick={onSeed}
          disabled={isLoadingSeed}
          className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900 transition-colors disabled:opacity-50"
        >
          {isLoadingSeed ? 'Seeding...' : 'Seed 30 Days'}
        </button>
      </div>

      {/* Search Input */}
      <div className="mt-3 mb-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter memories..."
          className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
        />
      </div>

      {/* Content Stream */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
        {tab === 'timeline' ? (
          filteredMemories.length === 0 ? (
            <div className="text-center text-xs text-slate-500 py-8">
              No memories recorded yet. Click &quot;Seed 30 Days&quot; to populate.
            </div>
          ) : (
            filteredMemories.map((m) => (
              <div
                key={m.id}
                className="bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800/60 rounded-xl p-3 transition-colors"
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span>
                    {new Date(m.occurred_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <div className="flex space-x-1">
                    {(m.metadata?.people || []).map((p) => (
                      <button
                        type="button"
                        key={p}
                        onClick={() => onSelectPerson(p)}
                        className="cursor-pointer text-violet-400 hover:text-violet-300 bg-violet-950/60 px-1.5 py-0.5 rounded border-0 text-[10px]"
                      >
                        @{p}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-200 leading-snug">{m.content}</p>
              </div>
            ))
          )
        ) : people.length === 0 ? (
          <div className="text-center text-xs text-slate-500 py-8">No people identified yet.</div>
        ) : (
          people.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => onSelectPerson(p.name)}
              className="w-full text-left cursor-pointer bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800/60 rounded-xl p-3 transition-colors flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-semibold text-slate-100">{p.name}</span>
                <p className="text-[10px] text-slate-400">
                  Last seen: {new Date(p.last_seen_at).toLocaleDateString()}
                </p>
              </div>
              <span className="text-[10px] font-mono bg-violet-950/80 text-violet-300 px-2 py-0.5 rounded-full border border-violet-800/40">
                {p.memory_count} memories
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
