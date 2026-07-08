"use client";

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
}

export default function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
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
                    li: ({ children }) => <li className="text-slate-700 dark:text-slate-300">{children}</li>,
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
