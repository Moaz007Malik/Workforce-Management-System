import { useState } from 'react'
import { ChevronRight, ChevronDown, Folder, Flag, CheckSquare } from 'lucide-react'
import { cn, getPriorityColor } from '@/lib/utils'
import type { Task } from '@/types'

export interface WBSNode {
  id: string
  name: string
  type?: 'phase' | 'milestone' | 'task'
  dueDate?: string
  tasks?: Task[]
  milestones?: WBSNode[]
  children?: WBSNode[]
  priority?: string
  status?: string
}

interface WBSTreeProps {
  nodes: WBSNode[]
  level?: number
}

function TreeNode({ node, level = 0 }: { node: WBSNode; level?: number }) {
  const [expanded, setExpanded] = useState(level < 2)
  const hasChildren = (node.milestones?.length || 0) > 0 || (node.tasks?.length || 0) > 0 || (node.children?.length || 0) > 0

  const nodeType = node.type || 'phase'
  const icons = { phase: Folder, milestone: Flag, task: CheckSquare }
  const Icon = icons[nodeType] || Folder

  return (
    <div>
      <button
        onClick={() => hasChildren && setExpanded(!expanded)}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/50',
        )}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
      >
        {hasChildren ? (
          expanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <span className="w-4" />
        )}
        <Icon className={cn('h-4 w-4 shrink-0', nodeType === 'phase' ? 'text-primary' : nodeType === 'milestone' ? 'text-amber-500' : 'text-muted-foreground')} />
        <span className="font-medium">{node.name}</span>
        {node.dueDate && <span className="text-xs text-muted-foreground ml-auto">{node.dueDate}</span>}
        {node.priority && (
          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium ml-auto', getPriorityColor(node.priority))}>
            {node.priority}
          </span>
        )}
      </button>

      {expanded && (
        <>
          {node.milestones?.map((ms) => (
            <div key={ms.id}>
              <TreeNode node={{ ...ms, type: 'milestone' }} level={level + 1} />
              {ms.tasks?.map((task) => (
                <TreeNode
                  key={task.id}
                  node={{ id: task.id, name: task.title, type: 'task', priority: task.priority, status: task.status }}
                  level={level + 2}
                />
              ))}
            </div>
          ))}
          {node.tasks?.map((task) => (
            <TreeNode
              key={task.id}
              node={{ id: task.id, name: task.title, type: 'task', priority: task.priority, status: task.status }}
              level={level + 1}
            />
          ))}
        </>
      )}
    </div>
  )
}

export function WBSTree({ nodes }: WBSTreeProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {nodes.map((node) => (
        <TreeNode key={node.id} node={{ ...node, type: 'phase' }} />
      ))}
    </div>
  )
}
