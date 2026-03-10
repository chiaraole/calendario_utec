import { useState, useCallback } from 'react'
import * as XLSX from 'xlsx'
import CoursePanel from './components/CoursePanel'
import CalendarView from './components/CalendarView'
import './App.css'

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function slotsOverlap(s1, s2) {
  if (s1.day !== s2.day) return false
  return timeToMinutes(s1.start) < timeToMinutes(s2.end) &&
         timeToMinutes(s2.start) < timeToMinutes(s1.end)
}

function getBaseType(name) {
  return name.replace(/[\s\d.]+$/, '').trim()
}

export function computeSelectableUnits(sectionData, sectionKey) {
  const grupos = Object.values(sectionData.grupos)

  const byBase = {}
  grupos.forEach(g => {
    const base = getBaseType(g.name)
    if (!byBase[base]) byBase[base] = []
    byBase[base].push(g)
  })

  const sharedGrupos = []
  const individualByBase = {}

  Object.entries(byBase).forEach(([base, typeGrupos]) => {
    if (typeGrupos.length === 1) {
      sharedGrupos.push(typeGrupos[0])
    } else {
      individualByBase[base] = typeGrupos
    }
  })

  if (Object.keys(individualByBase).length === 0) {
    return {
      sharedGrupos: [],
      units: [{ id: sectionKey, sectionKey, label: `Sección ${sectionKey}`, subLabel: null, grupos: sharedGrupos }]
    }
  }

  const classroomMap = {}

  Object.values(individualByBase).forEach(typeGrupos => {
    typeGrupos.forEach(g => {
      const match = g.name.match(/(\d+(?:\.\d+)?)\s*$/)
      const numStr = match ? match[1] : g.name
      let subKey = numStr
      if (!numStr.includes('.') && numStr.startsWith(sectionKey) && numStr.length > sectionKey.length) {
        subKey = numStr.slice(sectionKey.length)
      } else if (numStr.startsWith(sectionKey + '.')) {
        subKey = numStr.slice(sectionKey.length + 1)
      }
      if (!classroomMap[subKey]) classroomMap[subKey] = { subKey, grupos: [] }
      classroomMap[subKey].grupos.push(g)
    })
  })

  const units = Object.values(classroomMap).map(({ subKey, grupos: indGrupos }) => {
    const shortLabel = indGrupos
      .map(g => g.name
        .replace('TEORÍA VIRTUAL', 'T.Virt')
        .replace('TEORÍA', 'T')
        .replace('LABORATORIO', 'Lab'))
      .join(' + ')
    return {
      id: `${sectionKey}-${subKey}`,
      sectionKey,
      label: `Sección ${sectionKey}`,
      subLabel: shortLabel,
      grupos: [...sharedGrupos, ...indGrupos]
    }
  })

  return { sharedGrupos, units }
}

function parseHorario(horarioStr) {
  if (!horarioStr) return null
  const dayMap = { 'Lun': 0, 'Mar': 1, 'Mie': 2, 'Jue': 3, 'Vie': 4, 'Sab': 5 }
  const match = horarioStr.match(/^(\w+)\.\s*(\d+:\d+)\s*-\s*(\d+:\d+)/)
  if (!match) return null
  const [, dayStr, start, end] = match
  const dayIndex = dayMap[dayStr]
  if (dayIndex === undefined) return null
  return { day: dayIndex, dayStr, start, end }
}

function parseExcel(data) {
  const workbook = XLSX.read(data, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })

  let headerRow = -1
  for (let i = 0; i < rows.length; i++) {
    if (rows[i] && rows[i][0] === 'Código Curso') { headerRow = i; break }
  }
  if (headerRow === -1) return { courses: {}, meta: {} }

  const meta = {}
  for (let i = 0; i < headerRow; i++) {
    const row = rows[i]
    if (row && row[0] && row[1]) meta[row[0]] = row[1]
  }

  const coursesMap = {}

  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || !row[0]) continue
    const [code, name, section, grupo, modalidad, horario, frecuencia, ubicacion, vacantes, matriculados, docente] = row
    if (!code || !name) continue
    const parsedHorario = parseHorario(horario)
    if (!parsedHorario) continue

    const codeStr = String(code).trim()
    if (!coursesMap[codeStr]) {
      coursesMap[codeStr] = { code: codeStr, name: String(name).trim(), sections: {} }
    }
    const sectionKey = String(section).trim()
    if (!coursesMap[codeStr].sections[sectionKey]) {
      coursesMap[codeStr].sections[sectionKey] = { section: sectionKey, grupos: {} }
    }
    const grupoKey = String(grupo).trim()
    if (!coursesMap[codeStr].sections[sectionKey].grupos[grupoKey]) {
      coursesMap[codeStr].sections[sectionKey].grupos[grupoKey] = {
        name: grupoKey,
        modalidad: String(modalidad || '').trim(),
        docente: String(docente || '').trim(),
        slots: []
      }
    }
    coursesMap[codeStr].sections[sectionKey].grupos[grupoKey].slots.push({
      ...parsedHorario,
      ubicacion: String(ubicacion || '').trim(),
      frecuencia: String(frecuencia || '').trim(),
      vacantes: Number(vacantes) || 0,
      matriculados: Number(matriculados) || 0
    })
  }

  Object.values(coursesMap).forEach(course => {
    Object.entries(course.sections).forEach(([sectionKey, section]) => {
      const computed = computeSelectableUnits(section, sectionKey)
      section.sharedGrupos = computed.sharedGrupos
      section.units = computed.units
    })
  })

  return { courses: coursesMap, meta }
}

const PASTEL_COLORS = [
  { bg: '#FFE4E1', border: '#E8A09A', text: '#7A2E2A', light: '#FFF5F4' },
  { bg: '#DEEEFF', border: '#90BFEE', text: '#1A4E8A', light: '#F0F7FF' },
  { bg: '#E2F5E2', border: '#8FCC91', text: '#1E6B21', light: '#F2FBF2' },
  { bg: '#FFF3D6', border: '#E8C56A', text: '#7A5200', light: '#FFFBF0' },
  { bg: '#EDE3FF', border: '#B899F0', text: '#4A22A0', light: '#F8F5FF' },
  { bg: '#D8F5EF', border: '#7ECFBC', text: '#1A6A5A', light: '#F0FBF8' },
  { bg: '#FFE8F4', border: '#E89AC4', text: '#7A1A55', light: '#FFF5FA' },
  { bg: '#FFF0DC', border: '#E8B878', text: '#7A4800', light: '#FFFBF5' },
  { bg: '#E0F0FF', border: '#88C0F0', text: '#1A4080', light: '#F0F8FF' },
  { bg: '#F0FFE0', border: '#A8E080', text: '#2A6000', light: '#F8FFF0' },
  { bg: '#FFE0E8', border: '#F0A0B8', text: '#8A1A40', light: '#FFF5F8' },
  { bg: '#E8F8E0', border: '#98D880', text: '#2A6818', light: '#F5FBF0' },
]

let colorIndex = 0
const colorCache = {}

function getCourseColor(code) {
  if (!colorCache[code]) {
    colorCache[code] = PASTEL_COLORS[colorIndex % PASTEL_COLORS.length]
    colorIndex++
  }
  return colorCache[code]
}

export default function App() {
  const [data, setData] = useState(null)
  const [selectedSlots, setSelectedSlots] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [conflictWarning, setConflictWarning] = useState(null)

  const handleFile = useCallback((file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = parseExcel(new Uint8Array(e.target.result))
      setData(result)
      setSelectedSlots([])
      colorIndex = 0
      Object.keys(colorCache).forEach(k => delete colorCache[k])
    }
    reader.readAsArrayBuffer(file)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleSelectUnit = useCallback((courseCode, courseName, unitId, gruposToAdd) => {
    const color = getCourseColor(courseCode)
    setConflictWarning(null)

    setSelectedSlots(prev => {
      const isSelected = prev.some(s => s.courseCode === courseCode && s.unitId === unitId)
      if (isSelected) {
        return prev.filter(s => !(s.courseCode === courseCode && s.unitId === unitId))
      }

      const withoutCourse = prev.filter(s => s.courseCode !== courseCode)

      const newSlots = []
      gruposToAdd.forEach(grupo => {
        grupo.slots.forEach(slot => {
          const hasConflict = withoutCourse.some(es => slotsOverlap(es, slot))
          newSlots.push({
            ...slot,
            courseCode, courseName, unitId,
            grupoName: grupo.name,
            modalidad: grupo.modalidad,
            docente: grupo.docente,
            color,
            hasConflict
          })
        })
      })

      const conflictCount = newSlots.filter(s => s.hasConflict).length
      if (conflictCount > 0) {
        setTimeout(() => {
          setConflictWarning(`⚠️ "${courseName}" tiene ${conflictCount} choque${conflictCount > 1 ? 's' : ''} de horario`)
          setTimeout(() => setConflictWarning(null), 4000)
        }, 0)
      }

      return [...withoutCourse, ...newSlots]
    })
  }, [])

  const handleRemoveSlots = useCallback((courseCode) => {
    setSelectedSlots(prev => {
      const updated = prev.filter(s => s.courseCode !== courseCode)
      // Re-check conflicts after removal
      return updated.map((slot, _, arr) => ({
        ...slot,
        hasConflict: arr.some((other, oi) => {
          if (other === slot) return false
          return slotsOverlap(slot, other) && other.courseCode !== slot.courseCode
        })
      }))
    })
    setConflictWarning(null)
  }, [])

  return (
    <div className="app">
      {!data ? (
        <div
          className={`upload-screen${isDragging ? ' dragging' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div className="upload-card">
            <div className="upload-emoji">🗓️</div>
            <h1>Planificador de Horarios</h1>
            <p className="upload-subtitle">Carga tu Excel de consulta de horarios para organizar tu semana</p>
            <label className="upload-btn">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
                style={{ display: 'none' }}
              />
              <span>📂</span> Seleccionar archivo Excel
            </label>
            <p className="upload-hint">o arrastra el archivo aquí</p>
          </div>
        </div>
      ) : (
        <div className="main-layout">
          {conflictWarning && (
            <div className="conflict-toast">{conflictWarning}</div>
          )}
          <CoursePanel
            courses={data.courses}
            meta={data.meta}
            selectedSlots={selectedSlots}
            onSelectUnit={handleSelectUnit}
            onRemoveSlots={handleRemoveSlots}
            getCourseColor={getCourseColor}
            onReset={() => { setData(null); setSelectedSlots([]) }}
          />
          <CalendarView selectedSlots={selectedSlots} />
        </div>
      )}
    </div>
  )
}