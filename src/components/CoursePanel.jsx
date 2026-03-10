import { useState, useMemo } from 'react'

function getGrupoType(grupoName) {
  const n = grupoName.toUpperCase()
  if (n.includes('LABORATORIO')) return 'lab'
  if (n.includes('VIRTUAL')) return 'virtual'
  return 'teoria'
}

function GrupoTag({ name }) {
  const type = getGrupoType(name)
  const short = name.replace('TEORÍA VIRTUAL','T.Virt').replace('TEORÍA','T').replace('LABORATORIO','Lab')
  return <span className={`grupo-tag grupo-${type}`} title={name}>{short}</span>
}

function getDayInfo(grupos) {
  const activeDays = new Set()
  grupos.forEach(g => g.slots.forEach(s => activeDays.add(s.dayStr)))
  return activeDays
}

const DAY_LABELS = ['L','M','X','J','V','S']
const DAY_NAMES  = ['Lun','Mar','Mie','Jue','Vie','Sab']

function DayDots({ grupos, color, isSelected }) {
  const active = getDayInfo(grupos)
  return (
    <div className="section-days">
      {DAY_NAMES.map((d,i) => (
        <span key={d} className={`day-dot${active.has(d)?' active':''}`}
          style={active.has(d)&&isSelected&&color?{backgroundColor:color.border}:{}}>
          {DAY_LABELS[i]}
        </span>
      ))}
    </div>
  )
}

function SectionCard({ unit, isSelected, onSelect, color }) {
  return (
    <button className={`section-card${isSelected?' selected':''}`} onClick={onSelect}
      style={isSelected?{backgroundColor:color.light,borderColor:color.border,borderWidth:'2px'}:{}}>
      <div className="section-header">
        <span className="section-label">{unit.label}</span>
        {isSelected && <span className="check-icon">✓</span>}
      </div>
      <div className="section-grupos">{unit.grupos.map(g=><GrupoTag key={g.name} name={g.name}/>)}</div>
      <DayDots grupos={unit.grupos} color={color} isSelected={isSelected}/>
    </button>
  )
}

function UnitPill({ unit, isSelected, onSelect, color }) {
  return (
    <button className={`unit-pill${isSelected?' selected':''}`} onClick={onSelect}
      style={isSelected?{backgroundColor:color.light,borderColor:color.border}:{}}>
      <div className="unit-pill-top">
        <span className="unit-pill-label">{unit.subLabel}</span>
        {isSelected && <span className="check-icon small">✓</span>}
      </div>
      <DayDots grupos={unit.grupos} color={color} isSelected={isSelected}/>
    </button>
  )
}

function CourseCard({ course, selectedSlots, onSelectUnit, onRemoveSlots, getCourseColor }) {
  const [expanded, setExpanded] = useState(false)
  const color = getCourseColor(course.code)
  const sections = Object.entries(course.sections)
  const isAnySelected = selectedSlots.some(s => s.courseCode === course.code)
  const selectedUnitId = selectedSlots.find(s => s.courseCode === course.code)?.unitId
  const totalUnits = sections.reduce((sum,[,sec]) => sum+(sec.units?.length||1), 0)

  return (
    <div className={`course-card${isAnySelected?' course-active':''}`}
      style={isAnySelected?{borderLeftColor:color.border,borderLeftWidth:'3px'}:{}}>
      <button className="course-header" onClick={() => setExpanded(v=>!v)}>
        <div className="course-title-row">
          {isAnySelected && <span className="course-color-dot" style={{backgroundColor:color.border}}/>}
          <div className="course-title-text">
            <span className="course-code">{course.code}</span>
            <span className="course-name">{course.name}</span>
          </div>
        </div>
        <div className="course-meta">
          <span className="section-count">{totalUnits} opc.</span>
          <span className={`expand-arrow${expanded?' open':''}`}>›</span>
        </div>
      </button>

      {expanded && (
        <div className="sections-list">
          {sections.map(([sectionKey, section]) => {
            const units = section.units || []
            const hasAlternatives = units.length > 1
            if (!hasAlternatives) {
              const unit = units[0]
              if (!unit) return null
              const isSelected = selectedUnitId === unit.id
              return <SectionCard key={unit.id} unit={unit} isSelected={isSelected} color={color} onSelect={() => onSelectUnit(course.code, course.name, unit.id, unit.grupos)}/>
            }
            return (
              <div key={sectionKey} className="section-group">
                <div className="section-group-header">
                  <span className="section-group-label">Sección {sectionKey}</span>
                  {section.sharedGrupos?.length > 0 && (
                    <div className="shared-row">
                      {section.sharedGrupos.map(g=><GrupoTag key={g.name} name={g.name}/>)}
                      <span className="shared-label">para todos</span>
                    </div>
                  )}
                </div>
                <div className="unit-pills-grid">
                  {units.map(unit => {
                    const isSelected = selectedUnitId === unit.id
                    return <UnitPill key={unit.id} unit={unit} isSelected={isSelected} color={color} onSelect={() => onSelectUnit(course.code, course.name, unit.id, unit.grupos)}/>
                  })}
                </div>
              </div>
            )
          })}
          {isAnySelected && (
            <button className="remove-btn" onClick={e=>{e.stopPropagation();onRemoveSlots(course.code)}}>
              Quitar del calendario
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Practica Selector ──
const WEEKDAYS = ['Lun','Mar','Mié','Jue','Vie']
const WEEKDAY_FULL = ['Lunes','Martes','Miércoles','Jueves','Viernes']

function PracticaPanel({ practicaConfig, onPracticaChange }) {
  const { enabled, presencialDays } = practicaConfig

  function toggleEnabled() {
    onPracticaChange({ enabled: !enabled, presencialDays: !enabled ? [] : presencialDays })
  }

  function toggleDay(dayIdx) {
    if (!enabled) return
    const already = presencialDays.includes(dayIdx)
    if (already) {
      onPracticaChange({ ...practicaConfig, presencialDays: presencialDays.filter(d => d !== dayIdx) })
    } else {
      if (presencialDays.length >= 2) return // max 2 presencial days
      onPracticaChange({ ...practicaConfig, presencialDays: [...presencialDays, dayIdx] })
    }
  }

  const virtualDays = enabled ? [0,1,2,3,4].filter(d => !presencialDays.includes(d)) : []

  return (
    <div className={`practica-panel${enabled?' practica-active':''}`}>
      <div className="practica-header">
        <div className="practica-title-row">
          <span className="practica-icon">🏢</span>
          <div>
            <span className="practica-title">Prácticas Preprofesionales</span>
            <span className="practica-subtitle">09:00 – 16:00</span>
          </div>
        </div>
        <button className={`practica-toggle${enabled?' on':''}`} onClick={toggleEnabled}>
          <span className="toggle-knob"/>
        </button>
      </div>

      {enabled && (
        <div className="practica-body">
          <p className="practica-hint">Selecciona 2 días <strong>presenciales</strong> ({presencialDays.length}/2)</p>
          <div className="practica-days-row">
            {WEEKDAYS.map((label, i) => {
              const isPresencial = presencialDays.includes(i)
              const isVirtual = virtualDays.includes(i)
              const isDisabled = !isPresencial && presencialDays.length >= 2
              return (
                <button
                  key={i}
                  className={`practica-day-btn${isPresencial?' pres':isVirtual?' virt':''}${isDisabled?' disabled':''}`}
                  onClick={() => toggleDay(i)}
                  disabled={isDisabled}
                  title={isPresencial?`${WEEKDAY_FULL[i]} — Presencial`:isVirtual?`${WEEKDAY_FULL[i]} — Virtual`:`${WEEKDAY_FULL[i]}`}
                >
                  {label}
                  {isPresencial && <span className="day-mode-badge">P</span>}
                  {isVirtual && <span className="day-mode-badge virt-badge">V</span>}
                </button>
              )
            })}
          </div>
          {presencialDays.length > 0 && (
            <div className="practica-legend">
              <span className="legend-dot pres-dot"/> Presencial — choca con clases presenciales
              <br/>
              <span className="legend-dot virt-dot"/> Virtual — sin restricciones
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function CoursePanel({ courses, meta, selectedSlots, onSelectUnit, onRemoveSlots, getCourseColor, onReset, practicaConfig, onPracticaChange }) {
  const [search, setSearch] = useState('')

  const courseList = useMemo(() => Object.values(courses).sort((a,b) => a.name.localeCompare(b.name)), [courses])
  const filtered = useMemo(() => {
    if (!search.trim()) return courseList
    const q = search.toLowerCase()
    return courseList.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
  }, [courseList, search])

  const selectedCourses = [...new Set(selectedSlots.map(s => s.courseCode))]

  return (
    <div className="course-panel">
      <div className="panel-header">
        <div className="panel-title">
          <button className="reset-btn" onClick={onReset}>← Volver</button>
          <div>
            <h2>Cursos</h2>
            {meta['Carrera'] && <p className="carrera-label">{meta['Carrera']}</p>}
          </div>
        </div>
        {selectedCourses.length > 0 && (
          <div className="selected-summary">{selectedCourses.length} curso{selectedCourses.length>1?'s':''} seleccionado{selectedCourses.length>1?'s':''}</div>
        )}
      </div>

      <PracticaPanel practicaConfig={practicaConfig} onPracticaChange={onPracticaChange}/>

      <div className="search-box">
        <span className="search-icon">🔍</span>
        <input type="text" placeholder="Buscar curso o código..." value={search} onChange={e=>setSearch(e.target.value)}/>
        {search && <button className="clear-search" onClick={()=>setSearch('')}>×</button>}
      </div>

      <div className="course-list">
        <div className="course-count">{filtered.length} curso{filtered.length!==1?'s':''}</div>
        {filtered.map(course => (
          <CourseCard key={course.code} course={course} selectedSlots={selectedSlots}
            onSelectUnit={onSelectUnit} onRemoveSlots={onRemoveSlots} getCourseColor={getCourseColor}/>
        ))}
      </div>
    </div>
  )
}