import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye, UserX, ShieldOff, ShieldCheck, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { getAdminUserId } from "@/lib/adminAuth";
import AdminUserFiltersEnhanced from "./AdminUserFiltersEnhanced";
import AdminUserDetailsEnhanced from "./AdminUserDetailsEnhanced";

interface User {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  mobile_number?: string;
  city?: string;
  state?: string;
  user_type: string;
  gender?: string;
  profile_photo?: string;
  banner_photo?: string;
  front_page_photo?: string;
  created_at: string;
  last_login_at?: string | null;
  is_active: boolean;
  deactivated_at?: string;
  referred_by?: string;
  referred_by_photo?: string;
}

type SortKey = "last_login" | "joined";

const PAGE_SIZE = 50;

const AdminUsersListEnhanced: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("last_login");
  const [page, setPage] = useState(1);

  const [userTypeFilter, setUserTypeFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [usernameFilter, setUsernameFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [referredByFilter, setReferredByFilter] = useState("");

  const { toast } = useToast();

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    applyFilters();
  }, [users, userTypeFilter, genderFilter, usernameFilter, cityFilter, stateFilter, referredByFilter, sortKey]);

  useEffect(() => {
    setPage(1);
  }, [userTypeFilter, genderFilter, usernameFilter, cityFilter, stateFilter, referredByFilter, sortKey]);


  const fetchUsers = async () => {
    try {
      const adminUserId = getAdminUserId();
      const { data, error } = await supabase.functions.invoke('admin-data', {
        body: { action: 'fetchAllUsers', adminUserId }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setUsers((data?.data as User[]) || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({ title: "Error", description: "Failed to load users", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];
    if (userTypeFilter !== "all") {
      filtered = filtered.filter((user) => {
        const userType = user.user_type?.toLowerCase() || "";
        if (userTypeFilter === "female") return userType === "female" || userType === "normal" || userType === "";
        return userType === userTypeFilter;
      });
    }
    if (genderFilter !== "all") {
      filtered = filtered.filter((user) => {
        const gender = user.gender?.toLowerCase() || "";
        const userType = user.user_type?.toLowerCase() || "";
        if (genderFilter === "male") return gender === "male" || userType === "male";
        if (genderFilter === "female") return gender === "female" || userType === "female" || userType === "normal" || userType === "stripper" || userType === "exotic" || (!gender && !userType);
        return true;
      });
    }
    if (usernameFilter) filtered = filtered.filter((u) => u.username?.toLowerCase().includes(usernameFilter.toLowerCase()));
    if (cityFilter) filtered = filtered.filter((u) => u.city?.toLowerCase().includes(cityFilter.toLowerCase()));
    if (stateFilter) filtered = filtered.filter((u) => u.state?.toLowerCase().includes(stateFilter.toLowerCase()));
    if (referredByFilter) filtered = filtered.filter((u) => u.referred_by?.toLowerCase().includes(referredByFilter.toLowerCase()));
    setFilteredUsers(filtered);
  };

  const getGenderDisplay = (user: User) => {
    const gender = user.gender?.toLowerCase() || "";
    const userType = user.user_type?.toLowerCase() || "";
    if (gender === "male") return "Male";
    if (gender === "female") return "Female";
    if (userType === "male") return "Male";
    if (["female", "stripper", "exotic"].includes(userType)) return "Female";
    return "Unknown";
  };

  const getUserTypeDisplay = (userType: string) => {
    switch (userType?.toLowerCase()) {
      case "stripper": return "Stripper";
      case "exotic": return "Exotic";
      case "normal": return "Normal";
      case "male": return "Male";
      case "female": return "Female";
      default: return userType || "Unknown";
    }
  };

  const getUserTypeBadgeVariant = (userType: string) => {
    switch (userType?.toLowerCase()) {
      case "stripper": return "destructive";
      case "exotic": return "secondary";
      case "male": return "outline";
      default: return "default";
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user? They will be unable to log in but their data will be preserved.')) return;
    try {
      const adminUserId = getAdminUserId();
      const { data, error } = await supabase.functions.invoke('admin-data', {
        body: { action: 'deactivateUser', userId, adminUserId }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Success", description: "User deactivated. A notification email has been sent." });
      fetchUsers();
    } catch (error) {
      console.error("Error deactivating user:", error);
      toast({ title: "Error", description: "Failed to deactivate user", variant: "destructive" });
    }
  };

  const handleReactivateUser = async (userId: string) => {
    if (!confirm('Are you sure you want to reactivate this user? They will be able to log in again.')) return;
    try {
      const adminUserId = getAdminUserId();
      const { data, error } = await supabase.functions.invoke('admin-data', {
        body: { action: 'reactivateUser', userId, adminUserId }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Success", description: "User reactivated successfully" });
      fetchUsers();
    } catch (error) {
      console.error("Error reactivating user:", error);
      toast({ title: "Error", description: "Failed to reactivate user", variant: "destructive" });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('⚠️ PERMANENT ACTION: Are you sure you want to permanently delete this user? This cannot be undone.')) return;
    try {
      const adminUserId = getAdminUserId();
      const { data, error } = await supabase.functions.invoke('admin-data', {
        body: { action: 'deleteUser', userId, adminUserId }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Success", description: "User permanently deleted" });
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({ title: "Error", description: "Failed to delete user", variant: "destructive" });
    }
  };

  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setShowDetails(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminUserFiltersEnhanced
            userTypeFilter={userTypeFilter} setUserTypeFilter={setUserTypeFilter}
            genderFilter={genderFilter} setGenderFilter={setGenderFilter}
            usernameFilter={usernameFilter} setUsernameFilter={setUsernameFilter}
            cityFilter={cityFilter} setCityFilter={setCityFilter}
            stateFilter={stateFilter} setStateFilter={setStateFilter}
            referredByFilter={referredByFilter} setReferredByFilter={setReferredByFilter}
          />

          <div className="text-sm text-muted-foreground mb-4">
            Showing {filteredUsers.length} of {users.length} users
          </div>

          <div className="grid gap-4">
            {filteredUsers.map((user) => (
              <Card key={user.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-start space-x-4">
                      <Avatar className="h-12 w-12 shrink-0">
                        <AvatarImage src={user.profile_photo} />
                        <AvatarFallback>{user.username?.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold">{user.username}</h3>
                          <Badge variant={getUserTypeBadgeVariant(user.user_type)}>
                            {getUserTypeDisplay(user.user_type)}
                          </Badge>
                          <Badge variant="outline">{getGenderDisplay(user)}</Badge>
                          {user.is_active === false && (
                            <Badge variant="destructive">Deactivated</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p><strong>Name:</strong> {user.first_name} {user.last_name}</p>
                          <p className="break-all"><strong>Email:</strong> {user.email}</p>
                          <p><strong>Phone:</strong> {user.mobile_number || "N/A"}</p>
                          <p><strong>Location:</strong> {user.city}, {user.state}</p>
                          {user.referred_by && <p><strong>Referred by:</strong> {user.referred_by}</p>}
                          <p><strong>Joined:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
                          {user.deactivated_at && (
                            <p className="text-destructive"><strong>Deactivated:</strong> {new Date(user.deactivated_at).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col gap-2 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => handleViewDetails(user)}>
                        <Eye className="w-4 h-4 mr-1" /> Details
                      </Button>

                      {user.is_active === false ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-green-500 text-green-600 hover:bg-green-50"
                          onClick={() => handleReactivateUser(user.id)}
                        >
                          <ShieldCheck className="w-4 h-4 mr-1" /> Reactivate
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-orange-500 text-orange-600 hover:bg-orange-50"
                          onClick={() => handleDeactivateUser(user.id)}
                        >
                          <ShieldOff className="w-4 h-4 mr-1" /> Deactivate
                        </Button>
                      )}

                      <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user.id)}>
                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No users found matching the current filters</p>
            </div>
          )}
        </CardContent>
      </Card>

      <AdminUserDetailsEnhanced
        user={selectedUser}
        isOpen={showDetails}
        onClose={() => { setShowDetails(false); setSelectedUser(null); }}
        onUserUpdated={fetchUsers}
      />
    </div>
  );
};

export default AdminUsersListEnhanced;
