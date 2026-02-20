import { supabase } from '@/lib/supabase';
import { Platform } from 'react-native';

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

  let uploadData: ArrayBuffer | Blob;
  if (Platform.OS === 'web') {
    uploadData = blob;
  } else {
    uploadData = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result instanceof ArrayBuffer) resolve(reader.result);
        else reject(new Error('Failed to convert blob to ArrayBuffer'));
      };
      reader.onerror = () => reject(new Error('Failed to read blob'));
      reader.readAsArrayBuffer(blob);
    });
  }

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, uploadData, {
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
  if (!personId || personId.includes('<') || personId.includes('>')) throw new Error('Invalid person ID');

  const path = `persons/${personId}/avatar.jpg`;
  const url = await uploadImageFromUri({
    uri: file.uri,
    path,
    contentType: file.type || 'image/jpeg'
  });

  const { error } = await supabase
    .from('persons')
    .update({ photo_url: path })
    .eq('id', personId)
    .select()
    .single();

  if (error) throw new Error(`Failed to save photo reference: ${error.message}`);
  return `${url}?t=${Date.now()}`;
}

export async function uploadFamilyPhoto(familyId: string, file: any, currentKey?: string | null): Promise<string> {
  if (!familyId || familyId.includes('<') || familyId.includes('>')) throw new Error('Invalid family ID');

  const validCurrentKey = currentKey && !currentKey.includes('<') && !currentKey.includes('>') ? currentKey : null;
  const path = validCurrentKey ?? `families/${familyId}/photo.jpg`;

  const url = await uploadImageFromUri({
    uri: file.uri,
    path,
    contentType: file.type || 'image/jpeg'
  });

  const { error } = await supabase
    .from('families')
    .update({ photo_path: path })
    .eq('id', familyId)
    .select()
    .single();

  if (error) throw new Error(`Failed to save photo reference: ${error.message}`);
  return `${url}?t=${Date.now()}`;
}

export async function uploadImageToAvatars(key: string, file: any): Promise<string> {
  return uploadImageFromUri({
    uri: file.uri,
    path: key,
    contentType: file.type || 'image/jpeg'
  });
}
