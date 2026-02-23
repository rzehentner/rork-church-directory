import { supabase } from '@/lib/supabase'
import type {
  SignupForm,
  SignupFormField,
  SignupFormSummary,
  MySignupForm,
  SignupResponseDetail,
  SignupFieldType,
} from '@/types/signup'

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
  const { data, error } = await supabase.rpc('create_signup_form', {
    p_event_id: params.eventId,
    p_title: params.title || null,
    p_description: params.description || null,
    p_max_signups: params.maxSignups ?? null,
    p_deadline: params.deadline ?? null,
    p_fields: params.fields,
  })

  if (error) throw error
  const result = data as { success: boolean; form_id?: string; error?: string }
  if (!result?.success) throw new Error(result?.error || 'Failed to create signup form')
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
  const { data, error } = await supabase.rpc('submit_signup', {
    p_form_id: params.formId,
    p_person_id: params.personId,
    p_manual_name: params.manualName ?? null,
    p_manual_email: params.manualEmail ?? null,
    p_manual_phone: params.manualPhone ?? null,
    p_field_values: params.fieldValues,
  })

  if (error) throw error
  const result = data as { success: boolean; response_id?: string; status?: string; respondent_name?: string; error?: string }
  if (!result?.success) throw new Error(result?.error || 'Failed to submit signup')
  return result as { success: boolean; response_id: string; status: string; respondent_name: string }
}

export async function cancelSignup(responseId: string) {
  const { data, error } = await supabase.rpc('cancel_signup', {
    p_response_id: responseId,
  })

  if (error) throw error
  const result = data as { success: boolean; error?: string }
  if (!result?.success) throw new Error(result?.error || 'Failed to cancel signup')
  return result
}

export async function getMySignupForms(): Promise<MySignupForm[]> {
  const { data, error } = await supabase.rpc('get_my_signup_forms')
  if (error) throw error
  return (data as MySignupForm[] | null) ?? []
}

export async function getFormFields(formId: string): Promise<SignupFormField[]> {
  const { data, error } = await supabase
    .from('signup_form_fields')
    .select('*')
    .eq('form_id', formId)
    .order('sort_order')

  if (error) throw error
  return (data as SignupFormField[]) ?? []
}

export async function getFormResponses(formId: string): Promise<SignupResponseDetail[]> {
  const { data, error } = await supabase
    .from('signup_response_detail')
    .select('*')
    .eq('form_id', formId)
    .neq('status', 'cancelled')
    .order('created_at')

  if (error) throw error
  return (data as SignupResponseDetail[]) ?? []
}

export async function getAllFormResponses(formId: string): Promise<SignupResponseDetail[]> {
  const { data, error } = await supabase
    .from('signup_response_detail')
    .select('*')
    .eq('form_id', formId)
    .order('created_at')

  if (error) throw error
  return (data as SignupResponseDetail[]) ?? []
}

export async function getEventSignupForm(eventId: string): Promise<SignupForm | null> {
  const { data, error } = await supabase
    .from('signup_forms')
    .select('*')
    .eq('event_id', eventId)
    .maybeSingle()

  if (error) throw error
  return data as SignupForm | null
}

export async function getFormSummaries(): Promise<SignupFormSummary[]> {
  const { data, error } = await supabase
    .from('signup_form_summary')
    .select('*')
    .eq('is_active', true)
    .order('event_start')

  if (error) throw error
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
  const { formId, fields, ...formUpdates } = params
  const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (formUpdates.title !== undefined) updatePayload.title = formUpdates.title
  if (formUpdates.description !== undefined) updatePayload.description = formUpdates.description
  if (formUpdates.maxSignups !== undefined) updatePayload.max_signups = formUpdates.maxSignups
  if (formUpdates.deadline !== undefined) updatePayload.deadline = formUpdates.deadline
  if (formUpdates.isActive !== undefined) updatePayload.is_active = formUpdates.isActive

  const { error: formError } = await supabase.from('signup_forms').update(updatePayload).eq('id', formId)
  if (formError) throw formError

  const { error: deleteError } = await supabase.from('signup_form_fields').delete().eq('form_id', formId)
  if (deleteError) throw deleteError

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
    const { error: insertError } = await supabase.from('signup_form_fields').insert(fieldRows)
    if (insertError) throw insertError
  }

  return { success: true, form_id: formId }
}

export async function getSignupForm(formId: string): Promise<SignupForm | null> {
  const { data, error } = await supabase
    .from('signup_forms')
    .select('*')
    .eq('id', formId)
    .maybeSingle()

  if (error) throw error
  return data as SignupForm | null
}
