"use client";

import { useEffect, useState } from "react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

const schema = {
    ...defaultSchema,
    attributes: {
        ...defaultSchema.attributes,
        code: [
            ...(defaultSchema.attributes?.code || []),
            [
                "className",
                /^language-./,
                "math-inline",
                "math-display"
            ],
        ],
        span: [
            ...(defaultSchema.attributes?.span || []),
            ["className", "math-inline", "math-display"],
        ],
        div: [
            ...(defaultSchema.attributes?.div || []),
            ["className", "math-display"],
        ],
    },
};

interface MarkdownRendererProps {
    content: string;
    className?: string;
    replyId?: number;
    onTaskProgress?: (completed: number, total: number) => void;
}

export default function MarkdownRenderer({ content, className = "", replyId, onTaskProgress }: MarkdownRendererProps) {
    const [taskStates, setTaskStates] = useState<{taskIndex: number, isCompleted: boolean}[]>([]);

    useEffect(() => {
        if (replyId) {
            fetch(`/api/replies/${replyId}/tasks`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setTaskStates(data);
                    }
                })
                .catch(console.error);
        }
    }, [replyId]);

    const handleTaskToggle = async (taskIndex: number, isCompleted: boolean) => {
        if (!replyId) return;
        
        // Optimistic update
        setTaskStates(prev => {
            const existing = prev.find(t => t.taskIndex === taskIndex);
            if (existing) {
                return prev.map(t => t.taskIndex === taskIndex ? { ...t, isCompleted } : t);
            }
            return [...prev, { taskIndex, isCompleted }];
        });

        try {
            await fetch(`/api/replies/${replyId}/tasks`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ taskIndex, isCompleted }),
            });
        } catch (error) {
            console.error("Failed to update task state", error);
        }
    };

    useEffect(() => {
        if (replyId && onTaskProgress) {
            const totalTasks = (content.match(/- \[[ xX]\]/g) || []).length;
            if (totalTasks > 0) {
                let completedCount = 0;
                const matches = [...content.matchAll(/- \[([ xX])\]/g)];
                matches.forEach((match, idx) => {
                    const serverState = taskStates.find(t => t.taskIndex === idx);
                    const isChecked = serverState ? serverState.isCompleted : (match[1].toLowerCase() === 'x');
                    if (isChecked) completedCount++;
                });
                onTaskProgress(completedCount, totalTasks);
            } else {
                onTaskProgress(0, 0);
            }
        }
    }, [content, taskStates, replyId]);

    let checkboxIndex = 0;
    return (
        <div className={`markdown-renderer ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[[rehypeSanitize, schema], rehypeKatex]}
                components={{
                    code({ className, children, style, ...props }) {
                        const match = /language-(\w+)/.exec(className || "");
                        return match ? (
                            <SyntaxHighlighter
                                style={atomDark}
                                language={match[1]}
                                PreTag="div"
                                className="rounded-xl my-4"
                            >
                                {String(children).replace(/\n$/, "")}
                            </SyntaxHighlighter>
                        ) : (
                            <code className={`${className} bg-slate-200 dark:bg-white/10 px-1.5 py-0.5 rounded text-blue-400 font-mono text-sm`} {...props}>
                                {children}
                            </code>
                        );
                    },
                    h1: ({ children }) => <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-6 mb-4">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-xl font-black text-slate-900 dark:text-white mt-5 mb-3">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-lg font-black text-slate-900 dark:text-white mt-4 mb-2">{children}</h3>,
                    p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>,
                    li: ({ children, className, ...props }) => {
                        const isTaskListItem = className?.includes("task-list-item");
                        return (
                            <li className={`${isTaskListItem ? "flex items-start gap-2 my-1" : "text-slate-700 dark:text-slate-300"}`} {...props}>
                                {children}
                            </li>
                        );
                    },
                    input: ({ type, checked, ...props }) => {
                        if (type === "checkbox") {
                            const currentIndex = checkboxIndex++;
                            const serverState = taskStates.find(t => t.taskIndex === currentIndex);
                            const isChecked = serverState ? serverState.isCompleted : checked;
                            
                            if (replyId) {
                                return (
                                    <button
                                        type="button"
                                        role="checkbox"
                                        aria-checked={isChecked}
                                        onClick={() => handleTaskToggle(currentIndex, !isChecked)}
                                        className={`mt-1 flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all ${
                                            isChecked 
                                                ? "bg-green-500 border-green-500 text-white" 
                                                : "border-slate-300 dark:border-slate-600 bg-transparent hover:border-blue-500"
                                        }`}
                                    >
                                        {isChecked && (
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </button>
                                );
                            }
                            
                            // Non-interactive fallback
                            return (
                                <input 
                                    type="checkbox" 
                                    checked={isChecked} 
                                    disabled 
                                    className="mt-1 w-4 h-4 rounded text-blue-500 focus:ring-blue-500 disabled:opacity-50"
                                    {...props} 
                                />
                            );
                        }
                        return <input type={type} {...props} />;
                    },
                    a: ({ children, href }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                            {children}
                        </a>
                    ),
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-blue-500/50 pl-4 italic text-slate-600 dark:text-slate-400 my-4">
                            {children}
                        </blockquote>
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
