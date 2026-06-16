import type { ComponentPropsWithoutRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

interface MarkdownContentProps {
  content: string
  className?: string
  inverted?: boolean
  /** Wrap markdown tables in a horizontal scroll container (for chatbot panels). */
  scrollableTables?: boolean
}

const tableCellStyles = cn(
  '[&_th]:border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold [&_th]:whitespace-nowrap',
  '[&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-1.5 [&_td]:whitespace-nowrap',
)

export function MarkdownContent({ content, className, inverted, scrollableTables = false }: MarkdownContentProps) {
  const components = scrollableTables
    ? {
        table: ({ children, ...props }: ComponentPropsWithoutRef<'table'>) => (
          <div className="chat-table-scroll">
            <table className="w-max min-w-full border-collapse text-xs" {...props}>
              {children}
            </table>
          </div>
        ),
      }
    : undefined

  return (
    <div
      className={cn(
        'prose prose-sm max-w-none dark:prose-invert',
        scrollableTables && 'min-w-0 max-w-full',
        inverted && 'prose-invert text-white [&_*]:text-white [&_strong]:text-white [&_td]:text-white [&_th]:text-white',
        !scrollableTables && '[&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs',
        tableCellStyles,
        '[&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-semibold',
        '[&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0',
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
