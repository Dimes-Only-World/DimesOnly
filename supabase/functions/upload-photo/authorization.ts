/** Fail closed for existing profiles; unused usernames support signup photos. */
export async function verifyPhotoOwner(
  ownerId: string | null,
  getCaller: () => Promise<string | null>,
): Promise<boolean> {
  if (!ownerId) return true;
  return (await getCaller()) === ownerId;
}