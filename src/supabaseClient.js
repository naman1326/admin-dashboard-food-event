import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || null

export const configError =
  !supabaseUrl || !supabaseAnonKey
    ? 'Missing Supabase credentials — copy .env.example to .env.local and fill in your project URL and anon key.'
    : null

export const supabase = configError ? null : createClient(supabaseUrl, supabaseAnonKey)

export async function fetchAllScans() {
  const PAGE_SIZE = 1000
  const { data: firstPage, error, count } = await supabase
    .from('scans')
    .select('id, participant_id, checkpoint_id, scanned_at, method, device_label', { count: 'exact' })
    .order('id', { ascending: true })
    .range(0, PAGE_SIZE - 1)

  if (error) throw error
  if (!count || count <= PAGE_SIZE || (firstPage && firstPage.length < PAGE_SIZE)) {
    return firstPage || []
  }

  const promises = []
  for (let from = PAGE_SIZE; from < count; from += PAGE_SIZE) {
    promises.push(
      supabase
        .from('scans')
        .select('id, participant_id, checkpoint_id, scanned_at, method, device_label')
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1)
    )
  }

  const results = await Promise.all(promises)
  const allScans = [...(firstPage || [])]
  for (const res of results) {
    if (res.error) throw res.error
    if (res.data) allScans.push(...res.data)
  }

  return allScans
}

export async function fetchAllParticipants() {
  const PAGE_SIZE = 1000
  const { data: firstPage, error, count } = await supabase
    .rpc('admin_get_participants', { p_admin_password: adminPassword }, { count: 'exact' })
    .range(0, PAGE_SIZE - 1)

  if (error) throw error
  if (!count || count <= PAGE_SIZE || (firstPage && firstPage.length < PAGE_SIZE)) {
    return firstPage || []
  }

  const promises = []
  for (let from = PAGE_SIZE; from < count; from += PAGE_SIZE) {
    promises.push(
      supabase
        .rpc('admin_get_participants', { p_admin_password: adminPassword })
        .range(from, from + PAGE_SIZE - 1)
    )
  }

  const results = await Promise.all(promises)
  const all = [...(firstPage || [])]
  for (const res of results) {
    if (res.error) throw res.error
    if (res.data) all.push(...res.data)
  }

  return all
}

export async function fetchAll() {
  const [participants, checkpoints, scans] = await Promise.all([
    fetchAllParticipants(),

    supabase
      .from('checkpoints')
      .select('id, code, label, sort_order')
      .eq('is_active', true)
      .order('sort_order'),

    fetchAllScans()
  ])
  if (checkpoints.error) throw checkpoints.error

  return {
    participants,
    checkpoints: checkpoints.data,
    scans
  }
}

export function subscribeToScans(onEvent, onStatusChange) {
  const channel = supabase
    .channel('admin-scans-feed')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'scans' }, (payload) =>
      onEvent(payload.eventType, payload)
    )
    .subscribe((status, err) => {
      if (onStatusChange) onStatusChange(status, err)
    })

  return () => supabase.removeChannel(channel)
}

export async function adminConfirm(token, checkpointCode, note) {
  const { data, error } = await supabase.rpc('admin_confirm_checkpoint', {
    p_admin_password: adminPassword,
    p_token: token,
    p_checkpoint_code: checkpointCode,
    p_note: note || null
  })
  if (error) {
    console.error('admin_confirm_checkpoint error:', error)
    return { status: 'network_error' }
  }
  return data
}

export async function adminUndo(token, checkpointCode, note) {
  const { data, error } = await supabase.rpc('admin_undo_checkpoint', {
    p_admin_password: adminPassword,
    p_token: token,
    p_checkpoint_code: checkpointCode,
    p_note: note
  })
  if (error) {
    console.error('admin_undo_checkpoint error:', error)
    return { status: 'network_error' }
  }
  return data
}

export async function fetchAdminActions() {
  const { data, error } = await supabase.rpc(
    'admin_get_actions',
    {
      p_admin_password: adminPassword
    }
  )

  if (error) throw error

  return data.map(row => ({
    id: row.id,
    action: row.action,
    participant_id: row.participant_id,
    checkpoint_id: row.checkpoint_id,
    note: row.note,
    created_at: row.created_at,
    participants: {
      name: row.participant_name,
      reg_no: row.participant_reg_no
    },
    checkpoints: {
      code: row.checkpoint_code,
      label: row.checkpoint_label
    }
  }))
}

export async function clearAdminActions() {
  const { data, error } = await supabase
    .from('admin_actions')
    .delete()
    .neq('id', 0)
  if (error) throw error
  return data
}

