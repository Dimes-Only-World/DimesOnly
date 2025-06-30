import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import {
  Trash2,
  Edit,
  Users,
  Plus,
  UserMinus,
  Calendar,
  MapPin,
  DollarSign,
  Clock,
  Upload,
  Image,
  Video,
} from "lucide-react";

interface Event {
  id: string;
  name: string;
  description: string;
  date: string;
  start_time: string;
  end_time: string;
  address: string;
  city: string;
  state: string;
  location: string;
  genre: string;
  price: number;
  max_attendees: number;
  free_spots_strippers: number;
  free_spots_exotics: number;
  photo_url?: string;
  video_urls?: string[];
  additional_photos?: string[];
  created_at: string;
  current_attendees?: number;
}

interface Attendee {
  id: string;
  user_id: string;
  event_id: string;
  username: string;
  payment_status: string;
  created_at: string;
  users: {
    username: string;
    profile_photo?: string;
    user_type: string;
  };
}

const AdminEventsTab: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [newEvent, setNewEvent] = useState({
    name: "",
    description: "",
    date: "",
    start_time: "",
    end_time: "",
    address: "",
    city: "",
    state: "",
    location: "",
    genre: "Nightlife",
    price: 0,
    max_attendees: 100,
    free_spots_strippers: 5,
    free_spots_exotics: 5,
    photo_url: "",
  });
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showEditEvent, setShowEditEvent] = useState(false);
  const [showAttendees, setShowAttendees] = useState(false);

  // File upload states
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [additionalPhotoFiles, setAdditionalPhotoFiles] = useState<File[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    fetchEvents();
  }, []);

  const uploadFileToStorage = async (
    file: File,
    bucket: string,
    folder?: string
  ): Promise<string | null> => {
    try {
      console.log("🔄 Uploading file to storage:", {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        bucket,
        folder,
      });

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${fileExt}`;
      const filePath = folder ? `${folder}/${fileName}` : fileName;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (error) {
        console.error("❌ Storage upload error:", error);
        throw error;
      }

      console.log("✅ File uploaded successfully:", data);

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(filePath);

      console.log("🔗 Public URL generated:", publicUrl);
      return publicUrl;
    } catch (error) {
      console.error("❌ File upload failed:", error);
      toast({
        title: "Upload Error",
        description: `Failed to upload ${file.name}. Please try again.`,
        variant: "destructive",
      });
      return null;
    }
  };

  const fetchEvents = async () => {
    try {
      console.log("🔄 Fetching events...");
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("date", { ascending: true });

      if (error) {
        console.error("❌ Error fetching events:", error);
        throw error;
      }

      console.log(
        "✅ Events fetched successfully:",
        data?.length || 0,
        "events"
      );

      // Get attendee counts for each event
      const eventsWithCounts = await Promise.all(
        (data || []).map(async (event) => {
          const { count } = await supabase
            .from("user_events")
            .select("*", { count: "exact", head: true })
            .eq("event_id", event.id);

          return {
            ...event,
            current_attendees: count || 0,
          };
        })
      );

      setEvents(eventsWithCounts as Event[]);
    } catch (error) {
      console.error("❌ Error in fetchEvents:", error);
      toast({
        title: "Error",
        description: "Failed to fetch events",
        variant: "destructive",
      });
    }
  };

  const fetchEventAttendees = async (eventId: string) => {
    try {
      console.log("🔄 Fetching attendees for event:", eventId);
      const { data, error } = await supabase
        .from("user_events")
        .select(
          `
          id,
          user_id,
          event_id,
          username,
          payment_status,
          created_at,
          users (
            username,
            profile_photo,
            user_type
          )
        `
        )
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Error fetching attendees:", error);
        throw error;
      }

      console.log("✅ Attendees fetched:", data?.length || 0, "attendees");
      console.log("📋 Sample attendee data:", data?.[0]); // Debug log
      setAttendees((data as unknown as Attendee[]) || []);
    } catch (error) {
      console.error("❌ Error in fetchEventAttendees:", error);
    }
  };

  const handleAddEvent = async () => {
    if (!newEvent.name || !newEvent.date) {
      toast({
        title: "Error",
        description: "Please fill in event name and date",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setUploading(true);

    try {
      console.log("🔄 Starting event creation process...");
      console.log("📝 Event data:", newEvent);

      let photoUrl = newEvent.photo_url;
      const videoUrls: string[] = [];
      const additionalPhotoUrls: string[] = [];

      // Upload main photo if provided
      if (photoFile) {
        console.log("📸 Uploading main photo...");
        photoUrl = (await uploadFileToStorage(photoFile, "event-photos")) || "";
      }

      // Upload videos if provided
      if (videoFiles.length > 0) {
        console.log("🎥 Uploading videos...", videoFiles.length, "files");
        for (const video of videoFiles) {
          const videoUrl = await uploadFileToStorage(video, "event-videos");
          if (videoUrl) {
            videoUrls.push(videoUrl);
          }
        }
        console.log("✅ Videos uploaded:", videoUrls.length, "successful");
      }

      // Upload additional photos if provided
      if (additionalPhotoFiles.length > 0) {
        console.log(
          "📷 Uploading additional photos...",
          additionalPhotoFiles.length,
          "files"
        );
        for (const photo of additionalPhotoFiles) {
          const photoUrl = await uploadFileToStorage(photo, "event-photos");
          if (photoUrl) {
            additionalPhotoUrls.push(photoUrl);
          }
        }
        console.log(
          "✅ Additional photos uploaded:",
          additionalPhotoUrls.length,
          "successful"
        );
      }

      // Create the location field by combining address, city, state
      const location =
        [newEvent.address, newEvent.city, newEvent.state]
          .filter(Boolean)
          .join(", ") || "TBD";

      const eventData = {
        name: newEvent.name,
        description: newEvent.description || null,
        date: newEvent.date,
        start_time: newEvent.start_time || null,
        end_time: newEvent.end_time || null,
        address: newEvent.address || null,
        city: newEvent.city || null,
        state: newEvent.state || null,
        location: location, // This is the required field
        genre: newEvent.genre || "Nightlife",
        price: newEvent.price || 0,
        max_attendees: newEvent.max_attendees || 100,
        free_spots_strippers: newEvent.free_spots_strippers || 0,
        free_spots_exotics: newEvent.free_spots_exotics || 0,
        photo_url: photoUrl || null,
        video_urls: videoUrls.length > 0 ? videoUrls : null,
        additional_photos:
          additionalPhotoUrls.length > 0 ? additionalPhotoUrls : null,
        created_at: new Date().toISOString(),
      };

      console.log("💾 Inserting event into database:", eventData);

      const { data, error } = await supabase
        .from("events")
        .insert(eventData)
        .select()
        .single();

      if (error) {
        console.error("❌ Database insert error:", error);
        console.error("❌ Error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }

      console.log("✅ Event created successfully:", data);

      toast({
        title: "Success",
        description: "Event created successfully!",
      });

      // Reset form
      setNewEvent({
        name: "",
        description: "",
        date: "",
        start_time: "",
        end_time: "",
        address: "",
        city: "",
        state: "",
        location: "",
        genre: "Nightlife",
        price: 0,
        max_attendees: 100,
        free_spots_strippers: 5,
        free_spots_exotics: 5,
        photo_url: "",
      });

      // Reset file inputs
      setPhotoFile(null);
      setVideoFiles([]);
      setAdditionalPhotoFiles([]);

      setShowAddEvent(false);
      fetchEvents();
    } catch (error) {
      console.error("❌ Event creation failed:", error);
      toast({
        title: "Error",
        description: `Failed to create event: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const handleEditEvent = async () => {
    if (!editingEvent) return;

    setLoading(true);
    try {
      console.log("🔄 Updating event:", editingEvent.id);

      // Create the location field by combining address, city, state
      const location =
        [editingEvent.address, editingEvent.city, editingEvent.state]
          .filter(Boolean)
          .join(", ") ||
        editingEvent.location ||
        "TBD";

      const updateData = {
        name: editingEvent.name,
        description: editingEvent.description,
        date: editingEvent.date,
        start_time: editingEvent.start_time,
        end_time: editingEvent.end_time,
        address: editingEvent.address,
        city: editingEvent.city,
        state: editingEvent.state,
        location: location,
        genre: editingEvent.genre,
        price: editingEvent.price,
        max_attendees: editingEvent.max_attendees,
        free_spots_strippers: editingEvent.free_spots_strippers,
        free_spots_exotics: editingEvent.free_spots_exotics,
        photo_url: editingEvent.photo_url,
      };

      console.log("💾 Update data:", updateData);

      const { error } = await supabase
        .from("events")
        .update(updateData)
        .eq("id", editingEvent.id);

      if (error) {
        console.error("❌ Update error:", error);
        throw error;
      }

      console.log("✅ Event updated successfully");
      toast({ title: "Success", description: "Event updated successfully" });
      setEditingEvent(null);
      setShowEditEvent(false);
      fetchEvents();
    } catch (error) {
      console.error("❌ Event update failed:", error);
      toast({
        title: "Error",
        description: "Failed to update event",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this event? This will also remove all attendees."
      )
    )
      return;

    try {
      console.log("🔄 Deleting event:", eventId);

      // First delete all attendees for this event
      const { error: attendeesError } = await supabase
        .from("user_events")
        .delete()
        .eq("event_id", eventId);

      if (attendeesError) {
        console.error("❌ Error deleting attendees:", attendeesError);
        throw attendeesError;
      }

      // Then delete the event
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);

      if (error) {
        console.error("❌ Error deleting event:", error);
        throw error;
      }

      console.log("✅ Event deleted successfully");
      toast({ title: "Success", description: "Event deleted successfully" });
      fetchEvents();
    } catch (error) {
      console.error("❌ Event deletion failed:", error);
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      });
    }
  };

  const handleRemoveAttendee = async (attendeeId: string) => {
    try {
      console.log("🔄 Removing attendee with ID:", attendeeId);

      // Add confirmation dialog
      const confirmed = window.confirm(
        "Are you sure you want to remove this attendee?"
      );
      if (!confirmed) return;

      const { error } = await supabase
        .from("user_events")
        .delete()
        .eq("id", attendeeId);

      if (error) {
        console.error("❌ Error removing attendee:", error);
        throw error;
      }

      console.log("✅ Attendee removed successfully from database");
      toast({ title: "Success", description: "Attendee removed successfully" });

      // Refresh both attendees list and events list
      if (selectedEvent) {
        await fetchEventAttendees(selectedEvent.id);
      }
      await fetchEvents();
    } catch (error) {
      console.error("❌ Attendee removal failed:", error);
      toast({
        title: "Error",
        description: `Failed to remove attendee: ${
          error.message || "Unknown error"
        }`,
        variant: "destructive",
      });
    }
  };

  const handleViewAttendees = (event: Event) => {
    setSelectedEvent(event);
    fetchEventAttendees(event.id);
    setShowAttendees(true);
  };

  const handleCloseDialog = (dialogType: string) => {
    console.log(`🔄 Closing ${dialogType} dialog`);

    if (dialogType === "add") {
      console.log("📝 Add event dialog closed - Current form state:", newEvent);
      console.log("📁 Files selected:", {
        photoFile: photoFile?.name,
        videoFiles: videoFiles.map((f) => f.name),
        additionalPhotoFiles: additionalPhotoFiles.map((f) => f.name),
      });
      setShowAddEvent(false);
    } else if (dialogType === "edit") {
      console.log(
        "✏️ Edit event dialog closed - Current editing event:",
        editingEvent?.id
      );
      setShowEditEvent(false);
    } else if (dialogType === "attendees") {
      console.log("👥 Attendees dialog closed - Event:", selectedEvent?.name);
      setShowAttendees(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Events Management</h2>
        <Dialog
          open={showAddEvent}
          onOpenChange={(open) => {
            if (!open) handleCloseDialog("add");
            setShowAddEvent(open);
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add New Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Event Name *
                  </label>
                  <Input
                    value={newEvent.name}
                    onChange={(e) =>
                      setNewEvent((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Event name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Genre
                  </label>
                  <Select
                    value={newEvent.genre}
                    onValueChange={(value) =>
                      setNewEvent((prev) => ({ ...prev, genre: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Nightlife">Nightlife</SelectItem>
                      <SelectItem value="Concerts">Concerts</SelectItem>
                      <SelectItem value="Yacht Parties">
                        Yacht Parties
                      </SelectItem>
                      <SelectItem value="Mansion Parties">
                        Mansion Parties
                      </SelectItem>
                      <SelectItem value="Food & Drink">Food & Drink</SelectItem>
                      <SelectItem value="Sports">Sports</SelectItem>
                      <SelectItem value="Arts & Culture">
                        Arts & Culture
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Date *
                  </label>
                  <Input
                    type="date"
                    value={newEvent.date}
                    onChange={(e) =>
                      setNewEvent((prev) => ({ ...prev, date: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Start Time
                  </label>
                  <Input
                    type="time"
                    value={newEvent.start_time}
                    onChange={(e) =>
                      setNewEvent((prev) => ({
                        ...prev,
                        start_time: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    End Time
                  </label>
                  <Input
                    type="time"
                    value={newEvent.end_time}
                    onChange={(e) =>
                      setNewEvent((prev) => ({
                        ...prev,
                        end_time: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Address
                  </label>
                  <Input
                    value={newEvent.address}
                    onChange={(e) =>
                      setNewEvent((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                    placeholder="Street address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">City</label>
                  <Input
                    value={newEvent.city}
                    onChange={(e) =>
                      setNewEvent((prev) => ({ ...prev, city: e.target.value }))
                    }
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    State
                  </label>
                  <Input
                    value={newEvent.state}
                    onChange={(e) =>
                      setNewEvent((prev) => ({
                        ...prev,
                        state: e.target.value,
                      }))
                    }
                    placeholder="State"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Price ($)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newEvent.price}
                    onChange={(e) =>
                      setNewEvent((prev) => ({
                        ...prev,
                        price: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Max Attendees
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={newEvent.max_attendees}
                    onChange={(e) =>
                      setNewEvent((prev) => ({
                        ...prev,
                        max_attendees: parseInt(e.target.value) || 100,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Free Strippers
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={newEvent.free_spots_strippers}
                    onChange={(e) =>
                      setNewEvent((prev) => ({
                        ...prev,
                        free_spots_strippers: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Free Exotics
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={newEvent.free_spots_exotics}
                    onChange={(e) =>
                      setNewEvent((prev) => ({
                        ...prev,
                        free_spots_exotics: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>

              {/* File Upload Section */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-medium">Media Upload</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Main Photo Upload */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      <Image className="w-4 h-4 inline mr-1" />
                      Main Event Photo
                    </label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setPhotoFile(e.target.files?.[0] || null)
                      }
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {photoFile && (
                      <p className="text-xs text-gray-500 mt-1">
                        Selected: {photoFile.name}
                      </p>
                    )}
                  </div>

                  {/* Video Upload */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      <Video className="w-4 h-4 inline mr-1" />
                      Event Videos
                    </label>
                    <Input
                      type="file"
                      accept="video/*"
                      multiple
                      onChange={(e) =>
                        setVideoFiles(Array.from(e.target.files || []))
                      }
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                    />
                    {videoFiles.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Selected: {videoFiles.length} video(s)
                      </p>
                    )}
                  </div>

                  {/* Additional Photos Upload */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      <Image className="w-4 h-4 inline mr-1" />
                      Additional Photos
                    </label>
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) =>
                        setAdditionalPhotoFiles(
                          Array.from(e.target.files || [])
                        )
                      }
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                    />
                    {additionalPhotoFiles.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Selected: {additionalPhotoFiles.length} photo(s)
                      </p>
                    )}
                  </div>
                </div>

                {/* Alternative URL input */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Or Enter Photo URL
                  </label>
                  <Input
                    value={newEvent.photo_url}
                    onChange={(e) =>
                      setNewEvent((prev) => ({
                        ...prev,
                        photo_url: e.target.value,
                      }))
                    }
                    placeholder="https://example.com/photo.jpg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <Textarea
                  value={newEvent.description}
                  onChange={(e) =>
                    setNewEvent((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Event description - this will be shown in the details view"
                  rows={3}
                />
              </div>

              <Button
                onClick={handleAddEvent}
                disabled={loading || uploading}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Upload className="w-4 h-4 mr-2 animate-spin" />
                    Uploading Files...
                  </>
                ) : loading ? (
                  "Creating Event..."
                ) : (
                  "Create Event"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No Events Yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {events.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      {event.name}
                    </CardTitle>
                    <div className="space-y-1 mt-2 text-sm text-muted-foreground">
                      <p className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {new Date(event.date).toLocaleDateString()}
                        {event.start_time && ` at ${event.start_time}`}
                        {event.end_time && ` - ${event.end_time}`}
                      </p>
                      {event.location && (
                        <p className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {event.location}
                        </p>
                      )}
                      <p className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />${event.price} • Max:{" "}
                        {event.max_attendees} • Free:{" "}
                        {event.free_spots_strippers} strippers,{" "}
                        {event.free_spots_exotics} exotics
                      </p>
                      <p className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {event.current_attendees || 0} attendees
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewAttendees(event)}
                    >
                      <Users className="w-4 h-4 mr-1" />
                      Attendees
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingEvent(event);
                        setShowEditEvent(true);
                      }}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteEvent(event.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {event.description && (
                <CardContent>
                  <p className="text-sm text-gray-600">{event.description}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Edit Event Dialog */}
      <Dialog
        open={showEditEvent}
        onOpenChange={(open) => {
          if (!open) handleCloseDialog("edit");
          setShowEditEvent(open);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          {editingEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Event Name *
                  </label>
                  <Input
                    value={editingEvent.name}
                    onChange={(e) =>
                      setEditingEvent((prev) =>
                        prev ? { ...prev, name: e.target.value } : null
                      )
                    }
                    placeholder="Event name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Genre
                  </label>
                  <Select
                    value={editingEvent.genre}
                    onValueChange={(value) =>
                      setEditingEvent((prev) =>
                        prev ? { ...prev, genre: value } : null
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Nightlife">Nightlife</SelectItem>
                      <SelectItem value="Concerts">Concerts</SelectItem>
                      <SelectItem value="Yacht Parties">
                        Yacht Parties
                      </SelectItem>
                      <SelectItem value="Mansion Parties">
                        Mansion Parties
                      </SelectItem>
                      <SelectItem value="Food & Drink">Food & Drink</SelectItem>
                      <SelectItem value="Sports">Sports</SelectItem>
                      <SelectItem value="Arts & Culture">
                        Arts & Culture
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Date *
                  </label>
                  <Input
                    type="date"
                    value={editingEvent.date}
                    onChange={(e) =>
                      setEditingEvent((prev) =>
                        prev ? { ...prev, date: e.target.value } : null
                      )
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Start Time
                  </label>
                  <Input
                    type="time"
                    value={editingEvent.start_time}
                    onChange={(e) =>
                      setEditingEvent((prev) =>
                        prev ? { ...prev, start_time: e.target.value } : null
                      )
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    End Time
                  </label>
                  <Input
                    type="time"
                    value={editingEvent.end_time}
                    onChange={(e) =>
                      setEditingEvent((prev) =>
                        prev ? { ...prev, end_time: e.target.value } : null
                      )
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Address
                  </label>
                  <Input
                    value={editingEvent.address}
                    onChange={(e) =>
                      setEditingEvent((prev) =>
                        prev ? { ...prev, address: e.target.value } : null
                      )
                    }
                    placeholder="Street address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">City</label>
                  <Input
                    value={editingEvent.city}
                    onChange={(e) =>
                      setEditingEvent((prev) =>
                        prev ? { ...prev, city: e.target.value } : null
                      )
                    }
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    State
                  </label>
                  <Input
                    value={editingEvent.state}
                    onChange={(e) =>
                      setEditingEvent((prev) =>
                        prev ? { ...prev, state: e.target.value } : null
                      )
                    }
                    placeholder="State"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Price ($)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingEvent.price}
                    onChange={(e) =>
                      setEditingEvent((prev) =>
                        prev
                          ? { ...prev, price: parseFloat(e.target.value) || 0 }
                          : null
                      )
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Max Attendees
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={editingEvent.max_attendees}
                    onChange={(e) =>
                      setEditingEvent((prev) =>
                        prev
                          ? {
                              ...prev,
                              max_attendees: parseInt(e.target.value) || 100,
                            }
                          : null
                      )
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Free Strippers
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={editingEvent.free_spots_strippers}
                    onChange={(e) =>
                      setEditingEvent((prev) =>
                        prev
                          ? {
                              ...prev,
                              free_spots_strippers:
                                parseInt(e.target.value) || 0,
                            }
                          : null
                      )
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Free Exotics
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={editingEvent.free_spots_exotics}
                    onChange={(e) =>
                      setEditingEvent((prev) =>
                        prev
                          ? {
                              ...prev,
                              free_spots_exotics: parseInt(e.target.value) || 0,
                            }
                          : null
                      )
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Photo URL
                </label>
                <Input
                  value={editingEvent.photo_url || ""}
                  onChange={(e) =>
                    setEditingEvent((prev) =>
                      prev ? { ...prev, photo_url: e.target.value } : null
                    )
                  }
                  placeholder="https://example.com/photo.jpg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <Textarea
                  value={editingEvent.description}
                  onChange={(e) =>
                    setEditingEvent((prev) =>
                      prev ? { ...prev, description: e.target.value } : null
                    )
                  }
                  placeholder="Event description - this will be shown in the details view"
                  rows={3}
                />
              </div>

              <Button
                onClick={handleEditEvent}
                disabled={loading}
                className="w-full"
              >
                {loading ? "Updating..." : "Update Event"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Attendees Management Dialog */}
      <Dialog
        open={showAttendees}
        onOpenChange={(open) => {
          if (!open) handleCloseDialog("attendees");
          setShowAttendees(open);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Attendees: {selectedEvent?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Total Attendees: {attendees.length} /{" "}
              {selectedEvent?.max_attendees}
            </div>

            {attendees.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No attendees yet</p>
            ) : (
              <div className="grid gap-3">
                {attendees.map((attendee) => (
                  <Card key={attendee.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <img
                          src={
                            attendee.users.profile_photo || "/placeholder.svg"
                          }
                          alt={attendee.users.username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-medium">
                            @{attendee.users.username}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {attendee.users.user_type || "User"}
                            </Badge>
                            <Badge
                              variant={
                                attendee.payment_status === "paid"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {attendee.payment_status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-500">
                          {new Date(attendee.created_at).toLocaleDateString()}
                        </p>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRemoveAttendee(attendee.id)}
                        >
                          <UserMinus className="w-4 h-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEventsTab;
