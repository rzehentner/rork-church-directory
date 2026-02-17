import { supabase } from '@/lib/supabase'
import type { PotluckFormDetailRow } from '@/types/supabase'

export interface PotluckGroupInput {
  title: string
  items: {
    name: string
    description?: string
    quantity_needed?: number
  }[]
}

export interface PotluckItemParsed {
  id: string
  name: string
  description: string | null
  quantity_needed: number
  claim_count: number
  is_full: boolean
  claims: {
    claim_id: string
    person_id: string | null
    claimant_name: string
    claimed_by: string
    note: string | null
    created_at: string
  }[]
}

export interface PotluckGroupParsed {
  id: string
  title: string
  sort_order: number
  items: PotluckItemParsed[]
}

export async function createPotluckForm(params: {
  eventId: string
  title?: string
  description?: string
  deadline?: string | null
  groups: PotluckGroupInput[]
}) {
  console.log('createPotluckForm called:', params)
  const { data, error } = await supabase.rpc('create_potluck_form', {
    p_event_id: params.eventId,
    p_title: params.title || null,
    p_description: params.description || null,
    p_deadline: params.deadline ?? null,
    p_groups: params.groups,
  })

  console.log('createPotluckForm response:', { data, error })
  if (error) {
    console.error('createPotluckForm error:', error)
    throw error
  }
  return data as { success: boolean; form_id: string }
}

export async function addPotluckItems(params: {
  formId: string
  groupId?: string
  groupTitle?: string
  items: { name: string; description?: string; quantity_needed?: number }[]
}) {
  console.log('addPotluckItems called:', params)
  const { data, error } = await supabase.rpc('add_potluck_items', {
    p_form_id: params.formId,
    p_group_id: params.groupId ?? null,
    p_group_title: params.groupTitle ?? null,
    p_items: params.items,
  })

  console.log('addPotluckItems response:', { data, error })
  if (error) {
    console.error('addPotluckItems error:', error)
    throw error
  }
  return data
}

export async function claimPotluckItem(params: {
  itemId: string
  personId: string | null
  manualName?: string | null
  note?: string | null
}) {
  console.log('claimPotluckItem called:', params)
  const { data, error } = await supabase.rpc('claim_potluck_item', {
    p_item_id: params.itemId,
    p_person_id: params.personId,
    p_manual_name: params.manualName ?? null,
    p_note: params.note ?? null,
  })

  console.log('claimPotluckItem response:', { data, error })
  if (error) {
    console.error('claimPotluckItem error:', error)
    throw error
  }
  return data as { success: boolean; item_name: string; claimant_name: string }
}

export async function unclaimPotluckItem(claimId: string) {
  console.log('unclaimPotluckItem called:', claimId)
  const { data, error } = await supabase.rpc('unclaim_potluck_item', {
    p_claim_id: claimId,
  })

  console.log('unclaimPotluckItem response:', { data, error })
  if (error) {
    console.error('unclaimPotluckItem error:', error)
    throw error
  }
  return data as { success: boolean }
}

export async function getPotluckFormDetail(formId: string): Promise<PotluckGroupParsed[]> {
  console.log('getPotluckFormDetail called:', formId)
  const { data: rows, error } = await supabase
    .from('potluck_form_detail')
    .select('*')
    .eq('form_id', formId)
    .order('group_sort')
    .order('item_sort')

  console.log('getPotluckFormDetail response:', { count: rows?.length, error })
  if (error) {
    console.error('getPotluckFormDetail error:', error)
    throw error
  }

  const typedRows = (rows ?? []) as PotluckFormDetailRow[]
  const groups = new Map<string, PotluckGroupParsed>()

  for (const row of typedRows) {
    if (!groups.has(row.group_id)) {
      groups.set(row.group_id, {
        id: row.group_id,
        title: row.group_title,
        sort_order: row.group_sort,
        items: [],
      })
    }
    groups.get(row.group_id)!.items.push({
      id: row.item_id,
      name: row.item_name,
      description: row.item_description,
      quantity_needed: row.quantity_needed,
      claim_count: row.claim_count,
      is_full: row.claim_count >= row.quantity_needed,
      claims: row.claims ?? [],
    })
  }

  return [...groups.values()].sort((a, b) => a.sort_order - b.sort_order)
}
