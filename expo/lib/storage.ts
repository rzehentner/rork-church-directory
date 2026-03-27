import { supabase } from '@/lib/supabase';
import { isValidUUID } from '@/utils/validation';

export async function uploadImageFromUri(opts: {
  uri: string;
  path: string;
  contentType?: string;
}): Promise<string> {
  const { uri, path, contentType = 'image/jpeg' } = opts;

  const res = await fetch(uri);
  if (!res.ok) throw new Error(`Failed to fetch file: ${res.status} ${res.statusText}`);

  const blob = await res.blob();
  if (!blob || blob.size === 0) throw new Error('Selected image is empty or unreadable.');

  // Use Blob on all platforms. Converting to ArrayBuffer on iOS causes
  // NSURLSession to drop the Authorization header, triggering RLS failures.
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, blob, {
      contentType: contentType || 'image/jpeg',
      upsert: true,
      cacheControl: '0'
    });

  if (error) throw error;

  const { data, error: sErr } = await supabase.storage
    .from('avatars')
    .createSignedUrl(path, 60 * 60);

  if (sErr) throw sErr;
  return `${data.signedUrl}&t=${Date.now()}`;
}

export async function getSignedUrl(key: string, ttlSeconds = 3600): Promise<string | null> {
  if (!key) return null;
  if (key.includes('<') || key.includes('>')) return null;

  try {
    const { data, error } = await supabase.storage
      .from('avatars')
      .createSignedUrl(key, ttlSeconds);

    if (error) return null;
    if (!data.signedUrl || data.signedUrl.trim() === '') return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

export async function uploadPersonAvatar(personId: string, file: any): Promise<string> {
  if (!isValidUUID(personId)) throw new Error('Invalid person ID');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated — please sign out and sign back in.');

  const path = `persons/${personId}/avatar.jpg`;
  let url: string;
  try {
    url = await uploadImageFromUri({
      uri: file.uri,
      path,
      contentType: file.type || 'image/jpeg'
    });
  } catch (storageErr: any) {
    throw new Error(`Storage upload failed (path: ${path}, uid: ${user.id}): ${storageErr?.message}`);
  }

  const { error } = await supabase
    .from('persons')
    .update({ photo_path: path })
    .eq('id', personId)
    .select()
    .single();

  if (error) throw new Error(`Person table update failed (person: ${personId}, uid: ${user.id}): ${error.message}`);
  return `${url}?t=${Date.now()}`;
}

export async function uploadFamilyPhoto(familyId: string, file: any, currentKey?: string | null): Promise<string> {
  if (!isValidUUID(familyId)) throw new Error('Invalid family ID');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated — please sign out and sign back in.');

  const validCurrentKey = currentKey && !currentKey.includes('<') && !currentKey.includes('>') ? currentKey : null;
  const path = validCurrentKey ?? `families/${familyId}/photo.jpg`;

  let url: string;
  try {
    url = await uploadImageFromUri({
      uri: file.uri,
      path,
      contentType: file.type || 'image/jpeg'
    });
  } catch (storageErr: any) {
    throw new Error(`Storage upload failed (path: ${path}, uid: ${user.id}): ${storageErr?.message}`);
  }

  const { error } = await supabase
    .from('families')
    .update({ photo_path: path })
    .eq('id', familyId)
    .select()
    .single();

  if (error) throw new Error(`Family table update failed (family: ${familyId}, uid: ${user.id}): ${error.message}`);
  return `${url}?t=${Date.now()}`;
}

export async function uploadImageToAvatars(key: string, file: any): Promise<string> {
  return uploadImageFromUri({
    uri: file.uri,
    path: key,
    contentType: file.type || 'image/jpeg'
  });
}
