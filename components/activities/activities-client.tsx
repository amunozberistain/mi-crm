'use client'

import { useState, useEffect, useCallback } from 'react'
import WeekView   from './week-view'
import MonthView  from './month-view'
import EventModal, { type SavePayload } from './event-modal'
import { getActivities, createActivity, updateActivity, deleteActivity } from '@/app/(dashboard)/activities/actions'
import type { Activity, GoogleCalendarEvent } from '@/types'

type CalView = 'week' | 'month'

function startOfWeek(d: Date): Date {
  const r = new Date(d)
  const dow = r.getDay() === 0 ? 6 : r.getDay() - 1  // Mon=0
  r.setDate(r.getDate() - dow)
  r.setHours(0, 0, 0, 0)
  return r
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 6)
  const sameMonth = weekStart.getMonth() === end.getMonth()
  const locale = 'es-ES'
  if (sameMonth) {
    return `${weekStart.getDate()} – ${end.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}`
  }
  return `${weekStart.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}`
}

function formatMonthTitle(d: Date): string {
  return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
}

interface Props {
  initialActivities: Activity[]
  isGoogleConnected: boolean
}

export default function ActivitiesClient({ initialActivities, isGoogleConnected }: Props) {
  const [view,         setView]         = useState<CalView>('week')
  const [currentDate,  setCurrentDate]  = useState(() => startOfWeek(new Date()))
  const [activities,   setActivities]   = useState<Activity[]>(initialActivities)
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([])
  const [gConnected,   setGConnected]   = useState(isGoogleConnected)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [googleError,   setGoogleError]   = useState<string | null>(null)

  const [modalOpen,    setModalOpen]    = useState(false)
  const [editActivity, setEditActivity] = useState<Activity | undefined>()
  const [createDate,   setCreateDate]   = useState<Date | undefined>()

  // ── Date range for current view ─────────────────────────────────────────────

  const rangeStart = view === 'week'
    ? currentDate
    : new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)

  const rangeEnd = view === 'week'
    ? addDays(currentDate, 6)
    : new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

  // ── Fetch activities when range changes ─────────────────────────────────────

  const fetchActivities = useCallback(async () => {
    try {
      const data = await getActivities(rangeStart.toISOString(), rangeEnd.toISOString())
      setActivities(data)
    } catch (e) {
      console.error('[activities] fetch error', e)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeStart.toISOString(), rangeEnd.toISOString()])

  useEffect(() => { void fetchActivities() }, [fetchActivities])

  // ── Fetch Google events ──────────────────────────────────────────────────────

  const fetchGoogleEvents = useCallback(async () => {
    if (!gConnected) return
    setLoadingGoogle(true)
    setGoogleError(null)
    try {
      const res = await fetch(
        `/api/google/events?start=${rangeStart.toISOString()}&end=${addDays(rangeEnd, 1).toISOString()}`
      )
      if (res.ok) {
        setGoogleEvents(await res.json() as GoogleCalendarEvent[])
      } else {
        const msg = await res.text()
        console.error('[activities] google events error', res.status, msg)
        setGoogleError(msg || `Error ${res.status}`)
      }
    } catch (e) {
      console.error('[activities] google fetch error', e)
      setGoogleError('Error de conexión con Google Calendar')
    } finally {
      setLoadingGoogle(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gConnected, rangeStart.toISOString(), rangeEnd.toISOString()])

  useEffect(() => { void fetchGoogleEvents() }, [fetchGoogleEvents])

  // ── Handle query params after Google OAuth redirect ─────────────────────────

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('google_connected') === '1') {
      setGConnected(true)
      window.history.replaceState({}, '', '/activities')
    }
    if (params.get('google_error')) {
      console.warn('[activities] Google OAuth error:', params.get('google_error'))
      window.history.replaceState({}, '', '/activities')
    }
  }, [])

  // ── Navigation ───────────────────────────────────────────────────────────────

  function goToToday() {
    setCurrentDate(view === 'week' ? startOfWeek(new Date()) : new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  }

  function goPrev() {
    setCurrentDate(d => view === 'week' ? addDays(d, -7) : addMonths(d, -1))
  }

  function goNext() {
    setCurrentDate(d => view === 'week' ? addDays(d, 7) : addMonths(d, 1))
  }

  // ── View switch: preserve the week/month around today ────────────────────────

  function switchView(v: CalView) {
    setView(v)
    if (v === 'week') setCurrentDate(startOfWeek(new Date()))
    else setCurrentDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  }

  // ── Modal handlers ───────────────────────────────────────────────────────────

  function openCreateModal(date?: Date) {
    setEditActivity(undefined)
    setCreateDate(date)
    setModalOpen(true)
  }

  function openEditModal(activity: Activity) {
    setEditActivity(activity)
    setCreateDate(undefined)
    setModalOpen(true)
  }

  async function handleSave(payload: SavePayload) {
    if (editActivity) {
      await updateActivity(editActivity.id, payload)
      setActivities(prev => prev.map(a =>
        a.id === editActivity.id ? { ...a, ...payload, google_event_id: a.google_event_id } : a
      ))
    } else {
      const created = await createActivity({ ...payload, deal_id: null, contact_id: null })
      setActivities(prev => [...prev, created])
    }
    if (payload.syncToGoogle) void fetchGoogleEvents()
  }

  async function handleDelete() {
    if (!editActivity) return
    await deleteActivity(editActivity.id)
    setActivities(prev => prev.filter(a => a.id !== editActivity.id))
    if (editActivity.google_event_id) void fetchGoogleEvents()
  }

  async function handleDisconnectGoogle() {
    setDisconnecting(true)
    try {
      await fetch('/api/google/disconnect', { method: 'POST' })
      setGConnected(false)
      setGoogleEvents([])
    } finally {
      setDisconnecting(false)
    }
  }

  const title = view === 'week' ? formatWeekRange(currentDate) : formatMonthTitle(currentDate)

  return (
    <div className="flex flex-col h-full -m-6">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-200 bg-white shrink-0 flex-wrap">

        {/* Today + nav */}
        <div className="flex items-center gap-1">
          <button
            onClick={goToToday}
            className="text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 transition-colors"
          >
            Hoy
          </button>
          <button onClick={goPrev} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={goNext} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Title */}
        <h2 className="text-base font-semibold text-gray-900 capitalize flex-1 min-w-0 truncate">{title}</h2>

        {/* View toggle */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm shrink-0">
          {(['week', 'month'] as CalView[]).map(v => (
            <button
              key={v}
              onClick={() => switchView(v)}
              className={`px-3 py-1.5 font-medium transition-colors ${
                view === v ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {v === 'week' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>

        {/* Google Calendar */}
        <div className="flex items-center gap-2 shrink-0">
          {gConnected ? (
            <>
              <button
                onClick={() => void fetchGoogleEvents()}
                disabled={loadingGoogle}
                title="Sincronizar con Google Calendar"
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-40 transition-colors"
              >
                <svg className={`w-4 h-4 ${loadingGoogle ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                Google Calendar
              </span>
              <button
                onClick={handleDisconnectGoogle}
                disabled={disconnecting}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                title="Desconectar Google Calendar"
              >
                ✕
              </button>
            </>
          ) : (
            <a
              href="/api/google/auth"
              className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Conectar Google Calendar
            </a>
          )}
        </div>

        {/* New task button */}
        <button
          onClick={() => openCreateModal()}
          className="flex items-center gap-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva tarea
        </button>
      </div>

      {/* ── Google error banner ── */}
      {googleError && (
        <div className="shrink-0 flex items-center gap-2 px-5 py-2 bg-red-50 border-b border-red-200 text-sm text-red-700">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Google Calendar: {googleError}</span>
          <button onClick={() => setGoogleError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* ── Calendar body ── */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-white">
        {view === 'week' ? (
          <WeekView
            activities={activities}
            googleEvents={googleEvents}
            weekStart={currentDate}
            onSlotClick={openCreateModal}
            onEventClick={openEditModal}
          />
        ) : (
          <MonthView
            activities={activities}
            googleEvents={googleEvents}
            monthDate={currentDate}
            onDayClick={openCreateModal}
            onEventClick={openEditModal}
          />
        )}
      </div>

      {/* ── Modal ── */}
      <EventModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialDate={createDate}
        activity={editActivity}
        isGoogleConnected={gConnected}
        onSave={handleSave}
        onDelete={editActivity ? handleDelete : undefined}
      />
    </div>
  )
}
