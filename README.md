# 🗓️ Planificador de Horarios UTEC

Aplicación web interactiva para visualizar tu horario a partir del Excel de consulta de horarios.

## 🚀 Pasos para ejecutar

### 1. Requisitos
- **Node.js** v18+ → https://nodejs.org

### 2. Instalar dependencias (solo la primera vez)
```
npm install
```

### 3. Iniciar la app
```
npm run dev
```

### 4. Abrir en el navegador
```
http://localhost:5173
```

---

## 📖 Uso

1. **Carga el Excel** → Haz clic en "Seleccionar archivo Excel" o arrastra el `.xlsx`
2. **Busca un curso** → Usa el buscador (por nombre o código)
3. **Expande el curso** → Haz clic sobre él para ver sus secciones
4. **Selecciona una sección** → Aparece automáticamente en el calendario
5. **Quitar un curso** → "Quitar del calendario" dentro del curso expandido

## 🎨 Características

- Calendario semanal Lun–Sáb, 7am–11pm
- Colores pastel únicos por curso
- Múltiples cursos simultáneos
- Indicadores de días por sección
- Tooltip con sala al pasar el cursor
- Diseño minimalista estilo macOS
