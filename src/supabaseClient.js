import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || null

export const configError =
  !supabaseUrl || !supabaseAnonKey
    ? 'Missing Supabase credentials — copy .env.example to .env.local and fill in your project URL and anon key.'
    : null

export const supabase = configError ? null : createClient(supabaseUrl, supabaseAnonKey)

// Fetched once on load. At this event's scale (hundreds of participants,
// a few thousand scans at most) pulling everything up front and keeping it
// in memory is simpler and faster than paginating — PostgREST's default
// row cap is 1000, so this holds comfortably past 600 participants but
// would need `.range()` paging if this ever grows well beyond that.
export async function fetchAll() {
  const [participants, checkpoints, scans] = await Promise.all([
    supabase.rpc('admin_get_participants', {
      p_admin_password: adminPassword
    }),

    supabase
      .from('checkpoints')
      .select('id, code, label, sort_order')
      .eq('is_active', true)
      .order('sort_order'),

    supabase
      .from('scans')
      .select('id, participant_id, checkpoint_id, scanned_at, method, device_label')
  ])
  if (participants.error) throw participants.error
  if (checkpoints.error) throw checkpoints.error
  if (scans.error) throw scans.error

  return {
    participants: participants.data,
    checkpoints: checkpoints.data,
    scans: scans.data
  }
}

export function subscribeToScans(onEvent) {
  const channel = supabase
    .channel('admin-scans-feed')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'scans' }, (payload) =>
      onEvent('INSERT', payload)
    )
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'scans' }, (payload) =>
      onEvent('DELETE', payload)
    )
    .subscribe()

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

