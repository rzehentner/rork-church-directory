export const STORAGE_BUCKET = 'event-images' as const

// Environment debugging
export const debugEnvironment = () => {
  console.log('SUPABASE URL', process.env.EXPO_PUBLIC_SUPABASE_URL)
  console.log('ANON KEY starts with', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 8))
  console.log('Bucket name', STORAGE_BUCKET)
}