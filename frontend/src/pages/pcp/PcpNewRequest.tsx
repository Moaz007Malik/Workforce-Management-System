import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Trash2, ChevronLeft, ChevronRight, ArrowLeft, FolderKanban } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { RequiredLabel } from '@/components/pcp/RequiredLabel'
import { ChargingIndicator } from '@/components/pcp/ChargingIndicator'
import { ApprovalChainPreview } from '@/components/pcp/ApprovalChainPreview'
import { PriorityBadge } from '@/components/pcp/PriorityBadge'
import { ValidationAlert } from '@/components/pcp/ValidationAlert'
import { PcpStatusChip } from '@/components/pcp/PcpStatusChip'
import { usePcpStore } from '@/stores/usePcpStore'
import { useAppStore } from '@/stores/useAppStore'
import { useEmployeeStore } from '@/stores/useEmployeeStore'
import { calcPositionMonthly, calcPositionTotal, chargingTotal, defaultBenefitAmount, emptyPosition, isBandBreach } from '@/lib/pcpCalculations'
import { validateHeader, validatePositions, validateCosting } from '@/lib/pcpValidation'
import { api } from '@/lib/api'
import { getPcpDefaultsFromProject } from '@/lib/projectPcpDefaults'
import { getNeedPrefill } from '@/lib/insightsEngine'
import { formatAed } from '@/lib/utils'
import type { PcpPosition, PcpRequest, Project } from '@/types'

const STEPS = ['Request Header', 'Positions', 'Costing', 'Review & Submit']
const APPROVAL_CHAIN = ['BU Head', 'Finance Manager', 'HR Director']

function electricianDemoPosition(): PcpPosition {
  return {
    ...emptyPosition(),
    title: 'Electrician',
    jobFamily: 'Electrical',
    grade: 'B2',
    count: 2,
    shift: 'Day',
    workLocation: 'Site',
    marketSalary: 12000,
    proposedSalary: 12500,
    benefits: [{ name: 'Housing', amount: 2000 }, { name: 'Transport', amount: 800 }],
    contractDuration: '12',
    noticePeriod: '30',
    probationPeriod: '3',
  }
}

export function PcpNewRequest() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const needId = searchParams.get('need')
  const { businessUnit, currentUserId } = useAppStore()
  const { employees, getEmployeeById, fetchEmployees } = useEmployeeStore()
  const currentUser = getEmployeeById(currentUserId)
  const { masters, fetchMasters, createRequest, submitRequest } = usePcpStore()
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [sourceProject, setSourceProject] = useState<Project | null>(null)
  const [projectLoading, setProjectLoading] = useState(!!projectId)
  const projectPrefilled = useRef(false)
  const needPrefilled = useRef(false)
  const [header, setHeader] = useState({
    client: 'ADNOC Refinery Electrical Turnaround',
    clientLocation: 'Abu Dhabi',
    recruitmentType: 'New Hire',
    issueDate: new Date().toISOString().slice(0, 10),
    requiredByDate: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10),
    businessUnit: businessUnit || 'Construction – North',
    wbs: '',
    priority: 'Normal',
  })
  const [positions, setPositions] = useState<PcpPosition[]>([electricianDemoPosition()])
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchMasters() }, [fetchMasters])
  useEffect(() => { if (projectId) fetchEmployees() }, [projectId, fetchEmployees])

  useEffect(() => {
    if (!needId || needPrefilled.current) return
    const prefill = getNeedPrefill(needId)
    if (!prefill) return
    needPrefilled.current = true
    setHeader((h) => ({
      ...h,
      client: prefill.client,
      clientLocation: prefill.clientLocation,
      businessUnit: prefill.businessUnit,
    }))
    setPositions(
      prefill.positions.map((p) => ({
        ...emptyPosition(),
        title: p.title,
        jobFamily: p.jobFamily,
        count: p.count,
        shift: p.shift,
        grade: 'B2',
        marketSalary: 12000,
        proposedSalary: 12500,
        benefits: [{ name: 'Housing', amount: 2000 }, { name: 'Transport', amount: 800 }],
        contractDuration: '12',
        noticePeriod: '30',
        probationPeriod: '3',
      })),
    )
  }, [needId])

  useEffect(() => {
    if (!projectId) return
    setProjectLoading(true)
    api.get<{ project: Project }>(`/projects/${projectId}/details`)
      .then((data) => setSourceProject(data.project))
      .catch(() => setSourceProject(null))
      .finally(() => setProjectLoading(false))
  }, [projectId])

  useEffect(() => {
    if (!sourceProject || !masters || projectPrefilled.current) return
    if (sourceProject.projectManagerId && !employees.length) return
    const pm = sourceProject.projectManagerId
      ? getEmployeeById(sourceProject.projectManagerId)
      : undefined
    const defaults = getPcpDefaultsFromProject(sourceProject, pm, masters.wbsByBu)
    setHeader((h) => ({
      ...h,
      client: defaults.client,
      clientLocation: defaults.clientLocation,
      businessUnit: defaults.businessUnit,
      priority: defaults.priority,
      requiredByDate: defaults.requiredByDate,
      wbs: defaults.wbs,
    }))
    projectPrefilled.current = true
  }, [sourceProject, masters, employees, getEmployeeById])

  useEffect(() => {
    if (projectId || !masters || header.wbs) return
    const wbs = masters.wbsByBu[header.businessUnit]?.[0]
    if (wbs) setHeader((h) => ({ ...h, wbs }))
  }, [masters, header.businessUnit, header.wbs, projectId])

  const wbsOptions = masters?.wbsByBu[header.businessUnit] || []
  const monthlyTotal = positions.reduce((s, p) => s + calcPositionMonthly(p) * (p.count || 1), 0)
  const allChargingBalanced = positions.every((p) => chargingTotal(p) === 100)
  const grade = (code: string) => masters?.grades.find((g) => g.code === code)

  const buildPayload = (): Partial<PcpRequest> => ({
    ...header,
    requestedBy: currentUser?.fullName || 'Muhammad Imran',
    requestedById: currentUserId,
    status: 'Draft',
    positions: positions.map((p, i) => ({
      ...p,
      id: p.id || `pos-new-${i}`,
      monthlyBudget: calcPositionMonthly(p),
      totalBudget: calcPositionTotal(p),
    })),
    monthlyTotal,
    annualTotal: monthlyTotal * 12,
  })

  const validateStep = (): string[] => {
    if (step === 0) return validateHeader(header)
    if (step === 1) return validatePositions(positions)
    if (step === 2) return validateCosting(positions, masters?.grades || [])
    return [...validateHeader(header), ...validatePositions(positions), ...validateCosting(positions, masters?.grades || [])]
  }

  const goNext = () => {
    const errs = validateStep()
    setErrors(errs)
    if (errs.length) return
    setStep(step + 1)
  }

  const saveDraft = async () => {
    setSaving(true)
    try {
      const created = await createRequest(buildPayload())
      navigate(`/pcp/requests/${created.id}`)
    } finally {
      setSaving(false)
    }
  }

  const submit = async () => {
    const errs = validateStep()
    setErrors(errs)
    if (errs.length) return
    setSaving(true)
    try {
      const created = await createRequest(buildPayload())
      await submitRequest(created.id)
      navigate(`/pcp/requests/${created.id}?submitted=1`)
    } finally {
      setSaving(false)
      setShowSubmitConfirm(false)
    }
  }

  const updatePos = (idx: number, patch: Partial<PcpPosition>) => {
    setPositions((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
  }

  const ensureCc2 = (pos: PcpPosition) => {
    if (pos.costCenters.length < 2) {
      return [...pos.costCenters, { code: 'CC103', percent: 40 }]
    }
    return pos.costCenters
  }

  if (projectLoading) {
    return <p className="text-muted-foreground">Loading project details…</p>
  }

  return (
    <div className="space-y-4 animate-fade-in min-w-0 sm:space-y-6">
      <div>
        {sourceProject && (
          <Link
            to={`/projects/${sourceProject.id}`}
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to {sourceProject.name}
          </Link>
        )}
        <h1 className="text-xl font-bold sm:text-2xl">New PCP Request</h1>
        <p className="text-muted-foreground">4-step wizard · mandatory fields marked with <span className="text-primary">*</span></p>
      </div>

      {sourceProject && (
        <div className="flex items-start gap-3 rounded-lg border border-accent/30 bg-accent/5 p-4">
          <FolderKanban className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div className="text-sm">
            <p className="font-medium text-accent">Creating PCP for {sourceProject.name}</p>
            <p className="mt-1 text-muted-foreground">
              {sourceProject.client} · PM: {sourceProject.projectManager} · {sourceProject.status}
              {sourceProject.priority && ` · ${sourceProject.priority} priority`}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {STEPS.map((label, i) => (
          <div key={label} className={`flex-1 rounded-lg border px-3 py-2 text-center text-xs font-medium ${i === step ? 'border-primary bg-primary/5 text-primary' : i < step ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border text-muted-foreground'}`}>
            Step {i + 1}: {label}
          </div>
        ))}
      </div>

      <ValidationAlert errors={errors} />

      {step === 0 && (
        <Card>
          <CardHeader><CardTitle>Step 1 – Request Header</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div><label className="text-sm text-muted-foreground">PCP Reference No.</label><Input readOnly value="Auto-generated on save" className="bg-muted" /></div>
            <div><RequiredLabel>Company / Client Name</RequiredLabel><Select value={header.client} onChange={(e) => setHeader({ ...header, client: e.target.value })}>{masters?.clients.map((c) => <option key={c}>{c}</option>)}</Select></div>
            <div><RequiredLabel>Client Location</RequiredLabel><Select value={header.clientLocation} onChange={(e) => setHeader({ ...header, clientLocation: e.target.value })}>{masters?.locations.map((l) => <option key={l}>{l}</option>)}</Select></div>
            <div><RequiredLabel>Type of Recruitment</RequiredLabel><Select value={header.recruitmentType} onChange={(e) => setHeader({ ...header, recruitmentType: e.target.value })}>{masters?.recruitmentTypes.map((t) => <option key={t}>{t}</option>)}</Select></div>
            <div><RequiredLabel>PCP Issue Date</RequiredLabel><Input type="date" value={header.issueDate} onChange={(e) => setHeader({ ...header, issueDate: e.target.value })} /></div>
            <div><RequiredLabel>Required-By Date</RequiredLabel><Input type="date" value={header.requiredByDate} onChange={(e) => setHeader({ ...header, requiredByDate: e.target.value })} /></div>
            <div><RequiredLabel>Business Unit / Department</RequiredLabel><Select value={header.businessUnit} onChange={(e) => setHeader({ ...header, businessUnit: e.target.value, wbs: '' })}>{masters?.businessUnits.map((b) => <option key={b}>{b}</option>)}</Select></div>
            <div><RequiredLabel>Project / WBS</RequiredLabel><Select value={header.wbs} onChange={(e) => setHeader({ ...header, wbs: e.target.value })}><option value="">Select...</option>{wbsOptions.map((w) => <option key={w}>{w}</option>)}</Select></div>
            <div>
              <label className="text-sm">Priority</label>
              <div className="mt-1 flex items-center gap-2">
                <Select value={header.priority} onChange={(e) => setHeader({ ...header, priority: e.target.value })} className="flex-1">{masters?.priorities.map((p) => <option key={p}>{p}</option>)}</Select>
                <PriorityBadge priority={header.priority} />
              </div>
            </div>
            <div><label className="text-sm text-muted-foreground">Requested By</label><Input readOnly value={`${currentUser?.fullName || '—'} (auto-filled)`} className="bg-muted" /></div>
          </CardContent>
        </Card>
      )}

      {step === 1 && positions.map((pos, idx) => (
        <Card key={idx}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Position {idx + 1}</CardTitle>
            {positions.length > 1 && <Button variant="ghost" size="sm" onClick={() => setPositions(positions.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button>}
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div><RequiredLabel>Position Title</RequiredLabel><Select value={pos.title} onChange={(e) => updatePos(idx, { title: e.target.value, jobFamily: e.target.value === 'Electrician' ? 'Electrical' : pos.jobFamily })}>{masters?.positionTitles.map((t) => <option key={t}>{t}</option>)}</Select></div>
            <div><RequiredLabel>Job Family</RequiredLabel><Select value={pos.jobFamily} onChange={(e) => updatePos(idx, { jobFamily: e.target.value })}>{masters?.jobFamilies.map((j) => <option key={j}>{j}</option>)}</Select></div>
            <div><RequiredLabel>Grade / Band</RequiredLabel><Select value={pos.grade} onChange={(e) => updatePos(idx, { grade: e.target.value })}>{masters?.grades.map((g) => <option key={g.code} value={g.code}>{g.code}</option>)}</Select>{grade(pos.grade) && <p className="mt-1 text-xs text-muted-foreground">Band: {formatAed(grade(pos.grade)!.bandMin)}–{formatAed(grade(pos.grade)!.bandMax)}</p>}</div>
            <div><RequiredLabel>No. of Positions Required</RequiredLabel><Input type="number" min={1} max={99} value={pos.count} onChange={(e) => updatePos(idx, { count: parseInt(e.target.value, 10) || 1 })} /></div>
            <div><RequiredLabel>Employment Type</RequiredLabel><Select value={pos.employmentType} onChange={(e) => updatePos(idx, { employmentType: e.target.value })}>{masters?.employmentTypes.map((t) => <option key={t}>{t}</option>)}</Select></div>
            <div><RequiredLabel>Shift</RequiredLabel><Select value={pos.shift} onChange={(e) => updatePos(idx, { shift: e.target.value })}>{masters?.shifts.map((s) => <option key={s}>{s}</option>)}</Select></div>
            <div><RequiredLabel>Work Location / Site</RequiredLabel><Select value={pos.workLocation} onChange={(e) => updatePos(idx, { workLocation: e.target.value })}>{masters?.workLocations.map((l) => <option key={l}>{l}</option>)}</Select></div>
            <div><RequiredLabel>Planned Start Date</RequiredLabel><Input type="date" value={pos.plannedStart} onChange={(e) => updatePos(idx, { plannedStart: e.target.value })} /></div>
            <div><label className="text-sm">Planned Demobilization Date</label><Input type="date" value={pos.plannedDemob || ''} onChange={(e) => updatePos(idx, { plannedDemob: e.target.value })} /></div>
            <div><label className="text-sm">Reporting Line</label><Select value={pos.reportingLine || ''} onChange={(e) => updatePos(idx, { reportingLine: e.target.value })}><option value="">Select...</option>{masters?.reportingLines.map((r) => <option key={r}>{r}</option>)}</Select></div>
          </CardContent>
        </Card>
      ))}
      {step === 1 && <Button variant="outline" onClick={() => setPositions([...positions, emptyPosition()])}><Plus className="h-4 w-4" /> Add Position</Button>}

      {step === 2 && positions.map((pos, idx) => {
        const g = grade(pos.grade)
        const breach = g ? isBandBreach(pos, g.bandMin, g.bandMax) : false
        const ccs = ensureCc2(pos)
        const charge = chargingTotal({ ...pos, costCenters: ccs })
        return (
          <Card key={idx}>
            <CardHeader><CardTitle>{pos.title || `Position ${idx + 1}`} – Compensation & Costing</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div><label className="text-sm">Market Salary (benchmark)</label><Input type="number" value={pos.marketSalary || ''} onChange={(e) => updatePos(idx, { marketSalary: parseFloat(e.target.value) || 0 })} /><p className="mt-1 text-xs text-accent">AI suggestion: Market range 11,500–13,000</p></div>
              <div><RequiredLabel>Proposed Salary</RequiredLabel><Input type="number" value={pos.proposedSalary || ''} onChange={(e) => updatePos(idx, { proposedSalary: parseFloat(e.target.value) || 0 })} />{breach && <p className="mt-1 text-xs text-amber-600">Above grade band — mandatory justification below</p>}</div>
              {breach && <div className="md:col-span-2"><RequiredLabel>Band Breach Justification</RequiredLabel><Textarea value={pos.bandBreachJustification || ''} onChange={(e) => updatePos(idx, { bandBreachJustification: e.target.value })} /></div>}
              <div className="md:col-span-2"><label className="text-sm">Benefits</label><div className="flex flex-wrap gap-3 mt-1">{masters?.benefits.map((b) => { const ben = pos.benefits?.find((x) => x.name === b); return <label key={b} className="flex items-center gap-2 text-sm border rounded-lg px-2 py-1"><input type="checkbox" checked={!!ben} onChange={(e) => { const benefits = pos.benefits || []; updatePos(idx, { benefits: e.target.checked ? [...benefits.filter((x) => x.name !== b), { name: b, amount: defaultBenefitAmount(b) }] : benefits.filter((x) => x.name !== b) }); }} />{b}</label> })}</div></div>
              <div><RequiredLabel>Contract Duration</RequiredLabel><Select value={pos.contractDuration} onChange={(e) => updatePos(idx, { contractDuration: e.target.value })}>{masters?.contractDurations.map((d) => <option key={d} value={d}>{d === 'Open-ended' ? d : `${d} months`}</option>)}</Select></div>
              <div><RequiredLabel>Notice Period</RequiredLabel><Select value={pos.noticePeriod} onChange={(e) => updatePos(idx, { noticePeriod: e.target.value })}>{masters?.noticePeriods.map((n) => <option key={n} value={n}>{n} days</option>)}</Select></div>
              <div className="md:col-span-2"><RequiredLabel>Cost Center 1 + Charging %</RequiredLabel><div className="flex gap-2"><Select className="flex-1" value={ccs[0]?.code || ''} onChange={(e) => updatePos(idx, { costCenters: [{ code: e.target.value, percent: ccs[0]?.percent ?? 60 }, ccs[1] || { code: 'CC103', percent: 40 }] })}>{masters?.costCenters.map((c) => <option key={c.code} value={c.code}>{c.code} – {c.name}</option>)}</Select><Input type="number" className="w-24" value={ccs[0]?.percent ?? 0} onChange={(e) => updatePos(idx, { costCenters: [{ code: ccs[0]?.code || 'CC305', percent: parseInt(e.target.value, 10) || 0 }, ccs[1] || { code: 'CC103', percent: 40 }] })} /></div></div>
              <div className="md:col-span-2"><label className="text-sm">Cost Center 2 + Charging %</label><div className="flex gap-2"><Select className="flex-1" value={ccs[1]?.code || 'CC103'} onChange={(e) => updatePos(idx, { costCenters: [ccs[0], { code: e.target.value, percent: ccs[1]?.percent ?? 40 }] })}>{masters?.costCenters.map((c) => <option key={c.code} value={c.code}>{c.code} – {c.name}</option>)}</Select><Input type="number" className="w-24" value={ccs[1]?.percent ?? 0} onChange={(e) => updatePos(idx, { costCenters: [ccs[0], { code: ccs[1]?.code || 'CC103', percent: parseInt(e.target.value, 10) || 0 }] })} /></div></div>
              <div className="md:col-span-2"><ChargingIndicator total={charge} /></div>
              <div className="md:col-span-2 rounded-lg border border-border bg-muted/40 p-3"><p className="text-sm font-medium">Budgeted Cost (auto-calculated, read-only)</p><p className="text-lg font-semibold">{formatAed(calcPositionMonthly(pos))} / month · {formatAed(calcPositionTotal(pos))} total</p></div>
            </CardContent>
          </Card>
        )
      })}

      {step === 3 && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {positions.map((pos, i) => (
              <Card key={i}><CardContent className="pt-4 text-sm space-y-1">
                <p className="font-semibold">{pos.title} × {pos.count} · {pos.shift} · {pos.grade}</p>
                <p>Proposed: {formatAed(pos.proposedSalary)}/mo · Total: {formatAed(calcPositionTotal(pos))}</p>
                <p className="text-muted-foreground">CC: {pos.costCenters.map((c) => `${c.code} ${c.percent}%`).join(' · ')}</p>
                <Button variant="ghost" size="sm" className="text-accent" onClick={() => setStep(1)}>Edit</Button>
              </CardContent></Card>
            ))}
            <div className={`rounded-lg border p-4 text-sm font-medium ${allChargingBalanced ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-800' : 'border-primary/30 bg-primary/5 text-primary'}`}>
              {positions.reduce((s, p) => s + (p.count || 1), 0)} positions · {formatAed(monthlyTotal)}/month · Charging {allChargingBalanced ? 'balanced ✓' : 'not balanced — fix before submit'}
            </div>
            <ApprovalChainPreview steps={APPROVAL_CHAIN} />
          </div>
          <Card className="border-accent/20 bg-accent/5">
            <CardHeader><CardTitle className="text-accent">AI Panel</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Sourcing recommendation: 2 of {positions.length} positions match in-house talent pool; Electrician (Night shift) recommended via external staffing agency — expected time-to-fill 21 days vs 38 days in-house.
            </CardContent>
          </Card>
        </div>
      )}

      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Submit for Approval?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Status will change to <PcpStatusChip status="In Approval" /> and follow this chain:</p>
              <ApprovalChainPreview steps={APPROVAL_CHAIN} />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowSubmitConfirm(false)}>Cancel</Button>
                <Button className="bg-primary hover:bg-primary/90" onClick={submit} disabled={saving}>Confirm Submit</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button variant="outline" disabled={step === 0} onClick={() => { setErrors([]); setStep(step - 1) }}><ChevronLeft className="h-4 w-4" /> Back</Button>
        <div className="flex gap-2">
          {step === 3 ? (
            <>
              <Button variant="secondary" onClick={saveDraft} disabled={saving}>Save Draft</Button>
              <Button className="bg-primary hover:bg-primary/90" onClick={() => { const errs = validateStep(); setErrors(errs); if (!errs.length) setShowSubmitConfirm(true) }} disabled={saving || !allChargingBalanced}>Submit for Approval</Button>
            </>
          ) : (
            <Button className="bg-accent hover:bg-accent/90" onClick={goNext}>Next <ChevronRight className="h-4 w-4" /></Button>
          )}
        </div>
      </div>
    </div>
  )
}
