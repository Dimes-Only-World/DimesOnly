import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EventFiltersProps {
  filters: {
    username: string;
    city: string;
    state: string;
    category: string;
  };
  setFilters: React.Dispatch<React.SetStateAction<{
    username: string;
    city: string;
    state: string;
    category: string;
  }>>;
  categories: string[];
}

const EventFilters: React.FC<EventFiltersProps> = ({ filters, setFilters, categories }) => {
  return (
    <Card className="bg-gray-900 border-gray-700 mb-8">
      <CardContent className="p-6">
        <h2 className="text-xl font-bold text-yellow-400 mb-4">Filter Events</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="username" className="text-white">Username</Label>
            <Input
              id="username"
              value={filters.username}
              onChange={(e) => setFilters(prev => ({ ...prev, username: e.target.value }))}
              placeholder="Search username"
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>
          <div>
            <Label htmlFor="city" className="text-white">City</Label>
            <Input
              id="city"
              value={filters.city}
              onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
              placeholder="Search city"
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>
          <div>
            <Label htmlFor="state" className="text-white">State</Label>
            <Input
              id="state"
              value={filters.state}
              onChange={(e) => setFilters(prev => ({ ...prev, state: e.target.value }))}
              placeholder="Search state"
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>
          <div>
            <Label htmlFor="category" className="text-white">Category</Label>
            <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}>
              <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                <SelectItem value="" className="text-white">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category} className="text-white">
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EventFilters;