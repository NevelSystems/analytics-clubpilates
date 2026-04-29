import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const today = new Date()
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
const todayStr = today.toISOString().split('T')[0]

export default function Laserr({ branchId }) {
  const [dateFrom, setDateFrom] = useState(firstOfMonth)
  const [dateTo, setDateTo] = useState(todayStr)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (branchId) fetchData()
  }, [branchId])

  async function fetchData() {
    setLoading(true)
    setStats(null)

    const fromISO = dateFrom + 'T00:00:00+00:00'
    const toISO = dateTo + 'T23:59:59+00:00'

    // 1. Leads totales creados en el rango
    const { data: leads } = await supabase
    .from('members')
    .select('glofox_member_id, status, membership_start_date')
    .eq('branch_id', branchId)
    .gte('created_at', fromISO)
    .lte('created_at', toISO)

    // 2. Todos los miembros del centro (para cruzar con bookings)
    const { data: allMembers } = await supabase
      .from('members')
      .select('glofox_member_id, status, membership_start_date')
      .eq('branch_id', branchId)

    // 3. Bookings de clases intro del centro en el rango
    const { data: bookings } = await supabase
      .from('bookings')
      .select('glofox_booking_id, user_id, attended, time_start')
      .eq('branch_id', branchId)
      .gte('time_start', fromISO)
      .lte('time_start', toISO)

      console.log('leads:', leads?.length, leads?.[0])
      console.log('bookings:', bookings?.length, bookings?.[0])
      console.log('allMembers:', allMembers?.length)
      console.log('branchId:', branchId)
      console.log('fromISO:', fromISO, 'toISO:', toISO)

    if (!leads || !bookings || !allMembers) {
      setLoading(false)
      return
    }

    // Mapa de miembros por glofox_member_id
    const membersMap = {}
    allMembers.forEach(m => { membersMap[m.glofox_member_id] = m })

    // Apuntados a intro (user_id único en bookings)
    const apuntadosIds = [...new Set(bookings.map(b => b.user_id))]

    // Asistidos
    const asistidosBookings = bookings.filter(b => b.attended === true)
    const asistidosIds = [...new Set(asistidosBookings.map(b => b.user_id))]

    // Para cada asistido, buscar si compró y cuándo
    let compraronEnMomento = 0
    let compraronDespues = 0
    let noCompraron = 0

    asistidosIds.forEach(userId => {
      const member = membersMap[userId]
      if (!member || member.status === 'LEAD') {
        noCompraron++
        return
      }
      const booking = asistidosBookings.find(b => b.user_id === userId)
      const claseDate = booking ? new Date(booking.time_start).toDateString() : null
      const compraDate = member.membership_start_date ? new Date(member.membership_start_date).toDateString() : null

      if (claseDate && compraDate && claseDate === compraDate) {
        compraronEnMomento++
      } else {
        compraronDespues++
      }
    })

    setStats({
      leads: leads.length,
      apuntados: apuntadosIds.length,
      asistidos: asistidosIds.length,
      compraronEnMomento,
      compraronDespues,
      noCompraron,
    })

    setLoading(false)
  }

  function pct(num, den) {
    if (!den) return '—'
    return Math.round((num / den) * 100) + '%'
  }

  const steps = stats ? [
    {
      label: 'Leads totales',
      value: stats.leads,
      pct: null,
      color: 'bg-blue-500',
      desc: 'Nuevos leads en el período'
    },
    {
      label: 'Apuntados a intro',
      value: stats.apuntados,
      pct: pct(stats.apuntados, stats.leads),
      color: 'bg-indigo-500',
      desc: 'Reservaron clase de introducción'
    },
    {
      label: 'Asistieron',
      value: stats.asistidos,
      pct: pct(stats.asistidos, stats.apuntados),
      color: 'bg-violet-500',
      desc: 'Asistieron a la clase'
    },
    {
      label: 'Compraron en el momento',
      value: stats.compraronEnMomento,
      pct: pct(stats.compraronEnMomento, stats.asistidos),
      color: 'bg-green-500',
      desc: 'Membresía el mismo día de la clase'
    },
    {
      label: 'Compraron después',
      value: stats.compraronDespues,
      pct: pct(stats.compraronDespues, stats.asistidos),
      color: 'bg-emerald-400',
      desc: 'Membresía en días posteriores'
    },
    {
      label: 'No compraron',
      value: stats.noCompraron,
      pct: pct(stats.noCompraron, stats.asistidos),
      color: 'bg-red-500',
      desc: 'Asistieron pero siguen como lead'
    },
  ] : []

  const maxVal = stats ? Math.max(stats.leads, 1) : 1

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Laserr</h2>
          <p className="text-gray-400 text-sm mt-0.5">Funnel de conversión de leads</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">Desde</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-purple-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">Hasta</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-purple-500"
          />
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
        >
          {loading ? 'Cargando...' : 'Aplicar'}
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && stats && (
        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-medium text-white">{step.label}</span>
                  <span className="text-xs text-gray-500 ml-2">{step.desc}</span>
                </div>
                <div className="flex items-center gap-3">
                  {step.pct && (
                    <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">
                      {step.pct} del paso anterior
                    </span>
                  )}
                  <span className="text-2xl font-bold text-white">{step.value}</span>
                </div>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${step.color} rounded-full transition-all duration-500`}
                  style={{ width: `${Math.round((step.value / maxVal) * 100)}%` }}
                />
              </div>
            </div>
          ))}

          <div className="mt-6 bg-gray-900 border border-purple-800/40 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Conversión total</p>
            <div className="flex items-center gap-8">
              <div>
                <p className="text-3xl font-bold text-white">
                  {pct(stats.compraronEnMomento + stats.compraronDespues, stats.leads)}
                </p>
                <p className="text-xs text-gray-400 mt-1">leads → membresía</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">
                  {pct(stats.compraronEnMomento + stats.compraronDespues, stats.asistidos)}
                </p>
                <p className="text-xs text-gray-400 mt-1">asistidos → membresía</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">
                  {stats.compraronEnMomento + stats.compraronDespues}
                </p>
                <p className="text-xs text-gray-400 mt-1">total conversiones</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && !stats && (
        <div className="text-center py-20 text-gray-500">
          Selecciona un rango de fechas y pulsa Aplicar
        </div>
      )}
    </div>
  )
}