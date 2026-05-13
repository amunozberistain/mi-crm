'use client'

import { useRef, useEffect, useLayoutEffect, useState } from 'react'
import type { Activity, GoogleCalendarEvent } from '@/types'

// 1 minute = 1px
const HOUR_H = 60
const GRID_H  = 24 * HOUR_H
const START_SCROLL = 8 * HOUR_H

interface CalEvent {
  id: string; title: string; start_at: string; end_at: string
  color: string; isGoogle: boolean; is_all_day?: boolean; html_link?: string | null
}

interface EventLayout { event: CalEvent; col: number; totalCols: number }

function layoutDayEvents(events: CalEvent[]): EventLayout[] {
  if (!events.length) return []
  const sorted = [...events].sort((a, b) => +new Date(a.start_at) - +new Date(b.start_at))
  const colEnds: number[] = []
  const placed: Array<{ event: CalEvent; col: number }> = []

  for (const ev of sorted) {
    const start = +new Date(ev.start_at)
    const end   = +new Date(ev.end_at)
    let col = colEnds.findIndex(e => e <= start)
    if (col === -1) { col = colEnds.length; colEnds.push(end) }
    else colEnds[col] = end
    placed.push({ event: ev, col })
  }

  return placed.map(p => {
    const start = +new Date(p.event.start_at)
    const end   = +new Date(p.event.end_at)
    let maxCol = p.col
    for (const o of placed) {
      if (o.event.id === p.event.id) continue
      const os = +new Date(o.event.start_at), oe = +new Date(o.event.end_at)
      if (os < end && oe > start) maxCol = Math.max(maxCol, o.col)
    }
    return { event: p.event, col: p.col, totalCols: maxCol + 1 }
  })
}

function minuteOfDay(iso: string): number {
  const d = new Date(iso)
  return d.getHours() * 60 + d.getMinutes()
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
}

function formatHour(h: number) {
  return `${h}:00`
}

interface Props {
  activities:   Activity[]
  googleEvents: GoogleCalendarEvent[]
  weekStart:    Date
  onSlotClick:  (date: Date) => void
  onEventClick: (activity: Activity) => void
}

export default function WeekView({ activities, googleEvents, weekStart, onSlotClick, onEventClick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [currentMin, setCurrentMin] = useState(() => {
    const n = new Date(); return n.getHours() * 60 + n.getMinutes()
  })

  useLayoutEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = START_SCROLL - 30
    }
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date(); setCurrentMin(n.getHours() * 60 + n.getMinutes())
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  const today = new Date()

  function eventsForDay(day: Date): CalEvent[] {
    const acts = activities
      .filter(a => !a.google_event_id && isSameDay(new Date(a.start_at), day))
      .map(a => ({ id: a.id, title: a.title, start_at: a.start_at, end_at: a.end_at, color: a.color, isGoogle: false }))

    const goog = googleEvents
      .filter(g => !g.is_all_day && isSameDay(new Date(g.start_at), day))
      .map(g => ({ id: g.id, title: g.title, start_at: g.start_at, end_at: g.end_at, color: '#039be5', isGoogle: true, html_link: g.html_link }))

    return [...acts, ...goog]
  }

  function allDayForDay(day: Date): GoogleCalendarEvent[] {
    return googleEvents.filter(g => g.is_all_day && isSameDay(new Date(g.start_at), day))
  }

  function handleSlotClick(day: Date, e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const relY = e.clientY - rect.top + (scrollRef.current?.scrollTop ?? 0)
    const totalMinutes = Math.round(relY / 15) * 15
    const h = Math.min(23, Math.floor(totalMinutes / 60))
    const m = totalMinutes % 60
    const clicked = new Date(day)
    clicked.setHours(h, m, 0, 0)
    onSlotClick(clicked)
  }

  const hasAnyAllDay = days.some(d => allDayForDay(d).length > 0)

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

      {/* Day headers */}
      <div className="flex shrink-0 border-b border-[#D4C5B0] bg-white">
        <div className="w-14 shrink-0" />
        {days.map((day, i) => {
          const isToday = isSameDay(day, today)
          const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
          return (
            <div key={i} className="flex-1 py-2 text-center border-l border-[#D4C5B0]/40">
              <p className="text-xs font-medium text-[#8B6F5E] uppercase tracking-wide">{dayNames[i]}</p>
              <p className={`text-xl font-bold mt-0.5 w-9 mx-auto rounded-full leading-9 ${
                isToday ? 'bg-[#5C3D2E] text-white' : 'text-[#2C1810]'
              }`}>
                {day.getDate()}
              </p>
            </div>
          )
        })}
      </div>

      {/* All-day row */}
      {hasAnyAllDay && (
        <div className="flex shrink-0 border-b border-[#D4C5B0] bg-white min-h-[32px]">
          <div className="w-14 shrink-0 flex items-center justify-end pr-2">
            <span className="text-xs text-[#8B6F5E]">todo el día</span>
          </div>
          {days.map((day, i) => (
            <div key={i} className="flex-1 border-l border-[#D4C5B0]/40 px-1 py-1 space-y-0.5">
              {allDayForDay(day).map(ev => (
                <a
                  key={ev.id}
                  href={ev.html_link ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-xs font-medium text-white rounded px-1.5 py-0.5"
                  style={{ backgroundColor: '#039be5' }}
                  title={ev.title}
                >
                  {ev.title}
                </a>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex" style={{ height: GRID_H }}>

          {/* Time labels */}
          <div className="w-14 shrink-0 relative select-none">
            {Array.from({ length: 24 }, (_, h) => (
              <div
                key={h}
                className="absolute right-2 text-xs text-[#8B6F5E]/70 tabular-nums"
                style={{ top: h * HOUR_H - 7 }}
              >
                {formatHour(h)}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, di) => {
            const dayEvents = eventsForDay(day)
            const layouts   = layoutDayEvents(dayEvents)
            const isToday   = isSameDay(day, today)

            return (
              <div
                key={di}
                className="flex-1 border-l border-[#D4C5B0]/40 relative cursor-pointer"
                onClick={e => handleSlotClick(day, e)}
              >
                {/* Hour lines */}
                {Array.from({ length: 24 }, (_, h) => (
                  <div
                    key={h}
                    className="absolute inset-x-0 border-t border-[#D4C5B0]/30 pointer-events-none"
                    style={{ top: h * HOUR_H }}
                  />
                ))}
                {/* Half-hour dashes */}
                {Array.from({ length: 24 }, (_, h) => (
                  <div
                    key={`h${h}`}
                    className="absolute inset-x-0 border-t border-dashed border-[#D4C5B0]/15 pointer-events-none"
                    style={{ top: h * HOUR_H + 30 }}
                  />
                ))}

                {/* Current time line */}
                {isToday && (
                  <div
                    className="absolute inset-x-0 z-20 pointer-events-none"
                    style={{ top: currentMin }}
                  >
                    <div className="flex items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400 -ml-1.5 shrink-0" />
                      <div className="flex-1 h-0.5 bg-red-400" />
                    </div>
                  </div>
                )}

                {/* Events */}
                {layouts.map(({ event, col, totalCols }) => {
                  const startMin = minuteOfDay(event.start_at)
                  const endMin   = minuteOfDay(event.end_at)
                  const height   = Math.max(24, endMin - startMin)
                  const pct      = 96 / totalCols
                  const leftPct  = col * pct + 1

                  const inner = (
                    <div
                      className="absolute rounded-md px-1.5 py-0.5 overflow-hidden text-white cursor-pointer hover:brightness-90 transition-all select-none z-10"
                      style={{
                        top:    startMin,
                        height,
                        left:   `${leftPct}%`,
                        width:  `${pct - 1}%`,
                        backgroundColor: event.color,
                        fontSize: height < 32 ? 10 : 12,
                      }}
                      onClick={e => {
                        e.stopPropagation()
                        if (!event.isGoogle) {
                          const act = activities.find(a => a.id === event.id)
                          if (act) onEventClick(act)
                        }
                      }}
                      title={event.title}
                    >
                      <span className="font-semibold leading-tight line-clamp-2">{event.title}</span>
                      {height >= 40 && (
                        <span className="block opacity-80 text-[10px] leading-tight">
                          {new Date(event.start_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          {' – '}
                          {new Date(event.end_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {event.isGoogle && (
                        <span className="absolute top-0.5 right-1 text-[9px] font-bold opacity-70">G</span>
                      )}
                    </div>
                  )

                  if (event.isGoogle && event.html_link) {
                    return (
                      <a key={event.id} href={event.html_link} target="_blank" rel="noopener noreferrer" className="block">
                        {inner}
                      </a>
                    )
                  }
                  return <div key={event.id}>{inner}</div>
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
