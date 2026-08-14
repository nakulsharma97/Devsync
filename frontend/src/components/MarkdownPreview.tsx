import { Fragment, type ReactNode } from "react";

/**
 * Inline markdown: **bold**, *italic*, `code`, [link](url). Plain fragments
 * are rendered as React children, so React escapes them — raw HTML can never
 * be injected (XSS-safe without dangerouslySetInnerHTML).
 */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(<Fragment key={`${keyPrefix}-t${i++}`}>{text.slice(last, match.index)}</Fragment>);
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(<strong key={`${keyPrefix}-b${i++}`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      nodes.push(
        <code key={`${keyPrefix}-c${i++}`} className="rounded bg-muted/60 px-1 py-0.5 text-[0.85em]">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("[")) {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (linkMatch) {
        const href = /^(https?:\/\/|\/)/.test(linkMatch[2]) ? linkMatch[2] : "#";
        nodes.push(
          <a key={`${keyPrefix}-l${i++}`} href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-500 underline">
            {linkMatch[1]}
          </a>
        );
      } else {
        nodes.push(<Fragment key={`${keyPrefix}-l${i++}`}>{token}</Fragment>);
      }
    } else {
      nodes.push(<em key={`${keyPrefix}-e${i++}`}>{token.slice(1, -1)}</em>);
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(<Fragment key={`${keyPrefix}-r${i++}`}>{text.slice(last)}</Fragment>);
  return nodes;
}

function renderBlock(block: string, idx: number): ReactNode {
  const trimmed = block.trimEnd();
  if (trimmed.startsWith("### ")) {
    return <h3 key={idx} className="text-base font-semibold mt-4 mb-1.5">{renderInline(trimmed.slice(4), `h${idx}`)}</h3>;
  }
  if (trimmed.startsWith("## ")) {
    return <h2 key={idx} className="text-lg font-bold mt-5 mb-2">{renderInline(trimmed.slice(3), `h${idx}`)}</h2>;
  }
  if (trimmed.startsWith("# ")) {
    return <h1 key={idx} className="text-xl font-bold mt-5 mb-2">{renderInline(trimmed.slice(2), `h${idx}`)}</h1>;
  }
  if (trimmed.startsWith("> ")) {
    return (
      <blockquote key={idx} className="border-l-2 border-indigo-500/40 pl-3 my-2 text-muted-foreground italic">
        {renderInline(trimmed.slice(2), `q${idx}`)}
      </blockquote>
    );
  }
  if (/^\s*[-*] /.test(trimmed)) {
    return (
      <ul key={idx} className="list-disc list-inside my-1.5 space-y-0.5">
        {trimmed
          .split(/\n(?=\s*[-*] )/)
          .map((item, li) => (
            <li key={li}>{renderInline(item.replace(/^\s*[-*] /, ""), `li${idx}-${li}`)}</li>
          ))}
      </ul>
    );
  }
  if (/^\s*\d+\. /.test(trimmed)) {
    return (
      <ol key={idx} className="list-decimal list-inside my-1.5 space-y-0.5">
        {trimmed.split("\n").map((item, li) => (
          <li key={li}>{renderInline(item.replace(/^\s*\d+\. /, ""), `ol${idx}-${li}`)}</li>
        ))}
      </ol>
    );
  }
  if (trimmed.startsWith("```")) {
    const lines = trimmed.split("\n");
    const code = lines.slice(1, lines[lines.length - 1].trim() === "```" ? -1 : undefined).join("\n");
    return (
      <pre key={idx} className="my-2 rounded-lg bg-muted/50 border border-border/40 p-3 overflow-x-auto text-xs">
        <code>{code}</code>
      </pre>
    );
  }
  return (
    <p key={idx} className="my-1.5 leading-relaxed whitespace-pre-wrap">
      {renderInline(trimmed, `p${idx}`)}
    </p>
  );
}

/** Minimal, XSS-safe Markdown rendering (no dangerouslySetInnerHTML). */
export function MarkdownPreview({ content, className }: { content: string; className?: string }) {
  const blocks = content.split(/\n{2,}/).filter((b) => b.trim().length > 0);
  return <div className={className}>{blocks.map(renderBlock)}</div>;
}
