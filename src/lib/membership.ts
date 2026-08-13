export type MembershipKey =
  | 'free'
  | 'silver'
  | 'silver_plus'
  | 'gold'
  | 'diamond'
  | 'diamond_plus'
  | 'elite'
  | 'elite_plus';

export interface MembershipInfo {
  key: MembershipKey;
  label: string;
  rank: number;
}

export const MEMBERSHIP_OPTIONS: { key: MembershipKey; label: string; rank: number }[] = [
  { key: 'free', label: 'Free', rank: 0 },
  { key: 'silver', label: 'Silver', rank: 1 },
  { key: 'silver_plus', label: 'Silver Plus', rank: 2 },
  { key: 'gold', label: 'Gold', rank: 3 },
  { key: 'diamond', label: 'Diamond', rank: 4 },
  { key: 'diamond_plus', label: 'Diamond Plus', rank: 5 },
  { key: 'elite', label: 'Elite', rank: 6 },
  { key: 'elite_plus', label: 'Elite Plus', rank: 7 },
];

const normalize = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

/**
 * Resolves the effective membership tier from any combination of
 * membership_tier / membership_type strings and the boolean flags.
 * Always returns the HIGHEST tier the user qualifies for.
 */
export const resolveMembership = (user: any): MembershipInfo => {
  const candidates = [
    normalize(user?.membership_tier),
    normalize(user?.membershipTier),
    normalize(user?.membership_type),
    normalize(user?.membershipType),
  ].filter(Boolean);

  const aliases: Record<string, MembershipKey> = {
    business_owner_elite: 'elite_plus',
    business_owner_elite_installment: 'elite_plus',
    elite_plus: 'elite_plus',
    elite: 'elite',
    diamond_plus: 'diamond_plus',
    diamond: 'diamond',
    gold: 'gold',
    silver_plus: 'silver_plus',
    silver: 'silver',
    free: 'free',
  };

  let best = MEMBERSHIP_OPTIONS[0];

  for (const candidate of candidates) {
    const key = aliases[candidate];
    if (!key) continue;
    const option = MEMBERSHIP_OPTIONS.find((o) => o.key === key)!;
    if (option.rank > best.rank) best = option;
  }

  const flagKeys: MembershipKey[] = [];
  if (user?.business_owner_elite_active) flagKeys.push('elite_plus');
  if (user?.diamond_plus_active) flagKeys.push('diamond_plus');
  if (user?.silver_plus_active) flagKeys.push('silver_plus');

  for (const key of flagKeys) {
    const option = MEMBERSHIP_OPTIONS.find((o) => o.key === key)!;
    if (option.rank > best.rank) best = option;
  }

  // Every member gets a free promo tier at registration: Silver for everyone,
  // Diamond for entertainers. Never resolve below that floor.
  const userType = normalize(user?.user_type ?? user?.userType);
  const freeTierStored = normalize(user?.free_membership_tier);
  const isEntertainer = ['exotic', 'stripper'].includes(userType);
  const floorKey: MembershipKey =
    freeTierStored === 'diamond' || (freeTierStored !== 'silver' && isEntertainer)
      ? 'diamond'
      : 'silver';
  const floor = MEMBERSHIP_OPTIONS.find((o) => o.key === floorKey)!;
  if (floor.rank > best.rank) best = floor;

  return best;
};

export const getMembershipLabel = (user: any) => resolveMembership(user).label;
