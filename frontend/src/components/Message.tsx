import { useState, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // clipboard blocked
    }
  }

  return (
    <button
      onClick={copy}
      className="icon-btn h-8 w-8"
      aria-label={copied ? 'کپی شد' : 'کپی کد'}
    >
      {copied ? (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
      )}
    </button>
  )
}

function extractText(node: ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (node && typeof node === 'object' && 'props' in node) {
    return extractText((node as { props: { children?: ReactNode } }).props.children)
  }
  return ''
}

export function CodeBlock({ children }: { children?: ReactNode }) {
  // react-markdown passes <pre><code class="language-x">…</code></pre>
  const child = Array.isArray(children) ? children[0] : children
  let lang = ''
  let code = ''

  if (child && typeof child === 'object' && 'props' in child) {
    const props = (child as { props: { className?: string; children?: ReactNode } }).props
    const match = /language-(\w+)/.exec(props.className ?? '')
    lang = match?.[1] ?? ''
    code = extractText(props.children)
  } else {
    code = extractText(children)
  }

  return (
    <div className="code-block" dir="ltr">
      <div className="code-head">
        <span className="code-lang">{lang || 'code'}</span>
        <CopyButton text={code} />
      </div>
      <pre className="code-pre">{children}</pre>
    </div>
  )
}

export function Markdown({ content }: { content: string }) {
  return (
    <div className="msg-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={{
          pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer noopener">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
