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
import { getAdminUserId } from "@/lib/adminAuth";
import { formatDateForInput, formatTime12Hour } from "@/lib/timeUtils";
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
  Phone,
  Search,
  Check,
  Lock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import EventTicketingFields from "@/components/admin/EventTicketingFields";

interface Event {
  id: string;
  name: string;
  description: string;
  date: string;
  date_tba?: boolean;
  end_date?: string | null;
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
  free_males_females: number;
  free_normal: number;
  free_spots_males: number;
  free_spots_females: number;
  free_spots_dimes?: number;
  free_spots_normals?: number;
  free_spots_silver_plus?: number;
  free_spots_diamond_plus?: number;
  free_spots_elite_plus?: number;
  free_spots_plus?: number;
  general_admission_price?: number;
  plus_ticket_mode?: string;
  plus_discount_percent?: number;
  vip_price: number;
  vip_tickets: number;
  vip_section_price: number;
  vip_section_attendees: number;
  vip_sections: number;
  group_discount_price: number;
  group_capacity: number;
  males_price: number;
  females_price: number;
  photo_url?: string;
  video_urls?: string[];
  additional_photos?: string[];
  banner_video_url?: string;
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
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  ticket_quantity: number;
  ticket_type: string;
  amount_paid: number;
  checked_in: boolean;
  checked_in_at?: string;
  guest_name?: string;
  users: {
    username: string;
    profile_photo?: string;
    user_type: string;
    first_name?: string;
    last_name?: string;
    phone_number?: string;
    mobile_number?: string;
    membership_tier?: string;
    gender?: string;
  };
}

const AdminEventsTab: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [newEvent, setNewEvent] = useState({
    name: "",
    description: "",
    date: "",
    date_tba: false,
    end_date: "",
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
    free_males_females: 0,
    free_normal: 10, // Default 10 free spots for members
    free_spots_males: 0,
    free_spots_females: 0,
    free_spots_dimes: 0,
    free_spots_normals: 0,
    free_spots_silver_plus: 0,
    free_spots_diamond_plus: 0,
    free_spots_elite_plus: 0,
    free_spots_plus: 0,
    general_admission_price: 0,
    plus_ticket_mode: "free",
    plus_discount_percent: 0,
    vip_price: 0,
    vip_tickets: 0,
    vip_section_price: 0,
    vip_section_attendees: 10,
    vip_sections: 0,
    group_discount_price: 0,
    group_capacity: 10,
    males_price: 0,
    females_price: 0,
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
  const [phoneSearch, setPhoneSearch] = useState("");
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [userTypeFilter, setUserTypeFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");

  // File upload states for creating
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [additionalPhotoFiles, setAdditionalPhotoFiles] = useState<File[]>([]);
  const [bannerVideoFile, setBannerVideoFile] = useState<File | null>(null);
  
  // File upload states for editing
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editVideoFiles, setEditVideoFiles] = useState<File[]>([]);
  const [editAdditionalPhotoFiles, setEditAdditionalPhotoFiles] = useState<File[]>([]);
  const [editBannerVideoFile, setEditBannerVideoFile] = useState<File | null>(null);

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

      // Get attendee counts for each event including guests (sum ticket_quantity)
      const eventsWithCounts = await Promise.all(
        (data || []).map(async (event) => {
          const { data: tickets } = await supabase
            .from("user_events")
            .select("ticket_quantity")
            .eq("event_id", event.id);

          // Sum all ticket quantities to get total attendees + guests
          const totalAttendees = (tickets || []).reduce(
            (sum: number, t: any) => sum + (t.ticket_quantity || 1), 
            0
          );

          return {
            ...event,
            current_attendees: totalAttendees,
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
          first_name,
          last_name,
          phone_number,
          ticket_quantity,
          ticket_type,
          amount_paid,
          checked_in,
          checked_in_at,
          guest_name,
          users (
            username,
            profile_photo,
            user_type,
            first_name,
            last_name,
            phone_number,
            mobile_number,
            membership_tier,
            gender
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
      console.log("📋 Sample attendee data:", data?.[0]);
      setAttendees((data as unknown as Attendee[]) || []);
    } catch (error) {
      console.error("❌ Error in fetchEventAttendees:", error);
    }
  };

  const handleCheckIn = async (attendeeId: string, currentStatus: boolean) => {
    setCheckingInId(attendeeId);
    try {
      console.log("🔄 Checking in attendee:", attendeeId);
      const { error } = await supabase
        .from("user_events")
        .update({
          checked_in: !currentStatus,
          checked_in_at: !currentStatus ? new Date().toISOString() : null,
        })
        .eq("id", attendeeId);

      if (error) {
        console.error("❌ Error checking in attendee:", error);
        throw error;
      }

      toast({
        title: "Success",
        description: currentStatus ? "Check-in removed" : "Attendee checked in!",
      });

      // Refresh attendees
      if (selectedEvent) {
        await fetchEventAttendees(selectedEvent.id);
      }
    } catch (error) {
      console.error("❌ Check-in failed:", error);
      toast({
        title: "Error",
        description: "Failed to update check-in status",
        variant: "destructive",
      });
    } finally {
      setCheckingInId(null);
    }
  };

  const handleAddEvent = async () => {
    if (!newEvent.name || (!newEvent.date && !newEvent.date_tba)) {
      toast({
        title: "Error",
        description: "Please fill in event name and date (or mark as TBA)",
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
      let bannerVideoUrl: string | null = null;

      // Upload main photo if provided
      if (photoFile) {
        console.log("📸 Uploading main photo...");
        photoUrl = (await uploadFileToStorage(photoFile, "event-photos")) || "";
      }

      // Upload banner video if provided
      if (bannerVideoFile) {
        console.log("🎥 Uploading banner video...");
        bannerVideoUrl = await uploadFileToStorage(bannerVideoFile, "event-videos", "banners");
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
        date: newEvent.date_tba ? "2099-12-31" : newEvent.date,
        end_date: newEvent.end_date || null,
        date_tba: newEvent.date_tba,
        start_time: newEvent.start_time || null,
        end_time: newEvent.end_time || null,
        address: newEvent.address || null,
        city: newEvent.city || null,
        state: newEvent.state || null,
        location: location,
        genre: newEvent.genre || "Nightlife",
        price: newEvent.price || 0,
        max_attendees: newEvent.max_attendees || 100,
        free_spots_strippers: newEvent.free_spots_strippers || 0,
        free_spots_exotics: newEvent.free_spots_exotics || 0,
        free_males_females: newEvent.free_males_females || 0,
        free_normal: newEvent.free_normal || 0,
        free_spots_males: newEvent.free_spots_males || 0,
        free_spots_females: newEvent.free_spots_females || 0,
        free_spots_dimes: newEvent.free_spots_dimes || 0,
        free_spots_normals: newEvent.free_spots_normals || 0,
        free_spots_silver_plus: newEvent.free_spots_silver_plus || 0,
        free_spots_diamond_plus: newEvent.free_spots_diamond_plus || 0,
        free_spots_elite_plus: newEvent.free_spots_elite_plus || 0,
        free_spots_plus: newEvent.free_spots_plus || 0,
        general_admission_price: newEvent.general_admission_price || 0,
        plus_ticket_mode: newEvent.plus_ticket_mode || "free",
        plus_discount_percent: newEvent.plus_discount_percent || 0,
        vip_price: newEvent.vip_price || 0,
        vip_tickets: newEvent.vip_tickets || 0,
        vip_section_price: newEvent.vip_section_price || 0,
        vip_section_attendees: newEvent.vip_section_attendees || 10,
        vip_sections: newEvent.vip_sections || 0,
        group_discount_price: newEvent.group_discount_price || 0,
        group_capacity: newEvent.group_capacity || 10,
        males_price: newEvent.males_price || 0,
        females_price: newEvent.females_price || 0,
        photo_url: photoUrl || null,
        video_urls: videoUrls.length > 0 ? videoUrls : null,
        additional_photos:
          additionalPhotoUrls.length > 0 ? additionalPhotoUrls : null,
        banner_video_url: bannerVideoUrl || null,
        created_at: new Date().toISOString(),
      };

      console.log("💾 Inserting event into database:", eventData);

      const { data, error } = await supabase
        .from("events")
        .insert(eventData as any)
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
        date_tba: false,
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
        free_males_females: 0,
        free_normal: 0,
        free_spots_males: 0,
        free_spots_females: 0,
        free_spots_dimes: 0,
        free_spots_normals: 0,
        free_spots_silver_plus: 0,
        free_spots_diamond_plus: 0,
        free_spots_elite_plus: 0,
        free_spots_plus: 0,
        general_admission_price: 0,
        plus_ticket_mode: "free",
        plus_discount_percent: 0,
        vip_price: 0,
        vip_tickets: 0,
        vip_section_price: 0,
        vip_section_attendees: 10,
        vip_sections: 0,
        group_discount_price: 0,
        group_capacity: 10,
        males_price: 0,
        females_price: 0,
        photo_url: "",
      });

      // Reset file inputs
      setPhotoFile(null);
      setVideoFiles([]);
      setAdditionalPhotoFiles([]);
      setBannerVideoFile(null);

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
    setUploading(true);
    
    try {
      console.log("🔄 Updating event:", editingEvent.id);

      let photoUrl = editingEvent.photo_url;
      let videoUrls = editingEvent.video_urls || [];
      let additionalPhotoUrls = editingEvent.additional_photos || [];
      let bannerVideoUrl = editingEvent.banner_video_url;

      // Upload new main photo if provided
      if (editPhotoFile) {
        console.log("📸 Uploading new main photo...");
        const newPhotoUrl = await uploadFileToStorage(editPhotoFile, "event-photos");
        if (newPhotoUrl) {
          photoUrl = newPhotoUrl;
        }
      }

      // Upload new banner video if provided
      if (editBannerVideoFile) {
        console.log("🎥 Uploading new banner video...");
        const newBannerUrl = await uploadFileToStorage(editBannerVideoFile, "event-videos", "banners");
        if (newBannerUrl) {
          bannerVideoUrl = newBannerUrl;
        }
      }

      // Upload new videos if provided
      if (editVideoFiles.length > 0) {
        console.log("🎥 Uploading new videos...", editVideoFiles.length, "files");
        for (const video of editVideoFiles) {
          const videoUrl = await uploadFileToStorage(video, "event-videos");
          if (videoUrl) {
            videoUrls = [...videoUrls, videoUrl];
          }
        }
        console.log("✅ Videos uploaded:", videoUrls.length, "total");
      }

      // Upload new additional photos if provided
      if (editAdditionalPhotoFiles.length > 0) {
        console.log("📷 Uploading new additional photos...", editAdditionalPhotoFiles.length, "files");
        for (const photo of editAdditionalPhotoFiles) {
          const url = await uploadFileToStorage(photo, "event-photos");
          if (url) {
            additionalPhotoUrls = [...additionalPhotoUrls, url];
          }
        }
        console.log("✅ Additional photos uploaded:", additionalPhotoUrls.length, "total");
      }

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
        date: editingEvent.date_tba ? "2099-12-31" : editingEvent.date,
        end_date: editingEvent.end_date || null,
        date_tba: editingEvent.date_tba ?? false,
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
        free_males_females: editingEvent.free_males_females,
        free_normal: editingEvent.free_normal,
        free_spots_males: editingEvent.free_spots_males || 0,
        free_spots_females: editingEvent.free_spots_females || 0,
        free_spots_dimes: editingEvent.free_spots_dimes || 0,
        free_spots_normals: editingEvent.free_spots_normals || 0,
        free_spots_silver_plus: editingEvent.free_spots_silver_plus || 0,
        free_spots_diamond_plus: editingEvent.free_spots_diamond_plus || 0,
        free_spots_elite_plus: editingEvent.free_spots_elite_plus || 0,
        free_spots_plus: editingEvent.free_spots_plus || 0,
        general_admission_price: editingEvent.general_admission_price || 0,
        plus_ticket_mode: editingEvent.plus_ticket_mode || "free",
        plus_discount_percent: editingEvent.plus_discount_percent || 0,

        vip_price: editingEvent.vip_price,
        vip_tickets: editingEvent.vip_tickets,
        vip_section_price: editingEvent.vip_section_price,
        vip_section_attendees: editingEvent.vip_section_attendees,
        vip_sections: editingEvent.vip_sections,
        group_discount_price: editingEvent.group_discount_price,
        group_capacity: editingEvent.group_capacity,
        males_price: editingEvent.males_price,
        females_price: editingEvent.females_price,
        photo_url: photoUrl || null,
        video_urls: videoUrls.length > 0 ? videoUrls : null,
        additional_photos: additionalPhotoUrls.length > 0 ? additionalPhotoUrls : null,
        banner_video_url: bannerVideoUrl || null,
      };

      console.log("💾 Update data:", updateData);

      const adminUserId = getAdminUserId();
      let updateError: any = null;

      if (adminUserId) {
        const { data: fnData, error: fnError } = await supabase.functions.invoke(
          "admin-data",
          { body: { action: "updateEvent", adminUserId, eventId: editingEvent.id, updates: updateData } }
        );
        if (fnError) updateError = fnError;
        else if ((fnData as any)?.error) updateError = new Error((fnData as any).error);
      } else {
        const { error } = await supabase
          .from("events")
          .update(updateData as any)
          .eq("id", editingEvent.id);
        updateError = error;
      }

      if (updateError) {
        console.error("❌ Update error:", updateError);
        throw updateError;
      }

      console.log("✅ Event updated successfully");
      toast({ title: "Success", description: "Event updated successfully" });
      
      // Reset edit file states
      setEditPhotoFile(null);
      setEditVideoFiles([]);
      setEditAdditionalPhotoFiles([]);
      setEditBannerVideoFile(null);
      
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
      setUploading(false);
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
      const adminUserId = getAdminUserId();
      let delError: any = null;
      if (adminUserId) {
        const { data: fnData, error: fnError } = await supabase.functions.invoke(
          "admin-data",
          { body: { action: "deleteEvent", adminUserId, eventId } }
        );
        if (fnError) delError = fnError;
        else if ((fnData as any)?.error) delError = new Error((fnData as any).error);
      } else {
        const { error } = await supabase.from("events").delete().eq("id", eventId);
        delError = error;
      }

      if (delError) {
        console.error("❌ Error deleting event:", delError);
        throw delError;
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
    } catch (error: any) {
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
    setPhoneSearch("");
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
      setPhoneSearch("");
    }
  };

  // Get the attendee's display name
  const getAttendeeName = (attendee: Attendee) => {
    const firstName = attendee.first_name || attendee.users?.first_name || "";
    const lastName = attendee.last_name || attendee.users?.last_name || "";
    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim();
    }
    return attendee.username || attendee.users?.username || "Unknown";
  };

  // Get guest count text
  const getGuestCountText = (attendee: Attendee) => {
    const qty = attendee.ticket_quantity || 1;
    if (qty > 1) {
      return ` + ${qty - 1}`;
    }
    return "";
  };

  // Filter attendees by search text, user type, and plan
  const filteredAttendees = attendees.filter((attendee) => {
    // Text search filter
    if (phoneSearch) {
      const searchLower = phoneSearch.toLowerCase();
      const phone = attendee.phone_number || "";
      const userPhone = attendee.users?.phone_number || attendee.users?.mobile_number || "";
      const username = attendee.username || attendee.users?.username || "";
      const firstName = attendee.first_name || attendee.users?.first_name || "";
      const lastName = attendee.last_name || attendee.users?.last_name || "";
      
      const matchesSearch = phone.toLowerCase().includes(searchLower) ||
             userPhone.toLowerCase().includes(searchLower) ||
             username.toLowerCase().includes(searchLower) ||
             firstName.toLowerCase().includes(searchLower) ||
             lastName.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }
    
    // User type filter
    if (userTypeFilter !== "all") {
      const userType = attendee.users?.user_type || "";
      if (userType !== userTypeFilter) return false;
    }
    
    // Plan/ticket type filter
    if (planFilter !== "all") {
      const ticketType = (attendee.ticket_type || attendee.payment_status || "").toLowerCase();
      if (!ticketType.includes(planFilter.toLowerCase())) return false;
    }
    
    return true;
  });

  // Calculate total attendees including guests
  const getTotalAttendeeCount = () => {
    return attendees.reduce((sum, a) => sum + (a.ticket_quantity || 1), 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
        <h2 className="text-xl sm:text-2xl font-bold">Events Management</h2>
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
                      <SelectItem value="Valentine's Event">
                        Valentine's Event
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
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={newEvent.date}
                      disabled={newEvent.date_tba}
                      onChange={(e) =>
                        setNewEvent((prev) => ({ ...prev, date: e.target.value }))
                      }
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant={newEvent.date_tba ? "default" : "outline"}
                      onClick={() =>
                        setNewEvent((prev) => ({
                          ...prev,
                          date_tba: !prev.date_tba,
                          date: !prev.date_tba ? "" : prev.date,
                        }))
                      }
                      className="whitespace-nowrap"
                    >
                      {newEvent.date_tba ? "TBA On" : "TBA"}
                    </Button>
                  </div>
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
              </div>


              {/* VIP and Ticket Options */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-medium">VIP & Ticket Options</h3>
                
                {/* VIP Sections Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      VIP Sections (# of sections)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={newEvent.vip_sections}
                      onChange={(e) =>
                        setNewEvent((prev) => ({
                          ...prev,
                          vip_sections: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Attendees in Section
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={newEvent.vip_section_attendees}
                      onChange={(e) =>
                        setNewEvent((prev) => ({
                          ...prev,
                          vip_section_attendees: parseInt(e.target.value) || 10,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      VIP Section Price ($)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newEvent.vip_section_price}
                      onChange={(e) =>
                        setNewEvent((prev) => ({
                          ...prev,
                          vip_section_price: parseFloat(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                </div>

                {/* VIP Tickets Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      VIP Tickets (# available)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={newEvent.vip_tickets}
                      onChange={(e) =>
                        setNewEvent((prev) => ({
                          ...prev,
                          vip_tickets: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      VIP Ticket Price ($)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newEvent.vip_price}
                      onChange={(e) =>
                        setNewEvent((prev) => ({
                          ...prev,
                          vip_price: parseFloat(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                </div>

                {/* Group Discount Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Group Capacity (people per group)
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={newEvent.group_capacity}
                      onChange={(e) =>
                        setNewEvent((prev) => ({
                          ...prev,
                          group_capacity: parseInt(e.target.value) || 10,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Group Discount Price ($)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newEvent.group_discount_price}
                      onChange={(e) =>
                        setNewEvent((prev) => ({
                          ...prev,
                          group_discount_price: parseFloat(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                </div>

                <EventTicketingFields
                  values={newEvent as any}
                  onChange={(patch) =>
                    setNewEvent((prev) => ({ ...prev, ...patch } as any))
                  }
                />

              </div>

              {/* File Upload Section */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-medium">Media Upload</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Main Photo Upload */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      <Image className="w-4 h-4 inline mr-1" />
                      Banner Photo
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

                  {/* Banner Video Upload */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      <Video className="w-4 h-4 inline mr-1" />
                      Banner Video
                    </label>
                    <Input
                      type="file"
                      accept="video/*"
                      onChange={(e) =>
                        setBannerVideoFile(e.target.files?.[0] || null)
                      }
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                    />
                    {bannerVideoFile && (
                      <p className="text-xs text-gray-500 mt-1">
                        Selected: {bannerVideoFile.name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Calendar className="w-5 h-5" />
                      {event.name}
                    </CardTitle>
                    <div className="space-y-1 mt-2 text-xs sm:text-sm text-muted-foreground">
                      <p className="flex items-center gap-2">
                        <Clock className="w-4 h-4 flex-shrink-0" />
                        {event.date_tba
                          ? "To Be Announced"
                          : new Date(event.date).toLocaleDateString()}
                        {event.start_time && !event.date_tba && ` at ${formatTime12Hour(event.start_time)}`}
                        {event.end_time && !event.date_tba && ` - ${formatTime12Hour(event.end_time)}`}
                      </p>
                      {event.location && (
                        <p className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          {event.location}
                        </p>
                      )}
                      <p className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 flex-shrink-0" />${event.price} • Max:{" "}
                        {event.max_attendees} • Free Dimes:{" "}
                        {event.free_spots_strippers} strippers,{" "}
                        {event.free_spots_exotics} exotics
                        {(event.free_spots_males > 0 || event.free_spots_females > 0) &&
                          ` • Normal M/F: ${event.free_spots_males || 0} Free Males, ${event.free_spots_females || 0} Free Females`}
                      </p>
                      {event.genre && (
                        <Badge variant="outline" className="w-fit">
                          {event.genre}
                        </Badge>
                      )}
                      <p className="flex items-center gap-2">
                        <Users className="w-4 h-4 flex-shrink-0" />
                        {event.current_attendees || 0} attendees
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewAttendees(event)}
                      className="w-full sm:w-auto"
                    >
                      <Users className="w-4 h-4 mr-1" />
                      Attendees
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingEvent({
                          ...event,
                          date: event.date_tba ? "" : formatDateForInput(event.date),
                          date_tba: event.date_tba ?? false,
                        });
                        setShowEditEvent(true);
                      }}
                      className="w-full sm:w-auto"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteEvent(event.id)}
                      className="w-full sm:w-auto"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Media Preview */}
              {(event.banner_video_url || event.video_urls?.[0] || event.photo_url) && (
                <div className="px-6 pb-2">
                  <div className="rounded-lg overflow-hidden bg-muted max-h-64">
                    {event.banner_video_url ? (
                      <video
                        controls
                        muted
                        loop
                        preload="metadata"
                        className="w-full max-h-64 object-contain"
                      >
                        <source src={event.banner_video_url} type="video/mp4" />
                      </video>
                    ) : event.video_urls?.[0] ? (
                      <video
                        controls
                        muted
                        loop
                        preload="metadata"
                        className="w-full max-h-64 object-contain"
                      >
                        <source src={event.video_urls[0]} type="video/mp4" />
                      </video>
                    ) : event.photo_url ? (
                      <img
                        src={event.photo_url}
                        alt={event.name}
                        className="w-full max-h-64 object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex gap-2 mt-2">
                    {(event.video_urls?.length || 0) > 0 && (
                      <span className="text-xs text-muted-foreground">
                        🎬 {event.video_urls!.length} video{event.video_urls!.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {(event.additional_photos?.length || 0) > 0 && (
                      <span className="text-xs text-muted-foreground">
                        📷 {event.additional_photos!.length} photo{event.additional_photos!.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {event.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">{event.description}</p>
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
                      <SelectItem value="Valentine's Event">
                        Valentine's Event
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Date
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={editingEvent.date}
                      disabled={editingEvent.date_tba}
                      onChange={(e) =>
                        setEditingEvent((prev) =>
                          prev ? { ...prev, date: e.target.value } : null
                        )
                      }
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant={editingEvent.date_tba ? "default" : "outline"}
                      onClick={() =>
                        setEditingEvent((prev) =>
                          prev
                            ? {
                                ...prev,
                                date_tba: !prev.date_tba,
                                date: !prev.date_tba ? "" : prev.date,
                              }
                            : null
                        )
                      }
                      className="whitespace-nowrap"
                    >
                      {editingEvent.date_tba ? "TBA On" : "TBA"}
                    </Button>
                  </div>
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
              </div>


              {/* VIP and Ticket Options - Edit Form */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-medium">VIP & Ticket Options</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">VIP Sections</label>
                    <Input
                      type="number"
                      min="0"
                      value={editingEvent.vip_sections || 0}
                      onChange={(e) => setEditingEvent((prev) => prev ? { ...prev, vip_sections: parseInt(e.target.value) || 0 } : null)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Attendees in Section</label>
                    <Input
                      type="number"
                      min="1"
                      value={editingEvent.vip_section_attendees || 10}
                      onChange={(e) => setEditingEvent((prev) => prev ? { ...prev, vip_section_attendees: parseInt(e.target.value) || 10 } : null)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">VIP Section Price ($)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingEvent.vip_section_price || 0}
                      onChange={(e) => setEditingEvent((prev) => prev ? { ...prev, vip_section_price: parseFloat(e.target.value) || 0 } : null)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">VIP Tickets (#)</label>
                    <Input
                      type="number"
                      min="0"
                      value={editingEvent.vip_tickets || 0}
                      onChange={(e) => setEditingEvent((prev) => prev ? { ...prev, vip_tickets: parseInt(e.target.value) || 0 } : null)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">VIP Ticket Price ($)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingEvent.vip_price || 0}
                      onChange={(e) => setEditingEvent((prev) => prev ? { ...prev, vip_price: parseFloat(e.target.value) || 0 } : null)}
                    />
                  </div>
                </div>

                <EventTicketingFields
                  values={editingEvent as any}
                  onChange={(patch) =>
                    setEditingEvent((prev) => (prev ? { ...prev, ...patch } as any : null))
                  }
                />


                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Group Capacity</label>
                    <Input
                      type="number"
                      min="1"
                      value={editingEvent.group_capacity || 10}
                      onChange={(e) => setEditingEvent((prev) => prev ? { ...prev, group_capacity: parseInt(e.target.value) || 10 } : null)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Group Discount Price ($)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingEvent.group_discount_price || 0}
                      onChange={(e) => setEditingEvent((prev) => prev ? { ...prev, group_discount_price: parseFloat(e.target.value) || 0 } : null)}
                    />
                  </div>
                </div>
              </div>

              {/* Media Upload Section */}
              <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                <h4 className="font-medium text-sm">Media</h4>
                
                {/* Current Photo Preview */}
                {editingEvent.photo_url && (
                  <div className="mb-2">
                    <p className="text-xs text-muted-foreground mb-1">Current Banner:</p>
                    <img 
                      src={editingEvent.photo_url} 
                      alt="Current event" 
                      className="w-24 h-24 object-cover rounded"
                    />
                  </div>
                )}

                {/* Current Videos with Delete */}
                {editingEvent.video_urls && editingEvent.video_urls.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-2">Current Videos ({editingEvent.video_urls.length}):</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {editingEvent.video_urls.map((url, index) => (
                        <div key={index} className="relative group">
                          <video 
                            src={url} 
                            className="w-full h-20 object-cover rounded"
                            controls
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              const newUrls = editingEvent.video_urls?.filter((_, i) => i !== index) || [];
                              setEditingEvent((prev) => prev ? { ...prev, video_urls: newUrls } : null);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Current Additional Photos with Delete */}
                {editingEvent.additional_photos && editingEvent.additional_photos.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-2">Current Photos ({editingEvent.additional_photos.length}):</p>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                      {editingEvent.additional_photos.map((url, index) => (
                        <div key={index} className="relative group">
                          <img 
                            src={url} 
                            alt={`Photo ${index + 1}`}
                            className="w-full h-16 object-cover rounded"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute top-1 right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              const newPhotos = editingEvent.additional_photos?.filter((_, i) => i !== index) || [];
                              setEditingEvent((prev) => prev ? { ...prev, additional_photos: newPhotos } : null);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Main Photo Upload */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      <Image className="w-4 h-4 inline mr-1" />
                      {editingEvent.photo_url ? "Replace Banner Photo" : "Add Banner Photo"}
                    </label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setEditPhotoFile(e.target.files?.[0] || null)}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {editPhotoFile && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Selected: {editPhotoFile.name}
                      </p>
                    )}
                  </div>

                  {/* Banner Video Upload */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      <Video className="w-4 h-4 inline mr-1" />
                      {editingEvent.banner_video_url ? "Replace Banner Video" : "Add Banner Video"}
                    </label>
                    <Input
                      type="file"
                      accept="video/*"
                      onChange={(e) => setEditBannerVideoFile(e.target.files?.[0] || null)}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                    />
                    {editBannerVideoFile && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Selected: {editBannerVideoFile.name}
                      </p>
                    )}
                    {editingEvent.banner_video_url && !editBannerVideoFile && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Current video exists
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Video Upload */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      <Video className="w-4 h-4 inline mr-1" />
                      Add More Videos
                    </label>
                    <Input
                      type="file"
                      accept="video/*"
                      multiple
                      onChange={(e) => setEditVideoFiles(Array.from(e.target.files || []))}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                    />
                    {editVideoFiles.length > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Selected: {editVideoFiles.length} video(s)
                      </p>
                    )}
                  </div>

                  {/* Additional Photos Upload */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      <Image className="w-4 h-4 inline mr-1" />
                      Add More Photos
                    </label>
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => setEditAdditionalPhotoFiles(Array.from(e.target.files || []))}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                    />
                    {editAdditionalPhotoFiles.length > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Selected: {editAdditionalPhotoFiles.length} photo(s)
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
                    value={editingEvent.photo_url || ""}
                    onChange={(e) =>
                      setEditingEvent((prev) =>
                        prev ? { ...prev, photo_url: e.target.value } : null
                      )
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
                disabled={loading || uploading}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Upload className="w-4 h-4 mr-2 animate-spin" />
                    Uploading Files...
                  </>
                ) : loading ? (
                  "Updating..."
                ) : (
                  "Update Event"
                )}
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
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="text-sm text-gray-600">
                Total Attendees: {getTotalAttendeeCount()} /{" "}
                {selectedEvent?.max_attendees}
              </div>
              
              <div className="flex flex-wrap gap-2 items-center">
                {/* Phone/Name Search */}
                <div className="relative w-48">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search name or phone..."
                    value={phoneSearch}
                    onChange={(e) => setPhoneSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                {/* User Type Filter */}
                <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="User Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="stripper">Stripper</SelectItem>
                    <SelectItem value="exotic">Exotic</SelectItem>
                    <SelectItem value="normal">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Plan Filter */}
                <Select value={planFilter} onValueChange={setPlanFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Plans</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {filteredAttendees.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                {attendees.length === 0 ? "No attendees yet" : "No matching attendees"}
              </p>
            ) : (
              <div className="grid gap-3">
                {filteredAttendees.map((attendee) => (
                  <Card key={attendee.id} className={`p-4 bg-gray-900 text-white border-gray-700 ${attendee.checked_in ? 'border-green-500 bg-green-900/30' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {/* Profile Photo */}
                        <img
                          src={
                            attendee.users?.profile_photo || "/placeholder.svg"
                          }
                          alt={getAttendeeName(attendee)}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          {/* Name with guest count */}
                          <p className="font-medium">
                            {getAttendeeName(attendee)}
                            {getGuestCountText(attendee) && (
                              <span className="text-primary font-semibold">
                                {getGuestCountText(attendee)}
                              </span>
                            )}
                          </p>
                          
                          {/* Username and phone */}
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>@{attendee.username || attendee.users?.username}</span>
                            {(attendee.phone_number || attendee.users?.phone_number || attendee.users?.mobile_number) && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {attendee.phone_number || attendee.users?.phone_number || attendee.users?.mobile_number}
                                </span>
                              </>
                            )}
                          </div>
                          
                          {/* Guest Name Display */}
                          {attendee.guest_name && (
                            <p className="text-xs text-blue-500 mt-1">
                              Guest: {attendee.guest_name}
                            </p>
                          )}
                          
                          {/* Badges - Show "Female" for normal user type */}
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <Badge variant="outline" className="border-gray-500 text-gray-300">
                              {attendee.users?.user_type === "normal"
                                ? (attendee.users?.gender === "male" ? "Male" : attendee.users?.gender === "female" ? "Female" : "Normal")
                                : (attendee.users?.user_type || "User")}
                            </Badge>
                            <Badge
                              variant={
                                attendee.payment_status === "paid"
                                  ? "default"
                                  : attendee.payment_status === "free"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {attendee.ticket_type || attendee.payment_status}
                            </Badge>
                            {attendee.ticket_quantity > 1 && (
                              <Badge variant="outline" className="text-purple-400 border-purple-500">
                                Qty: {attendee.ticket_quantity}
                              </Badge>
                            )}
                            {attendee.amount_paid > 0 && (
                              <Badge variant="outline" className="text-green-400 border-green-500">
                                ${attendee.amount_paid}
                              </Badge>
                            )}
                            {attendee.checked_in && (
                              <Badge variant="default" className="bg-green-600">
                                <Check className="w-3 h-3 mr-1" />
                                Checked In
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-400">
                          {new Date(attendee.created_at).toLocaleDateString()}
                        </p>
                        
                        {/* Check In Button */}
                        <Button
                          size="sm"
                          disabled={checkingInId === attendee.id}
                          onClick={() => handleCheckIn(attendee.id, attendee.checked_in)}
                          className={
                            checkingInId === attendee.id
                              ? "bg-orange-500 hover:bg-orange-600 text-white"
                              : attendee.checked_in
                              ? "bg-green-600 hover:bg-green-700 text-white"
                              : "bg-gray-600 hover:bg-gray-700 text-white"
                          }
                        >
                          {checkingInId === attendee.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              Checking In
                            </>
                          ) : attendee.checked_in ? (
                            <>
                              <Check className="w-4 h-4 mr-1" />
                              Checked In
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-4 h-4 mr-1" />
                              Check In
                            </>
                          )}
                        </Button>
                        
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
