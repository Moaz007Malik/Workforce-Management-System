import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { KanbanBoard } from '@/components/tasks/KanbanBoard'
import { AssigneeSuggestions } from '@/components/resources/AssigneeSuggestions'
import { TaskFormDialog } from '@/components/forms/TaskFormDialog'
import { useTaskStore } from '@/stores/useTaskStore'
import { useEmployeeStore } from '@/stores/useEmployeeStore'
import { useProjectStore } from '@/stores/useProjectStore'
import { useEffectiveRoles } from '@/lib/useEffectiveRoles'
import { isEmployeeRole } from '@/lib/roles'

export function Tasks() {
  const { tasks, loading, fetchTasks, getAssigneeSuggestions, updateTask } = useTaskStore()
  const { employees, fetchEmployees } = useEmployeeStore()
  const { projects, fetchProjects } = useProjectStore()
  const { systemRole, currentUserId } = useEffectiveRoles()
  const isEmployee = isEmployeeRole(systemRole)
  const [formOpen, setFormOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>()

  useEffect(() => {
    fetchTasks()
    if (!isEmployee) {
      fetchEmployees()
      fetchProjects()
    }
  }, [fetchTasks, fetchEmployees, fetchProjects, isEmployee])

  const visibleTasks = useMemo(() => {
    if (!isEmployee || !currentUserId) return tasks
    return tasks.filter((t) => t.assigneeId === currentUserId)
  }, [tasks, isEmployee, currentUserId])

  const selectedTask = visibleTasks.find((t) => t.id === selectedTaskId)

  const handleAssign = async (employeeId: string) => {
    if (!selectedTask) return
    await updateTask(selectedTask.id, { assigneeId: employeeId })
    fetchEmployees()
  }

  if (loading) return <Skeleton className="h-96" />

  return (
    <div className="space-y-4 animate-fade-in min-w-0 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">{isEmployee ? 'My Tasks' : 'Task Board'}</h1>
          <p className="text-muted-foreground">
            {isEmployee
              ? `${visibleTasks.length} task${visibleTasks.length === 1 ? '' : 's'} assigned to you`
              : `Drag and drop tasks · ${tasks.length} total`}
          </p>
        </div>
        {!isEmployee && (
          <Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> New Task</Button>
        )}
      </div>

      <div className={isEmployee ? '' : 'grid gap-6 lg:grid-cols-4'}>
        <div className={isEmployee ? '' : 'lg:col-span-3'}>
          {visibleTasks.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
              {isEmployee ? 'No tasks assigned to you yet.' : 'No tasks yet.'}
            </p>
          ) : (
            <KanbanBoard
              tasks={visibleTasks}
              readOnly={isEmployee}
              selectedTaskId={selectedTaskId}
              onTaskSelect={setSelectedTaskId}
            />
          )}
        </div>
        {!isEmployee && (
          <div>
            <p className="mb-2 text-sm text-muted-foreground">
              {selectedTask ? `Suggestions for: ${selectedTask.title}` : 'Select a task to see assignee suggestions'}
            </p>
            <AssigneeSuggestions
              skills={selectedTask?.requiredSkills}
              taskId={selectedTaskId}
              onSelect={handleAssign}
              fetchSuggestions={(skills) => getAssigneeSuggestions(skills, selectedTaskId)}
            />
          </div>
        )}
      </div>

      {!isEmployee && (
        <TaskFormDialog
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onSaved={() => { fetchTasks(); fetchEmployees() }}
          projects={projects}
          employees={employees}
        />
      )}
    </div>
  )
}
