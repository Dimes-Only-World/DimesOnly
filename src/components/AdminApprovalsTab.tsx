import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';
import { getAdminUserId } from '@/lib/adminAuth';
import { CheckCircle, XCircle, Clock, Mail, User } from 'lucide-react';

interface PerformerUser {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  user_type: string;
  profile_photo?: string;
  mobile_number?: string;
  city?: string;
  state?: string;
  created_at: string;
  approval_status?: string;
}

const callAdminData = async (action: string, params: Record<string, unknown> = {}) => {
  const adminUserId = getAdminUserId();
  if (!adminUserId) throw new Error('Not authenticated as admin');

  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action, adminUserId, ...params }),
  });

  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || 'Request failed');
  return json.data;
};

const AdminApprovalsTab: React.FC = () => {
  const [users, setUsers] = useState<PerformerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'not_approved' | 'all'>('pending');
  const { toast } = useToast();

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const data = await callAdminData('fetchPendingApprovals');
      setUsers(data || []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load approvals', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    if (!confirm('Approve this performer? They will receive an email with the option to upgrade to Diamond+.')) return;
    setProcessingId(userId);
    try {
      const result = await callAdminData('approvePerformer', { userId });
      toast({
        title: 'Approved',
        description: result.emailSent
          ? 'Performer approved and email sent successfully.'
          : 'Performer approved but email could not be sent.',
      });
      fetchApprovals();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to approve performer', variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (userId: string) => {
    if (!confirm('Mark this performer as Not Approved? They will receive an email with next steps.')) return;
    setProcessingId(userId);
    try {
      const result = await callAdminData('rejectPerformer', { userId });
      toast({
        title: 'Not Approved',
        description: result.emailSent
          ? 'Decision recorded and email sent.'
          : 'Decision recorded but email could not be sent.',
      });
      fetchApprovals();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to reject performer', variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (filter === 'all') return true;
    return (u.approval_status || 'pending') === filter;
  });

  const pendingCount = users.filter((u) => (u.approval_status || 'pending') === 'pending').length;
  const approvedCount = users.filter((u) => u.approval_status === 'approved').length;
  const rejectedCount = users.filter((u) => u.approval_status === 'not_approved').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Approved</Badge>;
      case 'not_approved':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Not Approved</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-muted-foreground">Loading approvals...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Performer Approvals</h2>
          <p className="text-sm text-muted-foreground">Review stripper and exotic applicants</p>
        </div>
        <Button variant="outline" onClick={fetchApprovals}>Refresh</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('pending')}>
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 mx-auto mb-1 text-yellow-600" />
            <p className="text-2xl font-bold">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('approved')}>
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-6 h-6 mx-auto mb-1 text-green-600" />
            <p className="text-2xl font-bold">{approvedCount}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('not_approved')}>
          <CardContent className="p-4 text-center">
            <XCircle className="w-6 h-6 mx-auto mb-1 text-red-600" />
            <p className="text-2xl font-bold">{rejectedCount}</p>
            <p className="text-xs text-muted-foreground">Not Approved</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('all')}>
          <CardContent className="p-4 text-center">
            <User className="w-6 h-6 mx-auto mb-1 text-blue-600" />
            <p className="text-2xl font-bold">{users.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter indicator */}
      <p className="text-sm text-muted-foreground">
        Showing: <span className="font-medium capitalize">{filter}</span> ({filteredUsers.length})
      </p>

      {/* User list */}
      {filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No {filter === 'all' ? '' : filter} performers found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredUsers.map((user) => {
            const status = user.approval_status || 'pending';
            const isProcessing = processingId === user.id;

            return (
              <Card key={user.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Profile photo */}
                    <div className="flex-shrink-0">
                      {user.profile_photo ? (
                        <img
                          src={user.profile_photo}
                          alt={user.username}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                          <User className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* User info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{user.username}</h3>
                        <Badge variant="outline" className="capitalize">{user.user_type}</Badge>
                        {getStatusBadge(status)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        <Mail className="w-3 h-3 inline mr-1" />{user.email}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {user.first_name} {user.last_name}
                        {user.city && user.state ? ` • ${user.city}, ${user.state}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Action buttons */}
                    {status === 'pending' && (
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleApprove(user.id)}
                          disabled={isProcessing}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          {isProcessing ? 'Processing...' : 'Approve'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(user.id)}
                          disabled={isProcessing}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          {isProcessing ? 'Processing...' : 'Not Approved'}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminApprovalsTab;
