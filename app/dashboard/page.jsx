'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '../../lib/supabase'

const SHARED_PASSWORD = 'btaiops2024'

const DAYS = [
  { key: 'mon', label: 'Monday',    sub: '' },
  { key: 'tue', label: 'Tuesday',   sub: 'Governance call prep' },
  { key: 'wed', label: 'Wednesday', sub: 'RAID meetings' },
  { key: 'thu', label: 'Thursday',  sub: 'Report inputs due 1pm' },
  { key: 'fri', label: 'Friday',    sub: 'Weekly reports sent' },
]

const PRIORITIES = ['high', 'medium', 'low', 'ongoing']

const PRIORITY_STYLES = {
  high:    { bg: '#FCEBEB', border: '#F09595', text: '#A32D2D', badge: '#F7C1C1' },
  medium:  { bg: '#FAEEDA', border: '#FAC775', text: '#633806', badge: '#FAC775' },
  low:     { bg: '#EAF3DE', border: '#C0DD97', text: '#3B6D11', badge: '#C0DD97' },
  ongoing: { bg: '#E6F1FB', border: '#B5D4F4', text: '#0C447C', badge: '#B5D4F4' },
}

const TAGS = ['Jira', 'Sprint', 'Governance', 'RAID', 'Report', 'Deliverables', 'Stakeholders', 'Finance']

export default function Dashboard() {
  const supabase = createClient()
  const [authed, setAuthed] = useState(false)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState(false)
  const [tasks, setTasks] = useState([])
  const [overrides, setOverrides] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [editingTask, setEditingTask] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTask, setNewTask] = useState({ name: '', meta: '', day: 'mon', default_priority: 'medium', tag: 'Jira' })
  const [saving, setSaving] = useState(false)
  const [notesDraft, setNotesDraft] = useState('')

  const fetchData = useCallback(async () => {
    const [{ data: tasksData }, { data: overridesData }] = await Promise.all([
      supabase.from('tasks').select('*').order('day').order('created_at'),
      supabase.from('task_overrides').select('*'),
    ])
    setTasks(tasksData || [])
    const overrideMap = {}
    for (const o of (overridesData || [])) overrideMap[o.task_id] = o
    setOverrides(overrideMap)
  }, [supabase])

  useEffect(() => {
    const saved = sessionStorage.getItem('bt_authed')
    if (saved === 'yes') {
      setAuthed(true)
      fetchData().finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [fetchData])

  function handleLogin() {
    if (pwInput === SHARED_PASSWORD) {
      sessionStorage.setItem('bt_authed', 'yes')
      setAuthed(true)
      setLoading(true)
      fetchData().finally(() => setLoading(false))
    } else {
      setPwError(true)
    }
  }

  const getEffectivePriority = (task) => overrides[task.id]?.priority || task.default_priority
  const getNotes = (task) => overrides[task.id]?.notes || ''

  async function setPriority(task, priority) {
    const existing = overrides[task.id]
    if (existing) {
      await supabase.from('task_overrides').update({ priority, updated_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await supabase.from('task_overrides').insert({ task_id: task.id, user_id: '00000000-0000-0000-0000-000000000000', priority, notes: '' })
    }
    setOverrides(prev => ({ ...prev, [task.id]: { ...prev[task.id], task_id: task.id, priority } }))
  }

  async function saveNotes(task) {
    setSaving(true)
    const existing = overrides[task.id]
    const priority = getEffectivePriority(task)
    if (existing) {
      await supabase.from('task_overrides').update({ notes: notesDraft, updated_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await supabase.from('task_overrides').insert({ task_id: task.id, user_id: '00000000-0000-0000-0000-000000000000', priority, notes: notesDraft })
    }
    setOverrides(prev => ({ ...prev, [task.id]: { ...prev[task.id], notes: notesDraft } }))
    setSaving(false)
    setEditingTask(null)
  }

  async function deleteTask(taskId) {
    await supabase.from('tasks').delete().eq('id', taskId)
    setTasks(prev => prev.filter(t => t.id !== taskId))
    setEditingTask(null)
  }

  async function addTask() {
    setSaving(true)
    const { data } = await supabase.from('tasks').insert(newTask).select().single()
    if (data) setTasks(prev => [...prev, data])
    setShowAddModal(false)
    setNewTask({ name: '', meta: '', day: 'mon', default_priority: 'medium', tag: 'Jira' })
    setSaving(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f8f6', fontFamily: 'Inter, system-ui, sans-serif', color: '#888780', fontSize: 14 }}>
      Loading tracker...
    </div>
  )

  if (!authed) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f8f6', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ background: '#fff', border: '0.5px solid #e0e0dc', borderRadius: 16, padding: '2.5rem 2rem', width: '100%', maxWidth: 380 }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: '#1a1a18', marginBottom: 4 }}>BT AI Ops</div>
        <div style={{ fontSize: 14, color: '#888780', marginBottom: 24 }}>Weekly Follow-up Tracker</div>
        <label style={{ fontSize: 13, color: '#5f5e5a', display: 'block', marginBottom: 6 }}>Password</label>
        <input
          type="password"
          value={pwInput}
          onChange={e => { setPwInput(e.target.value); setPwError(false) }}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          placeholder="Enter shared password"
          style={{ width: '100%', padding: '9px 12px', fontSize: 14, border: `0.5px solid ${pwError ? '#f09595' : '#d3d1c7'}`, borderRadius: 8, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
        />
        {pwError && <div style={{ fontSize: 13, color: '#a32d2d', marginBottom: 12 }}>Incorrect password</div>}
        <button onClick={handleLogin} style={{ width: '100%', padding: '10px', fontSize: 14, fontWeight: 500, background: '#1a1a18', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          Enter
        </button>
      </div>
    </div>
  )

  const allTags = ['All', ...TAGS]
  const weekTasks = tasks.filter(t => t.day !== 'monthly')
  const monthlyTasks = tasks.filter(t => t.day === 'monthly')
  const filtered = filter === 'All' ? weekTasks : weekTasks.filter(t => t.tag === filter)
  const highCount = weekTasks.filter(t => getEffectivePriority(t) === 'high').length
  const busiest = DAYS.map(d => ({ label: d.label, count: filtered.filter(t => t.day === d.key).length })).reduce((a, b) => a.count >= b.count ? a : b)

  return (
    <div style={{ minHeight: '100vh', background: '#f8f8f6', fontFamily: 'Inter, system-ui, sans-serif', padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#1a1a18' }}>Weekly Follow-up Tracker</div>
          <div style={{ fontSize: 13, color: '#888780', marginTop: 2 }}>BT AI Ops</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowAddModal(true)} style={btnStyle('#1a1a18', '#fff')}>+ Add task</button>
          <button onClick={() => { sessionStorage.removeItem('bt_authed'); setAuthed(false) }} style={btnStyle('#fff', '#1a1a18')}>Lock</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: '1.5rem' }}>
        {[
          { label: 'Weekly tasks', value: weekTasks.length, sub: 'across 5 days' },
          { label: 'High priority', value: highCount, sub: 'need attention', valueColor: '#a32d2d' },
          { label: 'Busiest day', value: busiest.label, sub: `${busiest.count} tasks`, valueSize: 15 },
          { label: 'Monthly tasks', value: monthlyTasks.length, sub: 'tracked separately' },
        ].map((c, i) => (
          <div key={i} style={{ background: '#fff', border: '0.5px solid #e0e0dc', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ fontSize: 12, color: '#888780', marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: c.valueSize || 22, fontWeight: 600, color: c.valueColor || '#1a1a18' }}>{c.value}</div>
            <div style={{ fontSize: 11, color: '#b4b2a9', marginTop: 2 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
        {allTags.map(t => (
          <button key={t} onClick={() => setFilter(t)} style={{
            fontSize: 12, padding: '5px 13px', borderRadius: 8,
            border: '0.5px solid', borderColor: filter === t ? '#1a1a18' : '#d3d1c7',
            background: filter === t ? '#1a1a18' : 'transparent',
            color: filter === t ? '#fff' : '#5f5e5a', cursor: 'pointer',
          }}>{t}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 10, marginBottom: '1.5rem' }}>
        {DAYS.map(d => {
          const dayTasks = filtered.filter(t => t.day === d.key)
          return (
            <div key={d.key} style={{ background: '#fff', border: '0.5px solid #e0e0dc', borderRadius: 12, padding: 12, minHeight: 260 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#5f5e5a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{d.label}</div>
              {d.sub && <div style={{ fontSize: 11, color: '#b4b2a9', marginBottom: 8 }}>{d.sub}</div>}
              {dayTasks.length === 0 && <div style={{ fontSize: 12, color: '#b4b2a9', paddingTop: 4 }}>No tasks</div>}
              {dayTasks.map(task => {
                const p = getEffectivePriority(task)
                const s = PRIORITY_STYLES[p]
                return (
                  <div key={task.id} onClick={() => { setEditingTask(task); setNotesDraft(getNotes(task)) }}
                    style={{ background: s.bg, border: `0.5px solid ${s.border}`, borderRadius: 8, padding: '8px 10px', marginBottom: 8, cursor: 'pointer' }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: s.text, lineHeight: 1.4 }}>{task.name}</div>
                    <div style={{ fontSize: 11, color: s.text, opacity: 0.8, marginTop: 2 }}>{task.meta}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 }}>
                      <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 99, background: s.badge, color: s.text, fontWeight: 500 }}>{p}</span>
                      {getNotes(task) && <span style={{ fontSize: 10, color: s.text, opacity: 0.7 }}>📝</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      <div style={{ background: '#fff', border: '0.5px solid #e0e0dc', borderRadius: 12, padding: '14px 16px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#5f5e5a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Monthly tasks</div>
        {monthlyTasks.map(task => {
          const p = getEffectivePriority(task)
          const s = PRIORITY_STYLES[p]
          return (
            <div key={task.id} onClick={() => { setEditingTask(task); setNotesDraft(getNotes(task)) }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: '#f8f8f6', marginBottom: 6, cursor: 'pointer' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: '#1a1a18', fontWeight: 500 }}>{task.name}</div>
                <div style={{ fontSize: 12, color: '#888780' }}>{task.meta}</div>
              </div>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: s.badge, color: s.text, fontWeight: 500 }}>{p}</span>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#f1efe8', color: '#5f5e5a' }}>{task.tag}</span>
            </div>
          )
        })}
      </div>

      {editingTask && (
        <Modal onClose={() => setEditingTask(null)}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a18', marginBottom: 4 }}>{editingTask.name}</div>
          <div style={{ fontSize: 13, color: '#888780', marginBottom: 16 }}>{editingTask.meta}</div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Priority</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PRIORITIES.map(p => {
                const s = PRIORITY_STYLES[p]
                const active = getEffectivePriority(editingTask) === p
                return (
                  <button key={p} onClick={() => setPriority(editingTask, p)} style={{
                    fontSize: 12, padding: '5px 13px', borderRadius: 99,
                    background: active ? s.bg : 'transparent',
                    border: `0.5px solid ${active ? s.border : '#d3d1c7'}`,
                    color: active ? s.text : '#5f5e5a', cursor: 'pointer', fontWeight: active ? 500 : 400,
                  }}>{p}</button>
                )
              })}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Notes</label>
            <textarea
              value={notesDraft}
              onChange={e => setNotesDraft(e.target.value)}
              placeholder="Add any context for this task this week..."
              rows={3}
              style={{ width: '100%', fontSize: 13, padding: '8px 10px', border: '0.5px solid #d3d1c7', borderRadius: 8, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => saveNotes(editingTask)} disabled={saving} style={btnStyle('#1a1a18', '#fff')}>{saving ? 'Saving...' : 'Save notes'}</button>
            <button onClick={() => { if (confirm('Delete this task?')) deleteTask(editingTask.id) }} style={btnStyle('#fff', '#a32d2d', '#f09595')}>Delete</button>
          </div>
        </Modal>
      )}

      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a18', marginBottom: 16 }}>Add new task</div>
          {[
            { label: 'Task name', key: 'name', placeholder: 'e.g. Sprint review' },
            { label: 'Description', key: 'meta', placeholder: 'e.g. Review progress with squad leads' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 12 }}>
              <label style={labelStyle}>{f.label}</label>
              <input type="text" value={newTask[f.key]} onChange={e => setNewTask(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                style={{ width: '100%', fontSize: 13, padding: '8px 10px', border: '0.5px solid #d3d1c7', borderRadius: 8, boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Day', key: 'day', options: [...DAYS.map(d => ({ value: d.key, label: d.label })), { value: 'monthly', label: 'Monthly' }] },
              { label: 'Priority', key: 'default_priority', options: PRIORITIES.map(p => ({ value: p, label: p })) },
              { label: 'Tag', key: 'tag', options: TAGS.map(t => ({ value: t, label: t })) },
            ].map(f => (
              <div key={f.key}>
                <label style={labelStyle}>{f.label}</label>
                <select value={newTask[f.key]} onChange={e => setNewTask(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width: '100%', fontSize: 13, padding: '7px 10px', border: '0.5px solid #d3d1c7', borderRadius: 8, fontFamily: 'inherit', background: '#fff' }}>
                  {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            ))}
          </div>
          <button onClick={addTask} disabled={saving || !newTask.name} style={btnStyle('#1a1a18', '#fff')}>
            {saving ? 'Adding...' : 'Add task'}
          </button>
        </Modal>
      )}
    </div>
  )
}

function Modal({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', width: '100%', maxWidth: 440, boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
        {children}
      </div>
    </div>
  )
}

const labelStyle = { fontSize: 12, color: '#5f5e5a', display: 'block', marginBottom: 6 }
const btnStyle = (bg, color, borderColor) => ({
  padding: '8px 16px', fontSize: 13, fontWeight: 500,
  background: bg, color: color,
  border: `0.5px solid ${borderColor || bg}`,
  borderRadius: 8, cursor: 'pointer',
})