import { supabase } from '@/lib/supabase';
import { Platform } from 'react-native';

export async function uploadImageFromUri(opts: {
  uri: string;
  path: string;
  contentType?: string;
}): Promise<string> {
  const { uri, path, contentType = 'image/jpeg' } = opts;
  
  console.log('Uploading image to path:', path);
  console.log('URI:', uri);
  console.log('Content type:', contentType);
  
  try {
    let uploadData: ArrayBuffer | Blob;
    
    // Fetch the image data from the URI
    const res = await fetch(uri);
    if (!res.ok) {
      throw new Error(`Failed to fetch file: ${res.status} ${res.statusText}`);
    }
    
    // Get blob from response
    const blob = await res.blob();
    console.log('Blob size:', blob.size, 'bytes');
    console.log('Blob type:', blob.type);
    
    if (!blob || blob.size === 0) {
      throw new Error('Selected image is empty or unreadable.');
    }
    
    if (Platform.OS === 'web') {
      // On web, use blob directly
      uploadData = blob;
    } else {
      // On mobile, convert blob to ArrayBuffer
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result instanceof ArrayBuffer) {
            resolve(reader.result);
          } else {
            reject(new Error('Failed to convert blob to ArrayBuffer'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read blob'));
        reader.readAsArrayBuffer(blob);
      });
      
      uploadData = arrayBuffer;
    }

    // Upload with upsert and no cache to ensure fresh image
    const { data: uploadResult, error } = await supabase.storage
      .from('avatars')
      .upload(path, uploadData, { 
        contentType: contentType || 'image/jpeg', 
        upsert: true,
        cacheControl: '0'
      });

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }
    
    console.log('Upload successful!', uploadResult);

    // Get signed URL for immediate display with cache buster
    const { data, error: sErr } = await supabase.storage
      .from('avatars')
      .createSignedUrl(path, 60 * 60);
      
    if (sErr) {
      console.error('Signed URL error:', sErr);
      throw sErr;
    }

    // Add timestamp to force refresh
    const urlWithTimestamp = `${data.signedUrl}&t=${Date.now()}`;
    console.log('Generated signed URL with timestamp:', urlWithTimestamp);
    return urlWithTimestamp;
  } catch (error) {
    console.error('Error in uploadImageFromUri:', error);
    throw error;
  }
}

export async function getSignedUrl(key: string, ttlSeconds = 3600): Promise<string | null> {
  if (!key) return null;
  
  // Skip if key contains placeholder text
  if (key.includes('<') || key.includes('>')) {
    console.log('Skipping invalid placeholder key:', key);
    return null;
  }
  
  try {
    const { data, error } = await supabase.storage
      .from('avatars')
      .createSignedUrl(key, ttlSeconds);
    
    if (error) {
      // File doesn't exist yet, which is normal for new users/families
      if (error.message?.includes('Object not found') || error.message?.includes('Invalid key')) {
        console.log('File does not exist yet (this is normal for new uploads):', key);
        return null;
      }
      console.error('Error getting signed URL:', error);
      return null;
    }
    
    return data.signedUrl;
  } catch (err) {
    console.error('Error in getSignedUrl:', err);
    return null;
  }
}

export async function uploadPersonAvatar(personId: string, file: any): Promise<string> {
  try {
    // Validate personId
    if (!personId || personId.includes('<') || personId.includes('>')) {
      throw new Error('Invalid person ID');
    }
    
    const path = `persons/${personId}/avatar.jpg`;
    console.log('Uploading person avatar for:', personId);
    
    // Upload the image first
    const url = await uploadImageFromUri({ 
      uri: file.uri, 
      path, 
      contentType: file.type || 'image/jpeg'
    });
    
    // Then update the database with the key
    const { data: updateData, error } = await supabase
      .from('persons')
      .update({ photo_url: path })
      .eq('id', personId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating person photo_url:', error);
      throw new Error(`Failed to save photo reference: ${error.message}`);
    }
    
    console.log('Person avatar uploaded and saved successfully:', updateData);
    
    // Return the signed URL with cache buster
    return `${url}?t=${Date.now()}`;
  } catch (error) {
    console.error('Error in uploadPersonAvatar:', error);
    throw error;
  }
}

export async function uploadFamilyPhoto(familyId: string, file: any, currentKey?: string | null): Promise<string> {
  try {
    // Validate familyId
    if (!familyId || familyId.includes('<') || familyId.includes('>')) {
      throw new Error('Invalid family ID');
    }
    
    // Don't use currentKey if it contains placeholder text
    const validCurrentKey = currentKey && !currentKey.includes('<') && !currentKey.includes('>') ? currentKey : null;
    const path = validCurrentKey ?? `families/${familyId}/photo.jpg`;
    console.log('Uploading family photo for:', familyId, 'with path:', path);
    
    // Upload the image first
    const url = await uploadImageFromUri({ 
      uri: file.uri, 
      path, 
      contentType: file.type || 'image/jpeg'
    });
    
    // Always update the database with the key
    const { data: updateData, error } = await supabase
      .from('families')
      .update({ photo_path: path })
      .eq('id', familyId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating family photo_path:', error);
      throw new Error(`Failed to save photo reference: ${error.message}`);
    }
    
    console.log('Family photo uploaded and saved successfully:', updateData);
    
    // Return the signed URL with cache buster
    return `${url}?t=${Date.now()}`;
  } catch (error) {
    console.error('Error in uploadFamilyPhoto:', error);
    throw error;
  }
}

// Legacy function for backward compatibility
export async function uploadImageToAvatars(key: string, file: any): Promise<string> {
  return uploadImageFromUri({ 
    uri: file.uri, 
    path: key, 
    contentType: file.type || 'image/jpeg' 
  });
}