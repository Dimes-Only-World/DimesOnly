import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Trash2, Edit } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  created_at: string;
}

const AdminEventsTab: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', date: '', location: '' });
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showEditEvent, setShowEditEvent] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.date) {
      toast({ title: 'Error', description: 'Please fill in title and date', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('events').insert(newEvent);
      if (error) throw error;

      toast({ title: 'Success', description: 'Event created successfully' });
      setNewEvent({ title: '', description: '', date: '', location: '' });
      setShowAddEvent(false);
      fetchEvents();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create event', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditEvent = async () => {
    if (!editingEvent) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({
          title: editingEvent.title,
          description: editingEvent.description,
          date: editingEvent.date,
          location: editingEvent.location
        })
        .eq('id', editingEvent.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Event updated successfully' });
      setEditingEvent(null);
      setShowEditEvent(false);
      fetchEvents();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update event', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const { error } = await supabase.from('events').delete().eq('id', eventId);
      if (error) throw error;

      toast({ title: 'Success', description: 'Event deleted successfully' });
      fetchEvents();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete event', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Events Management</h2>
        <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
          <DialogTrigger asChild>
            <Button>Add New Event</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create New Event</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input value={newEvent.title} onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))} placeholder="Event title" />
              <Input type="datetime-local" value={newEvent.date} onChange={(e) => setNewEvent(prev => ({ ...prev, date: e.target.value }))} />
              <Input value={newEvent.location} onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))} placeholder="Event location" />
              <Textarea value={newEvent.description} onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))} placeholder="Event description" rows={3} />
              <Button onClick={handleAddEvent} disabled={loading} className="w-full">{loading ? 'Creating...' : 'Create Event'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {events.length === 0 ? (
        <Card><CardContent className="text-center py-8"><p className="text-muted-foreground">No Events Yet</p></CardContent></Card>
      ) : (
        events.map((event) => (
          <Card key={event.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{event.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{new Date(event.date).toLocaleString()}</p>
                  {event.location && <p className="text-sm text-muted-foreground">📍 {event.location}</p>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditingEvent(event); setShowEditEvent(true); }}><Edit className="w-4 h-4" /></Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDeleteEvent(event.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>{event.description && <p className="text-sm">{event.description}</p>}</CardContent>
          </Card>
        ))
      )}

      <Dialog open={showEditEvent} onOpenChange={setShowEditEvent}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Event</DialogTitle></DialogHeader>
          {editingEvent && (
            <div className="space-y-4">
              <Input value={editingEvent.title} onChange={(e) => setEditingEvent(prev => prev ? { ...prev, title: e.target.value } : null)} placeholder="Event title" />
              <Input type="datetime-local" value={editingEvent.date} onChange={(e) => setEditingEvent(prev => prev ? { ...prev, date: e.target.value } : null)} />
              <Input value={editingEvent.location} onChange={(e) => setEditingEvent(prev => prev ? { ...prev, location: e.target.value } : null)} placeholder="Event location" />
              <Textarea value={editingEvent.description} onChange={(e) => setEditingEvent(prev => prev ? { ...prev, description: e.target.value } : null)} placeholder="Event description" rows={3} />
              <Button onClick={handleEditEvent} disabled={loading} className="w-full">{loading ? 'Updating...' : 'Update Event'}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEventsTab;