import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';

interface ReferralFiltersProps {
  usernameFilter: string;
  cityFilter: string;
  stateFilter: string;
  onUsernameChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onStateChange: (value: string) => void;
}

const ReferralFilters: React.FC<ReferralFiltersProps> = ({
  usernameFilter,
  cityFilter,
  stateFilter,
  onUsernameChange,
  onCityChange,
  onStateChange
}) => {
  return (
    <div className="bg-white p-4 rounded-lg border mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Search className="w-5 h-5 text-gray-500" />
        <h3 className="font-semibold">Filter Referrals</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="username-filter">Username</Label>
          <Input
            id="username-filter"
            placeholder="Search by username..."
            value={usernameFilter}
            onChange={(e) => onUsernameChange(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="city-filter">City</Label>
          <Input
            id="city-filter"
            placeholder="Search by city..."
            value={cityFilter}
            onChange={(e) => onCityChange(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="state-filter">State</Label>
          <Input
            id="state-filter"
            placeholder="Search by state..."
            value={stateFilter}
            onChange={(e) => onStateChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default ReferralFilters;