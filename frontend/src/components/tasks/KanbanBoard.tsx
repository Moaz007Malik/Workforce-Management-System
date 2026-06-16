import { useState } from 'react'
import {
  DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDroppable } from '@dnd-kit/core'
import { GripVertical, Clock, User } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Task } from '@/types'
import { cn, getPriorityColor } from '@/lib/utils'
import { useTaskStore } from '@/stores/useTaskStore'
import { useEmployeeStore } from '@/stores/useEmployeeStore'

const COLUMNS = ['Backlog', 'To Do', 'In Progress', 'Review', 'Completed'] as const

function TaskCard({ task, isDragging, selected }: { task: Task; isDragging?: boolean; selected?: boolean }) {
  const { employees } = useEmployeeStore()
  const assignee = employees.find((e) => e.id === task.assigneeId)

  return (
    <Card className={cn('cursor-grab', isDragging && 'shadow-lg ring-2 ring-primary/30', selected && 'ring-2 ring-primary')}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <GripVertical className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-tight">{task.title}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', getPriorityColor(task.priority))}>
                {task.priority}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {task.estimatedHours}h
          </div>
          {assignee && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {assignee.fullName.split(' ')[0]}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function SortableTask({ task, selected, onSelect }: { task: Task; selected?: boolean; onSelect?: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={() => onSelect?.(task.id)}>
      <TaskCard task={task} selected={selected} />
    </div>
  )
}

function KanbanColumn({ column, tasks, selectedTaskId, onTaskSelect }: { column: string; tasks: Task[]; selectedTaskId?: string; onTaskSelect?: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: column })
  const columnTasks = tasks.filter((t) => t.kanbanStatus === column)

  return (
    <div className="flex w-[min(280px,85vw)] shrink-0 flex-col sm:w-72">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{column}</h3>
        <Badge variant="secondary">{columnTasks.length}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 space-y-2 rounded-xl border border-dashed border-border bg-muted/30 p-2 min-h-[400px] transition-colors',
          isOver && 'border-primary bg-primary/5'
        )}
      >
        <SortableContext items={columnTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {columnTasks.map((task) => (
            <SortableTask key={task.id} task={task} selected={task.id === selectedTaskId} onSelect={onTaskSelect} />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}

interface KanbanBoardProps {
  selectedTaskId?: string
  onTaskSelect?: (id: string) => void
}

export function KanbanBoard({ selectedTaskId, onTaskSelect }: KanbanBoardProps) {
  const { tasks, updateTask } = useTaskStore()
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  )

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id)
    if (task) setActiveTask(task)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null)
    const { active, over } = event
    if (!over) return

    const taskId = active.id as string
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    let newColumn = over.id as string
    if (!COLUMNS.includes(newColumn as typeof COLUMNS[number])) {
      const overTask = tasks.find((t) => t.id === over.id)
      if (overTask) newColumn = overTask.kanbanStatus
    }

    if (task.kanbanStatus !== newColumn && COLUMNS.includes(newColumn as typeof COLUMNS[number])) {
      const statusMap: Record<string, string> = {
        Backlog: 'Not Started', 'To Do': 'Not Started',
        'In Progress': 'In Progress', Review: 'Review', Completed: 'Completed',
      }
      await updateTask(taskId, { kanbanStatus: newColumn, status: statusMap[newColumn] || task.status })
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <KanbanColumn key={col} column={col} tasks={tasks} selectedTaskId={selectedTaskId} onTaskSelect={onTaskSelect} />
        ))}
      </div>
      <DragOverlay>{activeTask ? <TaskCard task={activeTask} isDragging /> : null}</DragOverlay>
    </DndContext>
  )
}
