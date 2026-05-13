'use client'

import type { Activity, GoogleCalendarEvent } from '@/types'

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
}

interface CalEvent {
  id: string; title: string; start_at: string; color: string; isGoogle: boolean; html_link?: string | null
}

interface Props {
  activities:   Activity[]
  googleEvents: GoogleCalendarEvent[]
  monthDate:    Date
  onDayClick:   (date: Date) => void
  onEventClick: (activity: Activity) => void
}

export default function MonthView({ activities, googleEvents, monthDate, onDayClick, onEventClick }: Props) {
  const today = new Date()
  const year  = monthDate.getFullYear()
  const month = monthDate.getMonth()

  const firstDay = new Date(year, month, 1)
  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const totalCells  = Math.ceil((startDow + daysInMonth) / 7) * 7

  const cells = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - startDow + 1
    if (dayNum < 1 || dayNum > daysInMonth) return null
    return new Date(year, month, dayNum)
  })

  function eventsForDay(day: Date): CalEvent[] {
    const acts = activities
      .filter(a => isSameDay(new Date(a.start_at), day))
      .map(a => ({ id: a.id, title: a.title, start_at: a.start_at, color: a.color, isGoogle: false }))
      .sort((a, b) => +new Date(a.start_at) - +new Date(b.start_at))

    const goog = googleEvents
      .filter(g => isSameDay(new Date(g.start_at), day))
      .map(g => ({ id: g.id, title: g.title, start_at: g.start_at, color: '#039be5', isGoogle: true, html_link: g.html_link }))
      .sort((a, b) => +new Date(a.start_at) - +new Date(b.start_at))

    return [...acts, ...goog]
  }

  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-[#D4C5B0] shrink-0 bg-[#EDE8DF]">
        {dayNames.map(d => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-[#8B6F5E] uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        className="grid grid-cols-7 flex-1"
        style={{ gridTemplateRows: `repeat(${totalCells / 7}, minmax(0, 1fr))` }}
      >
        {cells.map((day, idx) => {
          if (!day) {
            return <div key={idx} className="border-r border-b border-[#D4C5B0]/30 bg-[#F5F0E8]/50" />
          }

          const isToday   = isSameDay(day, today)
          const isWeekend = idx % 7 >= 5
          const events    = eventsForDay(day)
          const shown     = events.slice(0, 3)
          const overflow  = events.length - 3

          return (
            <div
              key={idx}
              onClick={() => onDayClick(day)}
              className={`border-r border-b border-[#D4C5B0]/30 p-1 cursor-pointer group overflow-hidden transition-colors
                ${isWeekend ? 'bg-[#F5F0E8]/60' : 'bg-white'}
                hover:bg-[#EDE8DF]/50`}
            >
              {/* Day number */}
              <div className="flex justify-center mb-1">
                <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full transition-colors
                  ${isToday ? 'bg-[#5C3D2E] text-white' : 'text-[#2C1810] group-hover:bg-[#D4C5B0]/50'}`}
                >
                  {day.getDate()}
                </span>
              </div>

              {/* Events */}
              {shown.map(ev => {
                const label = (
                  <div
                    key={ev.id}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-white text-[11px] font-medium truncate mb-0.5 cursor-pointer hover:brightness-90"
                    style={{ backgroundColor: ev.color }}
                    title={ev.title}
                    onClick={e => {
                      e.stopPropagation()
                      if (!ev.isGoogle) {
                        const act = activities.find(a => a.id === ev.id)
                        if (act) onEventClick(act)
                      }
                    }}
                  >
                    {ev.isGoogle && <span className="text-[9px] font-bold opacity-70">G</span>}
                    <span className="truncate">{ev.title}</span>
                  </div>
                )

                if (ev.isGoogle && ev.html_link) {
                  return (
                    <a key={ev.id} href={ev.html_link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                      {label}
                    </a>
                  )
                }
                return label
              })}

              {overflow > 0 && (
                <p className="text-[11px] text-[#8B6F5E] pl-1">{overflow} más</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
