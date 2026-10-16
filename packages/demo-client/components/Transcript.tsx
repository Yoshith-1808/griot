'use client';

/**
 * @file packages/demo-client/components/Transcript.tsx
 * @description Live conversation transcript displaying conversational bubbles and MCP tool invocations.
 */

import type { ChatDialogMessage } from '@griot/shared';
import React, { useEffect, useRef } from 'react';

interface TranscriptProps {
  messages: ChatDialogMessage[];
}

export function Transcript({ messages }: TranscriptProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  });

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col space-y-3 px-4 py-2 overflow-y-auto max-h-[300px] scrollbar-thin">
      {messages.length === 0 && (
        <div className="text-center text-xs text-slate-500 py-6 italic">
          Try saying: &quot;Alexa, what is David allergic to?&quot; or &quot;Remember that Mom loves
          chamomile tea.&quot;
        </div>
      )}

      {messages.map((msg) => {
        const isUser = msg.sender === 'user';
        return (
          <div
            key={msg.id}
            className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-200`}
          >
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {isUser ? 'You' : 'Alexa+ (Griot)'}
              </span>
              {msg.toolUsed && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-950/80 text-violet-300 border border-violet-800/50 font-mono">
                  MCP: {msg.toolUsed}
                </span>
              )}
            </div>

            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                isUser
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-br-none'
                  : 'bg-slate-900/90 text-slate-100 border border-slate-800/80 rounded-bl-none'
              }`}
            >
              {msg.text}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
