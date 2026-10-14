import { beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyPhotoOwner } from '../../supabase/functions/upload-photo/authorization';
const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { functions: { invoke } } }));
import { uploadProfilePhoto } from '@/lib/profilePhotoUpload';

describe('photo ownership', () => {
  it('allows the verified profile owner', async () => {
    expect(await verifyPhotoOwner('owner-id', async () => 'owner-id')).toBe(true);
  });
  it('rejects another member', async () => {
    expect(await verifyPhotoOwner('owner-id', async () => 'other-id')).toBe(false);
  });
  it('rejects signed-out updates to an existing profile', async () => {
    expect(await verifyPhotoOwner('owner-id', async () => null)).toBe(false);
  });
  it('preserves signup photo uploads for unused usernames', async () => {
    expect(await verifyPhotoOwner(null, async () => null)).toBe(true);
  });
});

describe('profile photo upload', () => {
  beforeEach(() => invoke.mockReset());
  it('sends the banner to the verified endpoint and returns its saved URL', async () => {
    invoke.mockResolvedValue({ data: { success: true, url: 'https://example.test/banner.jpg' }, error: null });
    const file = new File(['photo'], 'banner.jpg', { type: 'image/jpeg' });
    expect(await uploadProfilePhoto(file, 'thetruth', 'banner')).toBe('https://example.test/banner.jpg');
    const call = invoke.mock.calls[0];
    if (!call) throw new Error('Upload endpoint was not called');
    const [endpoint, { body }] = call;
    expect(endpoint).toBe('upload-photo');
    expect(body.get('username')).toBe('thetruth');
    expect(body.get('photoType')).toBe('banner');
    expect(body.get('file').name).toBe('banner.jpg');
  });
  it('maps the featured photo to the existing endpoint field', async () => {
    invoke.mockResolvedValue({ data: { success: true, url: 'https://example.test/front.jpg' }, error: null });
    await uploadProfilePhoto(new File(['x'], 'front.jpg'), 'thetruth', 'front_page');
    const call = invoke.mock.calls[0];
    if (!call) throw new Error('Upload endpoint was not called');
    expect(call[1].body.get('photoType')).toBe('frontPage');
  });
  it('does not report success when saving failed', async () => {
    invoke.mockResolvedValue({ data: { success: false, error: 'Could not save your photo.' }, error: null });
    await expect(uploadProfilePhoto(new File(['x'], 'banner.jpg'), 'thetruth', 'banner')).rejects.toThrow('Could not save your photo.');
  });
});