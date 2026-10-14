import { supabase } from '@/lib/supabase';

export type ProfilePhotoType = 'profile' | 'banner' | 'front_page';

export async function uploadProfilePhoto(file: File, username: string, type: ProfilePhotoType): Promise<string> {
  const body = new FormData();
  body.append('file', file);
  body.append('username', username);
  body.append('photoType', type === 'front_page' ? 'frontPage' : type);
  const { data, error } = await supabase.functions.invoke('upload-photo', { body });
  if (error) {
    let message = 'Could not upload your photo. Please try again.';
    if (error.context instanceof Response) {
      const result = await error.context.clone().json().catch(() => null);
      if (typeof result?.error === 'string') message = result.error;
    }
    throw new Error(message);
  }
  if (!data?.success || typeof data.url !== 'string' || !data.url) {
    throw new Error(data?.error || 'The photo could not be saved. Please try again.');
  }
  return data.url;
}