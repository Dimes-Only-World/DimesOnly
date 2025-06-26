import { supabase } from '@/lib/supabase';

export const uploadToSupabase = async (file: File, type: string, userId: string, onProgress?: (progress: number) => void) => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${type}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('user-photos')
      .upload(fileName, file);
    
    if (error) {
      console.error('Upload error:', error);
      return null;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('user-photos')
      .getPublicUrl(fileName);
    
    return { publicUrl, fileName };
  } catch (error) {
    console.error('Upload failed:', error);
    return null;
  }
};

export const saveMediaToDatabase = async (file: File, url: string, fileName: string, type: 'photo' | 'video', userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_media')
      .insert({
        user_id: userId,
        media_url: url,
        media_type: type === 'photo' ? 'image' : 'video',
        filename: file.name,
        file_size: file.size,
        storage_path: fileName
      })
      .select()
      .single();

    if (error) {
      console.error('Database save error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to save to database:', error);
    return null;
  }
};

export const updateUserProfile = async (userId: string, field: string, url: string) => {
  try {
    const { error } = await supabase
      .from('users')
      .update({ [field]: url })
      .eq('id', userId);
    
    if (error) {
      console.error('Profile update error:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Profile update failed:', error);
    return false;
  }
};

export const deleteMediaFromDatabase = async (id: string) => {
  try {
    const { error } = await supabase
      .from('user_media')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Delete failed:', error);
    return false;
  }
};