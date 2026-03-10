import { useMemo } from 'react'

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const START_HOUR = 7
const END_HOUR = 23
const TOTAL_HOURS = END_HOUR - START_HOUR

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function grupoShort(name) {
  return name
    .replace('TEORÍA VIRTUAL', 'T.Virt')
    .replace('TEORÍA', 'T')
    .replace('LABORATORIO', 'Lab')
}

function shortDocente(docente) {
  if (!docente) return ''
  const parts = docente.split(',')
  if (parts.length >= 2) {
    const last = parts[0].trim()
    const initial = parts[1].trim().charAt(0)
    return `${last}, ${initial}.`
  }
  return docente.split(' ').slice(0, 2).join(' ')
}

function CalendarBlock({ slot, totalMinutes }) {
  const startMin = timeToMinutes(slot.start) - START_HOUR * 60
  const endMin = timeToMinutes(slot.end) - START_HOUR * 60
  const top = (startMin / totalMinutes) * 100
  const height = ((endMin - startMin) / totalMinutes) * 100
  const duration = endMin - startMin
  const isShort = duration < 70
  const isMed = duration >= 70 && duration < 110

  const tooltip = [
    slot.courseName,
    slot.grupoName,
    `${slot.start} – ${slot.end}`,
    slot.ubicacion,
    slot.docente,
    `Vacantes: ${slot.vacantes} | Matriculados: ${slot.matriculados}`,
    slot.hasConflict ? '⚠️ Choque de horario' : ''
  ].filter(Boolean).join('\n')

  const isConflict = slot.hasConflict

  return (
    <div
      className={`cal-block${isConflict ? ' conflict' : ''}`}
      style={{
        top: `${top}%`,
        height: `${height}%`,
        backgroundColor: isConflict ? '#FFF0F0' : slot.color.bg,
        borderColor: isConflict ? '#D94040' : slot.color.border,
        color: isConflict ? '#8A1A1A' : slot.color.text,
      }}
      title={tooltip}
    >
      <div className="cal-block-inner">
        {isConflict && <div className="cal-conflict-badge">⚠️ Choque</div>}
        <div className="cal-course-name">{slot.courseName}</div>
        {!isShort && (
          <div className="cal-grupo">{grupoShort(slot.grupoName)}</div>
        )}
        {!isShort && slot.ubicacion && (
          <div className="cal-location">📍 {slot.ubicacion.replace('UTEC-BA ', '')}</div>
        )}
        {!isMed && !isShort && slot.docente && (
          <div className="cal-docente">👤 {shortDocente(slot.docente)}</div>
        )}
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

export default function CalendarView({ selectedSlots }) {
  const totalMinutes = TOTAL_HOURS * 60
  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i)

  const slotsByDay = useMemo(() => {
    const byDay = Array.from({ length: 6 }, () => [])
    selectedSlots.forEach(slot => {
      if (slot.day >= 0 && slot.day < 6) byDay[slot.day].push(slot)
    })
    return byDay
  }, [selectedSlots])

  const hasAnySlot = selectedSlots.length > 0
  const conflictCount = selectedSlots.filter(s => s.hasConflict).length

  return (
    <div className="calendar-view">
      <div className="calendar-header-row">
        <div className="time-gutter" />
        {DAYS.map((day, i) => (
          <div key={day} className={`day-header${slotsByDay[i].length > 0 ? ' has-events' : ''}`}>
            <span className="day-full">{day}</span>
            <span className="day-short">{DAYS_SHORT[i]}</span>
          </div>
        ))}
      </div>

      {conflictCount > 0 && (
        <div className="conflict-banner">
          ⚠️ {conflictCount} choque{conflictCount > 1 ? 's' : ''} de horario detectado{conflictCount > 1 ? 's' : ''}
        </div>
      )}

      <div className="calendar-body">
        <div className="time-column">
          {hours.map(h => (
            <div key={h} className="time-cell">
              <span className="time-label">{String(h).padStart(2, '0')}:00</span>
            </div>
          ))}
        </div>

        {DAYS.map((day, dayIndex) => (
          <div key={day} className="day-column">
            {hours.map(h => <div key={h} className="hour-cell" />)}
            <div className="blocks-layer">
              {slotsByDay[dayIndex].map((slot, i) => (
                <CalendarBlock
                  key={`${slot.courseCode}-${slot.grupoName}-${i}`}
                  slot={slot}
                  totalMinutes={totalMinutes}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {!hasAnySlot && (
        <div className="empty-calendar">
          <div className="empty-icon">📋</div>
          <p>Selecciona una sección de un curso para ver sus horarios aquí</p>
        </div>
      )}
    </div>
  )
}