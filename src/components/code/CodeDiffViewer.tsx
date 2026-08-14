"use client";

import React, { useState } from 'react';
import * as diff from 'diff';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, GitCommit, SplitSquareVertical, Columns } from 'lucide-react';
import { toast } from 'sonner';

interface CodeDiffViewerProps {
  originalCode: string;
  correctedCode: string;
  language?: string;
  onApplyFix?: () => void;
}

export default function CodeDiffViewer({ originalCode, correctedCode, language = 'javascript', onApplyFix }: CodeDiffViewerProps) {
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');
  const [isCopied, setIsCopied] = useState(false);

  const diffResult = diff.diffLines(originalCode, correctedCode);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(correctedCode);
      setIsCopied(true);
      toast.success('Corrected code copied to clipboard!');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy code.');
    }
  };

  const renderUnified = () => {
    return (
      <div className="text-sm font-mono whitespace-pre w-full">
        {diffResult.map((part, index) => {
          const colorClass = part.added ? 'bg-emerald-500/20 text-emerald-300' : part.removed ? 'bg-red-500/20 text-red-300' : 'text-slate-300';
          const prefix = part.added ? '+' : part.removed ? '-' : ' ';
          return (
            <div key={index} className={`px-2 py-0.5 ${colorClass}`}>
              {part.value.replace(/\n$/, '').split('\n').map((line, i) => (
                <div key={i}>
                  <span className="select-none opacity-50 mr-4 inline-block w-4 text-right">{prefix}</span>
                  <span>{line}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  const renderSplit = () => {
    const leftLines: { line: string, type: 'normal' | 'removed' | 'empty' }[] = [];
    const rightLines: { line: string, type: 'normal' | 'added' | 'empty' }[] = [];

    diffResult.forEach(part => {
      const lines = part.value.replace(/\n$/, '').split('\n');
      if (part.added) {
        lines.forEach(line => rightLines.push({ line, type: 'added' }));
        lines.forEach(() => leftLines.push({ line: '', type: 'empty' }));
      } else if (part.removed) {
        lines.forEach(line => leftLines.push({ line, type: 'removed' }));
        lines.forEach(() => rightLines.push({ line: '', type: 'empty' }));
      } else {
        lines.forEach(line => {
          leftLines.push({ line, type: 'normal' });
          rightLines.push({ line, type: 'normal' });
        });
      }
    });

    return (
      <div className="flex w-full min-w-max text-sm font-mono">
        {/* Left Side: Original */}
        <div className="w-1/2 border-r border-slate-700">
          <div className="bg-slate-800/50 text-slate-400 text-xs px-2 py-1 font-bold sticky top-0 uppercase tracking-widest border-b border-slate-700">Original</div>
          <div className="pb-2">
            {leftLines.map((l, i) => (
              <div key={i} className={`px-2 py-0.5 min-h-[24px] ${l.type === 'removed' ? 'bg-red-500/20 text-red-300' : l.type === 'empty' ? 'bg-slate-900/50' : 'text-slate-300'}`}>
                {l.type !== 'empty' && <span className="select-none opacity-50 mr-4 inline-block w-4 text-right">-</span>}
                {l.line}
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Corrected */}
        <div className="w-1/2">
          <div className="bg-emerald-900/30 text-emerald-400 text-xs px-2 py-1 font-bold sticky top-0 uppercase tracking-widest border-b border-emerald-900/50">Corrected</div>
          <div className="pb-2">
            {rightLines.map((l, i) => (
              <div key={i} className={`px-2 py-0.5 min-h-[24px] ${l.type === 'added' ? 'bg-emerald-500/20 text-emerald-300' : l.type === 'empty' ? 'bg-slate-900/50' : 'text-slate-300'}`}>
                {l.type !== 'empty' && <span className="select-none opacity-50 mr-4 inline-block w-4 text-right">+</span>}
                {l.line}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="my-4 rounded-xl border border-slate-700 bg-[#1e1e1e] overflow-hidden flex flex-col shadow-lg w-full">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-2 border-b border-slate-700 bg-slate-800/80 gap-2">
        <div className="flex items-center gap-2 text-slate-300">
          <GitCommit className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold uppercase tracking-widest">Code Fix ({language})</span>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* View Toggle */}
          <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-700">
            <button 
              onClick={() => setViewMode('split')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'split' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
              title="Side-by-Side View"
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => setViewMode('unified')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'unified' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
              title="Unified Inline View"
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
            </button>
          </div>
          
          {/* Actions */}
          <button 
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-widest text-white transition-colors"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isCopied ? 'Copied' : 'Copy'}</span>
          </button>

          {onApplyFix && (
            <button 
              onClick={onApplyFix}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-[10px] font-bold uppercase tracking-widest text-white transition-colors shadow-lg shadow-emerald-900/50"
            >
              Apply Fix
            </button>
          )}
        </div>
      </div>

      {/* Code Container */}
      <div className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {viewMode === 'unified' ? renderUnified() : renderSplit()}
      </div>
    </div>
  );
}
