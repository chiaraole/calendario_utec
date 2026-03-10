import { useMemo } from 'react'

const DAYS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const DAYS_SHORT = ['Lun','Mar','Mié','Jue','Vie','Sáb']
const START_HOUR = 7
const END_HOUR = 23
const PX_PER_HOUR = 52          // must match .hour-cell height in CSS
const PRACTICA_START = '09:00'
const PRACTICA_END   = '16:00'

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function grupoShort(name) {
  return name.replace('TEORÍA VIRTUAL','T.Virt').replace('TEORÍA','T').replace('LABORATORIO','Lab')
}

function shortDocente(docente) {
  if (!docente) return ''
  const parts = docente.split(',')
  if (parts.length >= 2) return `${parts[0].trim()}, ${parts[1].trim().charAt(0)}.`
  return docente.split(' ').slice(0,2).join(' ')
}

function timeToPx(timeStr) {
  return (timeToMinutes(timeStr) - START_HOUR * 60) / 60 * PX_PER_HOUR
}

function PracticaBand({ type }) {
  const top    = timeToPx(PRACTICA_START)
  const height = timeToPx(PRACTICA_END) - top
  return (
    <div
      className={`practica-band practica-band-${type}`}
      style={{ top: `${top}px`, height: `${height}px` }}
      title={type === 'presencial' ? 'Práctica presencial — choca con clases presenciales' : 'Práctica virtual — sin restricciones'}
    >
      <span className="practica-band-label">
        {type === 'presencial' ? '🏢 Prácticas (Pres.)' : '💻 Prácticas (Virt.)'}
      </span>
    </div>
  )
}

function CalendarBlock({ slot }) {
  const top    = timeToPx(slot.start)
  const height = timeToPx(slot.end) - top
  const isShort = height < (PX_PER_HOUR * 70 / 60)
  const isMed   = height >= (PX_PER_HOUR * 70 / 60) && height < (PX_PER_HOUR * 110 / 60)
  const isConflict = slot.hasConflict

  const tooltip = [
    slot.courseName, slot.grupoName,
    `${slot.start} – ${slot.end}`,
    slot.ubicacion, slot.docente,
    `Vacantes: ${slot.vacantes} | Matriculados: ${slot.matriculados}`,
    isConflict ? (slot.hasPracticaConflict ? '⚠️ Choque con prácticas presenciales' : '⚠️ Choque de horario') : ''
  ].filter(Boolean).join('\n')

  return (
    <div
      className={`cal-block${isConflict ? ' conflict' : ''}`}
      style={{
        top: `${top}px`, height: `${height}px`,
        backgroundColor: isConflict ? '#FFF0F0' : slot.color.bg,
        borderColor:     isConflict ? '#D94040' : slot.color.border,
        color:           isConflict ? '#8A1A1A' : slot.color.text,
      }}
      title={tooltip}
    >
      <div className="cal-block-inner">
        {isConflict && <div className="cal-conflict-badge">⚠️ {slot.hasPracticaConflict ? 'Choque práctica' : 'Choque'}</div>}
        <div className="cal-course-name">{slot.courseName}</div>
        {!isShort && <div className="cal-grupo">{grupoShort(slot.grupoName)}</div>}
        {!isShort && slot.ubicacion && <div className="cal-location">📍 {slot.ubicacion.replace('UTEC-BA ','')}</div>}
        {!isMed && !isShort && slot.docente && <div className="cal-docente">👤 {shortDocente(slot.docente)}</div>}
        {!isMed && !isShort && (
          <div className="cal-vacantes">
            <span className={slot.vacantes - slot.matriculados <= 5 ? 'vacantes-low' : 'vacantes-ok'}>
              {slot.matriculados}/{slot.vacantes} matric.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CalendarView({ selectedSlots, practicaConfig, conflictCount }) {
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i)

  const slotsByDay = useMemo(() => {
    const byDay = Array.from({ length: 6 }, () => [])
    selectedSlots.forEach(slot => { if (slot.day >= 0 && slot.day < 6) byDay[slot.day].push(slot) })
    return byDay
  }, [selectedSlots])

  const { enabled, presencialDays } = practicaConfig
  const virtualDays = enabled ? [0,1,2,3,4].filter(d => !presencialDays.includes(d)) : []

  return (
    <div className="calendar-view">
      <div className="calendar-header-row">
        <div className="time-gutter"/>
        {DAYS.map((day, i) => (
          <div key={day} className={`day-header${slotsByDay[i].length > 0 ? ' has-events' : ''}${enabled && presencialDays.includes(i) ? ' prac-pres' : ''}${enabled && virtualDays.includes(i) ? ' prac-virt' : ''}`}>
            <span className="day-full">{day}</span>
            <span className="day-short">{DAYS_SHORT[i]}</span>
            {enabled && presencialDays.includes(i) && <span className="day-prac-badge">🏢 Pres.</span>}
            {enabled && virtualDays.includes(i)    && <span className="day-prac-badge virt">💻 Virt.</span>}
          </div>
        ))}
      </div>

      {conflictCount > 0 && (
        <div className="conflict-banner">
          ⚠️ {conflictCount} choque{conflictCount > 1 ? 's' : ''} de horario detectado{conflictCount > 1 ? 's' : ''}
        </div>
      )}

      <div className="calendar-body">
        {/* Time labels column */}
        <div className="time-column">
          {hours.map(h => (
            <div key={h} className="time-cell">
              <span className="time-label">{String(h).padStart(2,'0')}:00</span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {DAYS.map((day, dayIndex) => {
          const isPres = enabled && presencialDays.includes(dayIndex)
          const isVirt = enabled && virtualDays.includes(dayIndex)
          return (
            <div key={day} className={`day-column${isPres ? ' col-pres' : isVirt ? ' col-virt' : ''}`}>
              {hours.map(h => <div key={h} className="hour-cell"/>)}
              <div className="blocks-layer">
                {isPres && <PracticaBand type="presencial"/>}
                {isVirt && <PracticaBand type="virtual"/>}
                {slotsByDay[dayIndex].map((slot, i) => (
                  <CalendarBlock key={`${slot.courseCode}-${slot.grupoName}-${i}`} slot={slot}/>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {selectedSlots.length === 0 && !enabled && (
        <div className="empty-calendar">
          <div className="empty-icon">📋</div>
          <p>Selecciona una sección de un curso para ver sus horarios aquí</p>
        </div>
      )}
    </div>
  )
}