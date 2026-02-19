import { supabase } from '@/lib/supabase'
import type {
  SignupForm,
  SignupFormField,
  SignupFormSummary,
  MySignupForm,
  SignupResponseDetail,
  SignupFieldType,
} from '@/types/supabase'

export interface CreateFormFieldInput {
  field_key: string
  field_label: string
  field_type: SignupFieldType
  is_required: boolean
  is_standard: boolean
  options?: string[]
  placeholder?: string
}

export async function createSignupForm(params: {
  eventId: string
  title?: string
  description?: string
  maxSignups?: number | null
  deadline?: string | null
  fields: CreateFormFieldInput[]
}) {
  console.log('createSignupForm called:', params)

  const { data: { user } } = await supabase.auth.getUser()
  console.log('Current auth user id:', user?.id)
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('id, role').eq('id', user.id).single()
    console.log('Current user profile role:', profile?.role, 'profile id:', profile?.id)
  }

  const { data, error } = await supabase.rpc('create_signup_form', {
    p_event_id: params.eventId,
    p_title: params.title || null,
    p_description: params.description || null,
    p_max_signups: params.maxSignups ?? null,
    p_deadline: params.deadline ?? null,
    p_fields: params.fields,
  })

  console.log('createSignupForm response:', { data, error })
  if (error) {
    console.error('createSignupForm error:', error)
    throw error
  }
  const result = data as { success: boolean; form_id?: string; error?: string }
  if (!result?.success) {
    console.error('createSignupForm RPC returned failure:', result)
    throw new Error(result?.error || 'Failed to create signup form')
  }
  return result as { success: boolean; form_id: string }
}

export async function submitSignup(params: {
  formId: string
  personId: string | null
  manualName?: string | null
  manualEmail?: string | null
  manualPhone?: string | null
  fieldValues: Record<string, string>
}) {
  console.log('submitSignup called:', params)
  const { data, error } = await supabase.rpc('submit_signup', {
    p_form_id: params.formId,
    p_person_id: params.personId,
    p_manual_name: params.manualName ?? null,
    p_manual_email: params.manualEmail ?? null,
    p_manual_phone: params.manualPhone ?? null,
    p_field_values: params.fieldValues,
  })

  console.log('submitSignup response:', { data, error })
  if (error) {
    console.error('submitSignup error:', error)
    throw error
  }
  const result = data as { success: boolean; response_id?: string; status?: string; respondent_name?: string; error?: string }
  if (!result?.success) {
    console.error('submitSignup RPC returned failure:', result)
    throw new Error(result?.error || 'Failed to submit signup')
  }
  return result as { success: boolean; response_id: string; status: string; respondent_name: string }
}

export async function cancelSignup(responseId: string) {
  console.log('cancelSignup called:', responseId)
  const { data, error } = await supabase.rpc('cancel_signup', {
    p_response_id: responseId,
  })

  console.log('cancelSignup response:', { data, error })
  if (error) {
    console.error('cancelSignup error:', error)
    throw error
  }
  const result = data as { success: boolean; error?: string }
  if (!result?.success) {
    console.error('cancelSignup RPC returned failure:', result)
    throw new Error(result?.error || 'Failed to cancel signup')
  }
  return result
}

export async function getMySignupForms(): Promise<MySignupForm[]> {
  console.log('getMySignupForms called')
  const { data, error } = await supabase.rpc('get_my_signup_forms')

  console.log('getMySignupForms response:', { count: (data as MySignupForm[] | null)?.length, error })
  if (error) {
    console.error('getMySignupForms error:', error)
    throw error
  }
  return (data as MySignupForm[] | null) ?? []
}

export async function getFormFields(formId: string): Promise<SignupFormField[]> {
  console.log('getFormFields called:', formId)
  const { data, error } = await supabase
    .from('signup_form_fields')
    .select('*')
    .eq('form_id', formId)
    .order('sort_order')

  console.log('getFormFields response:', { count: data?.length, error })
  if (error) {
    console.error('getFormFields error:', error)
    throw error
  }
  return (data as SignupFormField[]) ?? []
}

export async function getFormResponses(formId: string): Promise<SignupResponseDetail[]> {
  console.log('getFormResponses called:', formId)
  const { data, error } = await supabase
    .from('signup_response_detail')
    .select('*')
    .eq('form_id', formId)
    .neq('status', 'cancelled')
    .order('created_at')

  console.log('getFormResponses response:', { count: data?.length, error })
  if (error) {
    console.error('getFormResponses error:', error)
    throw error
  }
  return (data as SignupResponseDetail[]) ?? []
}

export async function getAllFormResponses(formId: string): Promise<SignupResponseDetail[]> {
  console.log('getAllFormResponses called:', formId)
  const { data, error } = await supabase
    .from('signup_response_detail')
    .select('*')
    .eq('form_id', formId)
    .order('created_at')

  console.log('getAllFormResponses response:', { count: data?.length, error })
  if (error) {
    console.error('getAllFormResponses error:', error)
    throw error
  }
  return (data as SignupResponseDetail[]) ?? []
}

export async function getEventSignupForm(eventId: string): Promise<SignupForm | null> {
  console.log('getEventSignupForm called:', eventId)
  const { data, error } = await supabase
    .from('signup_forms')
    .select('*')
    .eq('event_id', eventId)
    .maybeSingle()

  console.log('getEventSignupForm response:', { data, error })
  if (error) {
    console.error('getEventSignupForm error:', error)
    throw error
  }
  return data as SignupForm | null
}

export async function getFormSummaries(): Promise<SignupFormSummary[]> {
  console.log('getFormSummaries called')
  const { data, error } = await supabase
    .from('signup_form_summary')
    .select('*')
    .eq('is_active', true)
    .order('event_start')

  console.log('getFormSummaries response:', { count: data?.length, error })
  if (error) {
    console.error('getFormSummaries error:', error)
    throw error
  }
  return (data as SignupFormSummary[]) ?? []
}

export async function updateSignupForm(params: {
  formId: string
  title?: string
  description?: string | null
  maxSignups?: number | null
  deadline?: string | null
  isActive?: boolean
  fields: CreateFormFieldInput[]
}) {
  console.log('updateSignupForm called:', params)

  const { formId, fields, ...formUpdates } = params

  const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (formUpdates.title !== undefined) updatePayload.title = formUpdates.title
  if (formUpdates.description !== undefined) updatePayload.description = formUpdates.description
  if (formUpdates.maxSignups !== undefined) updatePayload.max_signups = formUpdates.maxSignups
  if (formUpdates.deadline !== undefined) updatePayload.deadline = formUpdates.deadline
  if (formUpdates.isActive !== undefined) updatePayload.is_active = formUpdates.isActive

  const { error: formError } = await supabase
    .from('signup_forms')
    .update(updatePayload)
    .eq('id', formId)

  if (formError) {
    console.error('updateSignupForm form update error:', formError)
    throw formError
  }

  const { error: deleteError } = await supabase
    .from('signup_form_fields')
    .delete()
    .eq('form_id', formId)

  if (deleteError) {
    console.error('updateSignupForm fields delete error:', deleteError)
    throw deleteError
  }

  if (fields.length > 0) {
    const fieldRows = fields.map((f, idx) => ({
      form_id: formId,
      field_key: f.field_key,
      field_label: f.field_label,
      field_type: f.field_type,
      is_required: f.is_required,
      is_standard: f.is_standard,
      options: f.options ?? null,
      placeholder: f.placeholder ?? null,
      sort_order: idx,
    }))

    const { error: insertError } = await supabase
      .from('signup_form_fields')
      .insert(fieldRows)

    if (insertError) {
      console.error('updateSignupForm fields insert error:', insertError)
      throw insertError
    }
  }

  console.log('updateSignupForm success')
  return { success: true, form_id: formId }
}

export async function getSignupForm(formId: string): Promise<SignupForm | null> {
  console.log('getSignupForm called:', formId)
  const { data, error } = await supabase
    .from('signup_forms')
    .select('*')
    .eq('id', formId)
    .maybeSingle()

  console.log('getSignupForm response:', { data, error })
  if (error) {
    console.error('getSignupForm error:', error)
    throw error
  }
  return data as SignupForm | null
}
