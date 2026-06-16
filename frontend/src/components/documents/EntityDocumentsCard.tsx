import { FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DocumentUploadSection } from '@/components/forms/DocumentUploadSection'

interface EntityDocumentsCardProps {
  entityType: 'employee' | 'project'
  entityId: string
}

export function EntityDocumentsCard({ entityType, entityId }: EntityDocumentsCardProps) {
  const title = entityType === 'employee' ? 'Employee Documents' : 'Project Documents'

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        <FileText className="h-4 w-4 text-primary" />
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <DocumentUploadSection
          entityType={entityType}
          entityId={entityId}
          pendingFiles={[]}
          onPendingChange={() => {}}
          embedded
        />
      </CardContent>
    </Card>
  )
}
