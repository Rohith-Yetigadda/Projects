import { useCallback } from 'react'

const monthNames = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

function getDaysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function useExportCSV() {
  const exportCSV = useCallback((habits, year, monthIndex) => {
    const days = getDaysInMonth(year, monthIndex)
    const monthName = monthNames[monthIndex]
    
    let csv = `Habit,Type,Importance,Goal,${Array.from({ length: days }, (_, i) => i + 1).join(',')}\n`
    
    habits.forEach(h => {
      const imp = h.weight === 1 ? 'Low' : h.weight === 3 ? 'High' : 'Medium'
      const row = [
        `"${h.name}"`, 
        h.type, 
        imp, 
        h.goal || days, 
        ...h.days.map(d => d ? '1' : '0')
      ]
      csv += row.join(',') + '\n'
    })
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `NXUS_${monthName}_${year}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  return exportCSV
}

export default useExportCSV
