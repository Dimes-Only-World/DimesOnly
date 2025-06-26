import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AdminUserFiltersEnhancedProps {
  userTypeFilter: string;
  setUserTypeFilter: (value: string) => void;
  usernameFilter: string;
  setUsernameFilter: (value: string) => void;
  cityFilter: string;
  setCityFilter: (value: string) => void;
  stateFilter: string;
  setStateFilter: (value: string) => void;
  genderFilter: string;
  setGenderFilter: (value: string) => void;
}

const AdminUserFiltersEnhanced: React.FC<AdminUserFiltersEnhancedProps> = ({
  userTypeFilter,
  setUserTypeFilter,
  usernameFilter,
  setUsernameFilter,
  cityFilter,
  setCityFilter,
  stateFilter,
  setStateFilter,
  genderFilter,
  setGenderFilter,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
      <div>
        <Label htmlFor="userType">User Type</Label>
        <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="stripper">Stripper</SelectItem>
            <SelectItem value="exotic">Exotic</SelectItem>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="normal">Female</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="gender">Gender</Label>
        <Select value={genderFilter} onValueChange={setGenderFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Genders" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Genders</SelectItem>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          placeholder="Filter by username"
          value={usernameFilter}
          onChange={(e) => setUsernameFilter(e.target.value)}
        />
      </div>
      
      <div>
        <Label htmlFor="city">City</Label>
        <Input
          id="city"
          placeholder="Filter by city"
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
        />
      </div>
      
      <div>
        <Label htmlFor="state">State</Label>
        <Input
          id="state"
          placeholder="Filter by state"
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
        />
      </div>
    </div>
  );
};

export default AdminUserFiltersEnhanced;