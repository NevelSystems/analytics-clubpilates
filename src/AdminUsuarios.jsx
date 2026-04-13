import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'

const CENTROS = [
  { id: '60799c7835b8911c8545f043', name: 'Bonanova' },
  { id: '68d68a5cf7176270040f624a', name: 'Carabanchel' },
  { id: '61c07795f4492f7e61243062', name: 'Eixample' },
  { id: '66deaf61cd10d28f140f5581', name: 'Entenza' },
  { id: '6895fbb175b367c91101f96d', name: 'Goya' },
  { id: '648060a55dbb5018470ba2c7', name: 'Guindalera' },
  { id: '687a31ae3d5a8d28280c13b9', name: 'Imperial' },
  { id: '654a426970c402fc1b0e9785', name: 'Pacífico' },
  { id: '69008f1a0b1641b6a9017cac', name: 'Prosperidad' },
  { id: '67f7a344297706f6bd0ebb76', name: 'Sagrada Familia' },
  { id: '6583196c7e23ac73cf0547e4', name: 'Saint Gervasi' },
]

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h3 className="font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function CentrosSelector({ selected, onChange }) {
  function toggle(id) {
    if (selected.includes(id)) onChange(selected.filter(x => x !== id))
    else onChange([...selected, id])
  }
  return (
    <div className="grid grid-cols-2 gap-2 mt-2">
      {CENTROS.map(c => (
        <label key={c.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
          selected.includes(c.id)
            ? 'border-purple-500 bg-purple-900/30 text-white'
            : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
        }`}>
          <input
            type="checkbox"
            checked={selected.includes(c.id)}
            onChange={() => toggle(c.id)}
            className="hidden"
          />
          <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
            selected.includes(c.id) ? 'bg-purple-500' : 'bg-gray-700'
          }`}>
            {selected.includes(c.id) && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </span>
          <span className="text-sm truncate">{c.name}</span>
        </label>
      ))}
    </div>
  )
}

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // 'invite' | 'edit' | 'delete'
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  // Form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('manager')
  const [inviteBranches, setInviteBranches] = useState([])
  const [editRole, setEditRole] = useState('manager')
  const [editBranches, setEditBranches] = useState([])

  useEffect(() => { fetchUsuarios() }, [])

  async function fetchUsuarios() {
    setLoading(true)
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, role, branch_ids, status')
      .order('created_at', { ascending: false })
    if (!error) setUsuarios(data || [])
    setLoading(false)
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleInvite(e) {
    e.preventDefault()
    setSaving(true)
    try {
      // Obtener token de sesión actual para pasarlo a la edge function
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No hay sesión activa')

      const response = await fetch('https://kvcmjajatbvirespgcvs.supabase.co/functions/v1/invite-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': 'sb_publishable_V0OSsUPhE-bhyhcY63FXKw_vMyQVXOr',
        },
        body: JSON.stringify({
          email: inviteEmail,
          full_name: inviteName,
          role: inviteRole,
          branch_ids: inviteRole === 'admin' ? [] : inviteBranches,
        })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Error al invitar')
      showToast(`Invitación enviada a ${inviteEmail}`)
      setModal(null)
      setInviteEmail(''); setInviteName(''); setInviteRole('manager'); setInviteBranches([])
      fetchUsuarios()
    } catch (err) {
      showToast('Error: ' + err.message, 'error')
    }
    setSaving(false)
  }

  async function handleEdit(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase
      .from('user_profiles')
      .update({
        role: editRole,
        branch_ids: editRole === 'admin' ? [] : editBranches,
      })
      .eq('id', selected.id)
    if (error) showToast('Error al guardar: ' + error.message, 'error')
    else {
      showToast('Usuario actualizado')
      setModal(null)
      fetchUsuarios()
    }
    setSaving(false)
  }

  async function handleDelete() {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No hay sesión activa')

      const response = await fetch('https://kvcmjajatbvirespgcvs.supabase.co/functions/v1/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': 'sb_publishable_V0OSsUPhE-bhyhcY63FXKw_vMyQVXOr',
        },
        body: JSON.stringify({ userId: selected.id })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Error al eliminar')
      showToast('Usuario eliminado')
      setModal(null)
      fetchUsuarios()
    } catch (err) {
      showToast('Error: ' + err.message, 'error')
    }
    setSaving(false)
  }

  function openEdit(u) {
    setSelected(u)
    setEditRole(u.role)
    setEditBranches(u.branch_ids || [])
    setModal('edit')
  }

  function openDelete(u) {
    setSelected(u)
    setModal('delete')
  }

  function getCentroNames(ids) {
    if (!ids || ids.length === 0) return null
    return ids.map(id => CENTROS.find(c => c.id === id)?.name || id)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Gestión de usuarios</h2>
          <p className="text-sm text-gray-400 mt-0.5">{usuarios.length} usuarios registrados</p>
        </div>
        <button
          onClick={() => setModal('invite')}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Invitar usuario
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-500 text-sm">Cargando...</div>
      ) : (
        <div className="space-y-2">
          {usuarios.map(u => (
            <div key={u.id} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center gap-4">
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center shrink-0 text-sm font-semibold text-gray-300">
                {(u.full_name || u.email || '?')[0].toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-white truncate">{u.full_name || '—'}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${
                    u.role === 'admin'
                      ? 'bg-purple-900/50 border-purple-700 text-purple-300'
                      : 'bg-gray-800 border-gray-700 text-gray-400'
                  }`}>
                    {u.role === 'admin' ? 'Admin' : 'Manager'}
                  </span>
                  {u.status === 'pending' && (
                    <span className="text-xs px-2 py-0.5 rounded-full border shrink-0 bg-amber-900/30 border-amber-700 text-amber-400">
                      ⏳ Pendiente de aceptar
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">{u.email}</p>
                {u.role === 'manager' && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {getCentroNames(u.branch_ids)?.map(name => (
                      <span key={name} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-md">
                        {name}
                      </span>
                    )) || <span className="text-xs text-red-400">Sin centros asignados</span>}
                  </div>
                )}
                {u.role === 'admin' && (
                  <p className="text-xs text-gray-600 mt-1">Acceso a todos los centros</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => openEdit(u)}
                  className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 rounded-lg px-3 py-1.5 transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => openDelete(u)}
                  className="text-xs text-red-500 hover:text-red-400 border border-red-900/50 hover:border-red-800 rounded-lg px-3 py-1.5 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Invitar */}
      {modal === 'invite' && (
        <Modal title="Invitar nuevo usuario" onClose={() => setModal(null)}>
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Nombre completo</label>
              <input
                type="text"
                value={inviteName}
                onChange={e => setInviteName(e.target.value)}
                required
                placeholder="Nombre Manager"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                required
                placeholder="manager@clubpilates.com"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Rol</label>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
              >
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {inviteRole === 'manager' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Centros asignados</label>
                <CentrosSelector selected={inviteBranches} onChange={setInviteBranches} />
                {inviteBranches.length === 0 && (
                  <p className="text-xs text-amber-400 mt-2">⚠ Selecciona al menos un centro</p>
                )}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg py-2 text-sm transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={saving || (inviteRole === 'manager' && inviteBranches.length === 0)}
                className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors">
                {saving ? 'Enviando...' : 'Enviar invitación'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Editar */}
      {modal === 'edit' && selected && (
        <Modal title={`Editar: ${selected.full_name || selected.email}`} onClose={() => setModal(null)}>
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Rol</label>
              <select
                value={editRole}
                onChange={e => setEditRole(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
              >
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {editRole === 'manager' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Centros asignados</label>
                <CentrosSelector selected={editBranches} onChange={setEditBranches} />
                {editBranches.length === 0 && (
                  <p className="text-xs text-amber-400 mt-2">⚠ Selecciona al menos un centro</p>
                )}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg py-2 text-sm transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={saving || (editRole === 'manager' && editBranches.length === 0)}
                className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors">
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Eliminar */}
      {modal === 'delete' && selected && (
        <Modal title="Eliminar usuario" onClose={() => setModal(null)}>
          <p className="text-gray-300 text-sm mb-1">
            ¿Seguro que quieres eliminar a <span className="text-white font-medium">{selected.full_name || selected.email}</span>?
          </p>
          <p className="text-gray-500 text-xs mb-5">
            Se eliminará su perfil y acceso. Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setModal(null)}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg py-2 text-sm transition-colors">
              Cancelar
            </button>
            <button onClick={handleDelete} disabled={saving}
              className="flex-1 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors">
              {saving ? 'Eliminando...' : 'Sí, eliminar'}
            </button>
          </div>
        </Modal>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-xl border ${
          toast.type === 'error'
            ? 'bg-red-900 border-red-700 text-red-200'
            : 'bg-green-900 border-green-700 text-green-200'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}