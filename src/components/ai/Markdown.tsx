"use client";

import { memo, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Check, Copy } from "lucide-react";

function CopyButton({ getText }: { getText: (el: HTMLElement) => string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        const root = e.currentTarget.closest(".codeblock") as HTMLElement | null;
        if (!root) return;
        navigator.clipboard?.writeText(getText(root)).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1400);
        });
      }}
      className="codeblock-copy"
      aria-label="Kopiuj kod"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? "skopiowano" : "kopiuj"}
    </button>
  );
}

const components: Components = {
  code(props) {
    const { className, children, node } = props;
    const text = String(children ?? "");
    const isBlock =
      /language-/.test(className ?? "") ||
      text.includes("\n") ||
      (node?.position && node.position.start.line !== node.position.end.line);

    if (!isBlock) {
      return <code className="inline-code">{children}</code>;
    }

    const lang = /language-(\w+)/.exec(className ?? "")?.[1] ?? "kod";
    return (
      <span className="codeblock">
        <span className="codeblock-bar">
          <span className="codeblock-lang">{lang}</span>
          <CopyButton getText={(el) => el.querySelector("code")?.textContent ?? ""} />
        </span>
        <pre>
          <code className={className}>{children}</code>
        </pre>
      </span>
    );
  },
};

function MarkdownImpl({ children }: { children: string }) {
  return (
    <div className="prose-chat">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

export const Markdown = memo(MarkdownImpl);
