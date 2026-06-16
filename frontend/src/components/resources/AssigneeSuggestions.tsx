import { useEffect, useState } from 'react'
import { Star, User } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { AssigneeSuggestion } from '@/types'
import { cn } from '@/lib/utils'

interface AssigneeSuggestionsProps {
  skills?: string[]
  taskId?: string
  onSelect?: (employeeId: string) => void
  fetchSuggestions: (skills?: string[]) => Promise<AssigneeSuggestion[]>
}

export function AssigneeSuggestions({ skills, taskId, onSelect, fetchSuggestions }: AssigneeSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<AssigneeSuggestion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchSuggestions(skills).then((data) => {
      setSuggestions(data.slice(0, 5))
      setLoading(false)
    })
  }, [skills, taskId, fetchSuggestions])

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-lg" />)}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">Suggested Assignees</h4>
      {suggestions.map((s) => (
        <Card
          key={s.employee.id}
          className={cn(
            'cursor-pointer',
            s.isBestMatch && 'ring-2 ring-primary/30 bg-primary/5'
          )}
          onClick={() => onSelect?.(s.employee.id)}
        >
          <CardContent className="p-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium">{s.employee.fullName}</p>
                    {s.isBestMatch && (
                      <Badge className="gap-0.5 text-[10px]">
                        <Star className="h-2.5 w-2.5" /> Best Match
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{s.employee.designation}</p>
                </div>
              </div>
              <span className="text-sm font-bold text-primary">{s.score}</span>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 text-center text-xs sm:grid-cols-3">
              <div>
                <p className="font-semibold text-emerald-600">{s.skillMatch}%</p>
                <p className="text-muted-foreground">Skill Match</p>
              </div>
              <div>
                <p className={cn('font-semibold', s.utilization > 90 ? 'text-amber-600' : 'text-foreground')}>{s.utilization}%</p>
                <p className="text-muted-foreground">Utilization</p>
              </div>
              <div>
                <p className="font-semibold">{s.availableHours}h</p>
                <p className="text-muted-foreground">Available</p>
              </div>
            </div>
            <Progress
              value={s.utilization}
              max={100}
              className="mt-2"
              color={s.utilization > 100 ? 'danger' : s.utilization > 90 ? 'warning' : 'success'}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
