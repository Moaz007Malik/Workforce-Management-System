import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { Plus, Trash2, Pencil, Shield, CheckCircle2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { usePcpStore } from '@/stores/usePcpStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { useAppStore } from '@/stores/useAppStore'
import { canAccessAdmin } from '@/lib/roles'
import { useEffectiveRoles } from '@/lib/useEffectiveRoles'
import type { PcpMasters, PcpRole, PcpUser } from '@/types'

type Tab = 'chains' | 'masters' | 'users'
type MasterCategory = 'clients' | 'costCenters' | 'grades' | 'jobFamilies' | 'locations' | 'benefits'

interface ApprovalChain {
  id: string
  businessUnit: string
  gradeMin: string
  gradeMax: string
  budgetThreshold: number
  steps: string[]
}

interface ExtendedPcpUser extends PcpUser {
  onLeave?: boolean
  approvalDelegateId?: string | null
}

const MASTER_TABS: { key: MasterCategory; label: string }[] = [
  { key: 'clients', label: 'Clients' },
  { key: 'costCenters', label: 'Cost Centers' },
  { key: 'grades', label: 'Grades' },
  { key: 'jobFamilies', label: 'Job Families' },
  { key: 'locations', label: 'Locations' },
  { key: 'benefits', label: 'Benefits' },
]

const PCP_ROLES: PcpRole[] = ['Requester', 'Approver', 'Admin', 'Executive']

function FlashBanner({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border px-4 py-3 text-sm',
        type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400',
      )}
    >
      {type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
      {message}
    </div>
  )
}

export function PcpAdmin() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') as Tab) || 'chains'
  const { systemRole, pcpRole } = useEffectiveRoles()
  const { masters, fetchMasters, fetchUsers, setMasters, users } = usePcpStore()
  const [chains, setChains] = useState<ApprovalChain[]>([])
  const [masterCategory, setMasterCategory] = useState<MasterCategory>('clients')
  const [chainForm, setChainForm] = useState<Partial<ApprovalChain>>({ steps: ['BU Head', 'Finance Manager'] })
  const [editingChainId, setEditingChainId] = useState<string | null>(null)
  const [newItem, setNewItem] = useState('')
  const [gradeForm, setGradeForm] = useState({ code: '', bandMin: '', bandMax: '' })
  const [ccForm, setCcForm] = useState({ code: '', name: '' })
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUser, setNewUser] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'Requester' as PcpRole,
    businessUnit: '',
    designation: '',
  })

  const notify = useCallback((type: 'success' | 'error', text: string) => {
    setFlash({ type, text })
    window.setTimeout(() => setFlash(null), 4000)
  }, [])

  const loadChains = useCallback(async () => {
    const data = await api.get<ApprovalChain[]>('/pcp/approval-chains')
    setChains(data)
  }, [])

  useEffect(() => {
    void fetchMasters()
    void fetchUsers()
    void loadChains().catch((err) => notify('error', err instanceof Error ? err.message : 'Failed to load chains'))
  }, [fetchMasters, fetchUsers, loadChains, notify])

  useEffect(() => {
    const bus = masters?.businessUnits ?? []
    if (bus.length && !newUser.businessUnit) {
      setNewUser((u) => ({ ...u, businessUnit: bus[0] }))
    }
  }, [masters?.businessUnits, newUser.businessUnit])

  if (!canAccessAdmin(systemRole, pcpRole)) {
    return <Navigate to="/" replace />
  }

  const setTab = (t: Tab) => setSearchParams({ tab: t })
  const businessUnits = masters?.businessUnits ?? []

  const saveChain = async () => {
    if (!chainForm.businessUnit || !chainForm.steps?.length) {
      notify('error', 'Business unit and at least one approval step are required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        businessUnit: chainForm.businessUnit,
        gradeMin: chainForm.gradeMin || 'B1',
        gradeMax: chainForm.gradeMax || 'B3',
        budgetThreshold: Number(chainForm.budgetThreshold) || 0,
        steps: chainForm.steps,
      }
      if (editingChainId) {
        const updated = await api.put<ApprovalChain>(`/pcp/approval-chains/${editingChainId}`, payload)
        setChains((c) => c.map((x) => (x.id === editingChainId ? updated : x)))
        notify('success', 'Approval chain updated')
      } else {
        const created = await api.post<ApprovalChain>('/pcp/approval-chains', payload)
        setChains((c) => [...c, created])
        notify('success', 'Approval chain created')
      }
      setChainForm({ steps: ['BU Head', 'Finance Manager'] })
      setEditingChainId(null)
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to save chain')
    } finally {
      setSaving(false)
    }
  }

  const deleteChain = async (id: string) => {
    if (!window.confirm('Delete this approval chain?')) return
    try {
      await api.delete(`/pcp/approval-chains/${id}`)
      setChains((c) => c.filter((x) => x.id !== id))
      notify('success', 'Approval chain deleted')
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to delete chain')
    }
  }

  const updateUser = async (user: ExtendedPcpUser, password?: string) => {
    try {
      const payload: Record<string, unknown> = {
        role: user.role,
        businessUnit: user.businessUnit,
        active: user.active,
        onLeave: Boolean(user.onLeave),
        approvalDelegateId: user.approvalDelegateId || null,
      }
      if (password?.trim()) payload.password = password.trim()
      const updated = await api.put<ExtendedPcpUser>(`/pcp/users/${user.id}`, payload)
      await fetchUsers()

      const authUser = useAuthStore.getState().user
      if (authUser?.id === user.id) {
        const merged = { ...authUser, ...updated, pcpRole: updated.role, fullName: authUser.fullName }
        useAuthStore.setState({ user: merged })
        useAppStore.getState().setCurrentUser(merged)
      }
      notify('success', `${user.name} updated`)
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to update user')
    }
  }

  const createUser = async () => {
    if (!newUser.fullName.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      notify('error', 'Name, email, and password are required')
      return
    }
    if (newUser.password.length < 6) {
      notify('error', 'Password must be at least 6 characters')
      return
    }
    if (!newUser.businessUnit) {
      notify('error', 'Select a business unit')
      return
    }
    setSaving(true)
    const createdEmail = newUser.email.trim()
    try {
      await api.post('/pcp/users', {
        fullName: newUser.fullName.trim(),
        email: createdEmail,
        password: newUser.password,
        role: newUser.role,
        businessUnit: newUser.businessUnit,
        designation: newUser.designation.trim() || undefined,
      })
      await fetchUsers()
      setNewUser({
        fullName: '',
        email: '',
        password: '',
        role: 'Requester',
        businessUnit: businessUnits[0] || '',
        designation: '',
      })
      setShowAddUser(false)
      notify('success', `User ${createdEmail} created`)
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  const masterItems = useMemo(() => {
    if (!masters) return []
    switch (masterCategory) {
      case 'clients': return masters.clients
      case 'jobFamilies': return masters.jobFamilies
      case 'locations': return masters.locations
      case 'benefits': return masters.benefits
      case 'costCenters': return masters.costCenters.map((c) => `${c.code} — ${c.name}`)
      case 'grades': return masters.grades.map((g) => `${g.code} (${g.bandMin}–${g.bandMax})`)
      default: return []
    }
  }, [masters, masterCategory])

  const addMasterItem = async () => {
    setSaving(true)
    try {
      let value: string | { code: string; name: string } | { code: string; bandMin: number; bandMax: number } = newItem.trim()
      if (masterCategory === 'costCenters') {
        if (!ccForm.code.trim()) {
          notify('error', 'Cost center code is required')
          return
        }
        value = { code: ccForm.code.trim(), name: ccForm.name.trim() || ccForm.code.trim() }
        setCcForm({ code: '', name: '' })
      } else if (masterCategory === 'grades') {
        if (!gradeForm.code.trim()) {
          notify('error', 'Grade code is required')
          return
        }
        value = { code: gradeForm.code.trim(), bandMin: Number(gradeForm.bandMin) || 0, bandMax: Number(gradeForm.bandMax) || 0 }
        setGradeForm({ code: '', bandMin: '', bandMax: '' })
      } else if (!newItem.trim()) {
        notify('error', 'Enter a value to add')
        return
      }
      const updated = await api.post<PcpMasters>('/pcp/masters/items', { category: masterCategory, value })
      setMasters(updated)
      setNewItem('')
      notify('success', 'Master item added')
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to add item')
    } finally {
      setSaving(false)
    }
  }

  const removeMasterItem = async (index: number) => {
    if (!window.confirm('Delete this item?')) return
    try {
      const updated = await api.delete<PcpMasters>(`/pcp/masters/items/${masterCategory}/${index}`)
      setMasters(updated)
      notify('success', 'Item deleted')
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to delete item')
    }
  }

  const saveMasterEdit = async (index: number) => {
    if (!editValue.trim()) return
    try {
      const updated = await api.put<PcpMasters>(`/pcp/masters/items/${masterCategory}/${index}`, { value: editValue.trim() })
      setMasters(updated)
      setEditIndex(null)
      setEditValue('')
      notify('success', 'Item updated')
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to update item')
    }
  }

  const canEditMasterInline = masterCategory !== 'costCenters' && masterCategory !== 'grades'

  return (
    <div className="space-y-4 animate-fade-in min-w-0 sm:space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Administration</h1>
          <p className="text-muted-foreground">Approval chains, master data, and user access</p>
        </div>
      </div>

      {flash && <FlashBanner message={flash.text} type={flash.type} />}

      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {([
          ['chains', 'Approval Chains'],
          ['masters', 'Masters'],
          ['users', 'Users'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              tab === key ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'chains' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Approval Chains</CardTitle>
              <Button size="sm" onClick={() => { setEditingChainId(null); setChainForm({ steps: ['BU Head', 'Finance Manager', 'HR Director'] }) }}>
                <Plus className="mr-1 h-4 w-4" /> Add Chain
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {chains.length === 0 ? (
                <p className="text-sm text-muted-foreground">No chains yet. Add one below.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-4">Business Unit</th>
                      <th className="py-2 pr-4">Grade Range</th>
                      <th className="py-2 pr-4">Budget Threshold</th>
                      <th className="py-2 pr-4">Steps</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chains.map((c) => (
                      <tr key={c.id} className="border-b border-border/60">
                        <td className="py-3 pr-4 font-medium">{c.businessUnit}</td>
                        <td className="py-3 pr-4">{c.gradeMin} – {c.gradeMax}</td>
                        <td className="py-3 pr-4">{c.budgetThreshold.toLocaleString()} AED</td>
                        <td className="py-3 pr-4">{c.steps.join(' → ')}</td>
                        <td className="py-3">
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="action-icon-btn" onClick={() => { setEditingChainId(c.id); setChainForm(c) }}>
                              <Pencil />
                            </Button>
                            <Button size="icon" variant="ghost" className="action-icon-btn text-primary" onClick={() => void deleteChain(c.id)}>
                              <Trash2 />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{editingChainId ? 'Edit Chain' : 'New Approval Chain'}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Business Unit</label>
                <Select value={chainForm.businessUnit || ''} onChange={(e) => setChainForm({ ...chainForm, businessUnit: e.target.value })}>
                  <option value="">Select BU</option>
                  {businessUnits.map((bu) => <option key={bu} value={bu}>{bu}</option>)}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Grade Min / Max</label>
                <div className="flex gap-2">
                  <Input placeholder="B1" value={chainForm.gradeMin || ''} onChange={(e) => setChainForm({ ...chainForm, gradeMin: e.target.value })} />
                  <Input placeholder="B3" value={chainForm.gradeMax || ''} onChange={(e) => setChainForm({ ...chainForm, gradeMax: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Budget Threshold (AED)</label>
                <Input type="number" value={chainForm.budgetThreshold ?? ''} onChange={(e) => setChainForm({ ...chainForm, budgetThreshold: Number(e.target.value) })} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Approval Steps (comma-separated)</label>
                <Input
                  value={(chainForm.steps || []).join(', ')}
                  onChange={(e) => setChainForm({ ...chainForm, steps: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-4 flex gap-2">
                <Button onClick={() => void saveChain()} disabled={saving}>{editingChainId ? 'Update Chain' : 'Save Chain'}</Button>
                {editingChainId && (
                  <Button variant="outline" onClick={() => { setEditingChainId(null); setChainForm({ steps: ['BU Head', 'Finance Manager'] }) }}>Cancel</Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'masters' && (
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-[220px_1fr]">
          <Card>
            <CardContent className="space-y-1 p-2 pt-4">
              {MASTER_TABS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setMasterCategory(key); setEditIndex(null) }}
                  className={cn(
                    'w-full rounded-lg px-3 py-2 text-left text-sm',
                    masterCategory === key ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-muted',
                  )}
                >
                  {label}
                </button>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{MASTER_TABS.find((t) => t.key === masterCategory)?.label}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {masterCategory === 'costCenters' ? (
                  <>
                    <Input placeholder="Code e.g. CC305" value={ccForm.code} onChange={(e) => setCcForm({ ...ccForm, code: e.target.value })} className="w-32" />
                    <Input placeholder="Name" value={ccForm.name} onChange={(e) => setCcForm({ ...ccForm, name: e.target.value })} className="flex-1" />
                  </>
                ) : masterCategory === 'grades' ? (
                  <>
                    <Input placeholder="Code" value={gradeForm.code} onChange={(e) => setGradeForm({ ...gradeForm, code: e.target.value })} className="w-24" />
                    <Input placeholder="Min" value={gradeForm.bandMin} onChange={(e) => setGradeForm({ ...gradeForm, bandMin: e.target.value })} className="w-24" />
                    <Input placeholder="Max" value={gradeForm.bandMax} onChange={(e) => setGradeForm({ ...gradeForm, bandMax: e.target.value })} className="w-24" />
                  </>
                ) : (
                  <Input placeholder="Add new item…" value={newItem} onChange={(e) => setNewItem(e.target.value)} className="flex-1" onKeyDown={(e) => e.key === 'Enter' && void addMasterItem()} />
                )}
                <Button onClick={() => void addMasterItem()} disabled={saving}><Plus className="mr-1 h-4 w-4" /> Add</Button>
              </div>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {masterItems.map((item, i) => (
                  <li key={`${item}-${i}`} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    {editIndex === i && canEditMasterInline ? (
                      <div className="flex flex-1 gap-2">
                        <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="flex-1" />
                        <Button size="sm" onClick={() => void saveMasterEdit(i)}>Save</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditIndex(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1">{item}</span>
                        <div className="flex gap-1">
                          {canEditMasterInline && (
                            <Button size="icon" variant="ghost" className="action-icon-btn" onClick={() => { setEditIndex(i); setEditValue(String(item)) }}>
                              <Pencil />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="action-icon-btn text-primary" onClick={() => void removeMasterItem(i)}>
                            <Trash2 />
                          </Button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
                {!masterItems.length && <li className="px-3 py-4 text-muted-foreground">No items yet.</li>}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Add User</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowAddUser((v) => !v)}>
                <Plus className="mr-1 h-4 w-4" />
                {showAddUser ? 'Hide form' : 'New user'}
              </Button>
            </CardHeader>
            {showAddUser && (
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Full name</label>
                  <Input
                    value={newUser.fullName}
                    onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                    placeholder="Muhammad Imran"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Email (login)</label>
                  <Input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="name@descon.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Password</label>
                  <Input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Min. 6 characters"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">PCP role</label>
                  <Select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as PcpRole })}>
                    {PCP_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Business unit</label>
                  <Select value={newUser.businessUnit} onChange={(e) => setNewUser({ ...newUser, businessUnit: e.target.value })}>
                    {businessUnits.map((bu) => <option key={bu} value={bu}>{bu}</option>)}
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Designation (optional)</label>
                  <Input
                    value={newUser.designation}
                    onChange={(e) => setNewUser({ ...newUser, designation: e.target.value })}
                    placeholder="Project Coordinator"
                  />
                </div>
                <div className="flex items-end sm:col-span-2 lg:col-span-3">
                  <Button onClick={() => void createUser()} disabled={saving}>
                    Create user
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader><CardTitle>PCP Users</CardTitle></CardHeader>
            <CardContent className="table-scroll">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Role</th>
                    <th className="py-2 pr-3">Business Unit</th>
                    <th className="py-2 pr-3">Active</th>
                    <th className="py-2 pr-3">On Leave</th>
                    <th className="py-2 pr-3">Approval Delegate</th>
                    <th className="py-2 pr-3">New password</th>
                    <th className="py-2">Save</th>
                  </tr>
                </thead>
                <tbody>
                  {(users as ExtendedPcpUser[]).map((u) => (
                    <UserRow key={u.id} user={u} businessUnits={businessUnits} allUsers={users} onSave={updateUser} />
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function UserRow({
  user,
  businessUnits,
  allUsers,
  onSave,
}: {
  user: ExtendedPcpUser
  businessUnits: string[]
  allUsers: PcpUser[]
  onSave: (u: ExtendedPcpUser, password?: string) => Promise<void>
}) {
  const [draft, setDraft] = useState(user)
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => setDraft(user), [user])

  const save = async () => {
    setSaving(true)
    try {
      await onSave(draft, newPassword)
      setNewPassword('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr className="border-b border-border/60">
      <td className="py-3 pr-3">
        <p className="font-medium">{draft.name}</p>
        <p className="text-xs text-muted-foreground">{draft.email}</p>
      </td>
      <td className="py-3 pr-3">
        <Select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as PcpRole })}>
          {PCP_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </Select>
      </td>
      <td className="py-3 pr-3">
        <Select value={draft.businessUnit} onChange={(e) => setDraft({ ...draft, businessUnit: e.target.value })}>
          {businessUnits.map((bu) => <option key={bu} value={bu}>{bu}</option>)}
        </Select>
      </td>
      <td className="py-3 pr-3 text-center">
        <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
      </td>
      <td className="py-3 pr-3 text-center">
        <input type="checkbox" checked={Boolean(draft.onLeave)} onChange={(e) => setDraft({ ...draft, onLeave: e.target.checked })} />
      </td>
      <td className="py-3 pr-3">
        <Select
          value={draft.approvalDelegateId || ''}
          onChange={(e) => setDraft({ ...draft, approvalDelegateId: e.target.value || null })}
        >
          <option value="">None</option>
          {allUsers.filter((x) => x.id !== draft.id).map((x) => (
            <option key={x.id} value={x.id}>{x.name}</option>
          ))}
        </Select>
      </td>
      <td className="py-3 pr-3">
        <Input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Leave blank to keep"
          className="min-w-[140px] text-xs"
          autoComplete="new-password"
        />
      </td>
      <td className="py-3">
        <Button size="sm" variant="outline" disabled={saving} onClick={() => void save()}>Save</Button>
      </td>
    </tr>
  )
}
