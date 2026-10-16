'use client';

/**
 * @file packages/demo-client/app/page.tsx
 * @description Main voice conversational interface for the simulated Alexa+ client.
 * Integrates Web Speech API (SpeechRecognition + SpeechSynthesis) with VoiceOrb and MCP Server.
 */

import type { ChatDialogMessage, MemoryItem, VoiceOrbState } from '@griot/shared';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MemoryTimeline } from '../components/MemoryTimeline';
import { Transcript } from '../components/Transcript';
import { VoiceOrb } from '../components/VoiceOrb';
import {
  type PersonItem,
  getMemories,
  getPeople,
  seedDemoMemories,
  sendVoiceTranscript,
} from '../lib/mcp-client';

interface ISpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => ISpeechRecognition;
    webkitSpeechRecognition?: new () => ISpeechRecognition;
  }
}

export default function Home() {
  const [voiceState, setVoiceState] = useState<VoiceOrbState>('idle');
  const [messages, setMessages] = useState<ChatDialogMessage[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [people, setPeople] = useState<PersonItem[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);

  // Load initial data
  const refreshData = useCallback(async () => {
    try {
      const [mems, peeps] = await Promise.all([getMemories(), getPeople()]);
      setMemories(mems);
      setPeople(peeps);
    } catch {
      // Ignored if server still booting
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Setup Web Speech API SpeechSynthesis
  const speakSpokenText = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setVoiceState('idle');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setVoiceState('speaking');
    };

    utterance.onend = () => {
      setVoiceState('idle');
    };

    utterance.onerror = () => {
      setVoiceState('idle');
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  // Process user utterance through MCP Server
  const handleUserUtterance = useCallback(
    async (transcript: string) => {
      if (!transcript.trim()) return;

      const userMsg: ChatDialogMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: transcript,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setVoiceState('processing');

      try {
        const response = await sendVoiceTranscript(transcript);

        const alexaMsg: ChatDialogMessage = {
          id: `alexa-${Date.now()}`,
          sender: 'alexa',
          text: response.spoken,
          timestamp: new Date().toISOString(),
          toolUsed: response.toolUsed,
          toolData: response.data,
        };

        setMessages((prev) => [...prev, alexaMsg]);
        speakSpokenText(response.spoken);
        refreshData();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        const errorMsg: ChatDialogMessage = {
          id: `alexa-${Date.now()}`,
          sender: 'alexa',
          text: `Error connecting to Griot MCP Server: ${message}`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        setVoiceState('idle');
      }
    },
    [speakSpokenText, refreshData],
  );

  // Toggle voice recognition
  const toggleListening = useCallback(() => {
    if (typeof window === 'undefined') return;

    if (voiceState === 'listening') {
      recognitionRef.current?.stop();
      setVoiceState('idle');
      return;
    }

    if (voiceState === 'speaking') {
      window.speechSynthesis.cancel();
      setVoiceState('idle');
      return;
    }

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      alert(
        'Speech Recognition is not supported in this browser. Please use Google Chrome or Edge, or click the quick action chips below.',
      );
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setVoiceState('listening');
    };

    recognition.onresult = (event: ISpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      recognition.stop();
      handleUserUtterance(transcript);
    };

    recognition.onerror = () => {
      setVoiceState('idle');
    };

    recognition.onend = () => {
      setVoiceState((curr) => (curr === 'listening' ? 'idle' : curr));
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setVoiceState('idle');
    }
  }, [voiceState, handleUserUtterance]);

  // Seed demo memories
  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await seedDemoMemories();
      await refreshData();
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#080c14] relative">
      {/* Main Center Stage */}
      <div className="flex-1 flex flex-col items-center justify-between py-6 px-4 z-10">
        {/* Top Header */}
        <div className="w-full max-w-4xl flex items-center justify-between px-2">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <span className="text-white font-bold text-sm tracking-tighter">G</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-wide text-slate-100">
                Griot for Alexa+
              </h1>
              <p className="text-[10px] text-slate-400">
                Model Context Protocol • AWS Bedrock • SQLite Vector
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="flex items-center text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
              Streamable HTTP Active
            </span>
            <button
              type="button"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-900/80 border border-slate-800 rounded-lg transition-colors"
            >
              {isSidebarOpen ? 'Hide Memory Timeline' : 'View Memory Timeline'}
            </button>
          </div>
        </div>

        {/* Center: VoiceOrb */}
        <div className="my-auto flex flex-col items-center justify-center">
          <VoiceOrb state={voiceState} onClick={toggleListening} />
        </div>

        {/* Live Conversation Transcript */}
        <div className="w-full max-w-2xl mb-4">
          <Transcript messages={messages} />
        </div>

        {/* Bottom Quick Action Chips */}
        <div className="w-full max-w-2xl flex flex-wrap justify-center gap-2 pt-2">
          {[
            'What is David allergic to?',
            'What do you know about Sarah?',
            'Summarize my week',
            'Remember that Mom loves chamomile tea',
          ].map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleUserUtterance(prompt)}
              className="text-xs bg-slate-900/60 hover:bg-violet-950/60 hover:text-violet-200 border border-slate-800 hover:border-violet-700/60 text-slate-300 px-3 py-1.5 rounded-full transition-all active:scale-95"
            >
              &ldquo;{prompt}&rdquo;
            </button>
          ))}
        </div>
      </div>

      {/* Collapsible Right Sidebar: Memory Timeline */}
      {isSidebarOpen && (
        <aside className="w-80 lg:w-96 h-full flex-shrink-0 animate-in slide-in-from-right duration-300">
          <MemoryTimeline
            memories={memories}
            people={people}
            onSeed={handleSeed}
            onSelectPerson={(name) => handleUserUtterance(`What do you know about ${name}?`)}
            isLoadingSeed={isSeeding}
          />
        </aside>
      )}
    </div>
  );
}
