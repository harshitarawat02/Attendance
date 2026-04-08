import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { MapPin, CheckCircle, XCircle } from "lucide-react";

function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function LocationAttendance() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [gpsStatus, setGpsStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedSession, setSelectedSession] = useState("");

  const { data: activeSessions, isLoading } = useQuery({
    queryKey: ["active-sessions-for-student", user?.id],
    queryFn: async () => {
      // Get classes student is enrolled in
      const { data: enrolled } = await supabase
        .from("class_students")
        .select("class_id")
        .eq("student_id", user!.id);
      if (!enrolled?.length) return [];
      const classIds = enrolled.map((e) => e.class_id);
      const { data } = await supabase
        .from("attendance_sessions")
        .select("id, session_date, classes(id, name, location_lat, location_lng, location_radius)")
        .in("class_id", classIds)
        .eq("is_active", true);
      return data || [];
    },
    enabled: !!user,
  });

  const getLocation = () => {
    setGpsStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus("success");
      },
      (err) => {
        setGpsStatus("error");
        toast.error("Could not get your location. Please enable GPS.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const markAttendance = useMutation({
    mutationFn: async () => {
      if (!coords || !selectedSession) throw new Error("Missing data");
      const session = activeSessions?.find((s: any) => s.id === selectedSession) as any;
      if (!session) throw new Error("Session not found");

      const classData = session.classes;
      if (!classData?.location_lat || !classData?.location_lng) {
        // No location set — allow attendance without verification
        const { error } = await supabase.from("attendance_records").insert({
          session_id: selectedSession,
          student_id: user!.id,
          status: "present",
          latitude: coords.lat,
          longitude: coords.lng,
          location_verified: false,
        });
        if (error) {
          if (error.code === "23505") throw new Error("Already marked");
          throw error;
        }
        return { verified: false };
      }

      const distance = getDistanceMeters(coords.lat, coords.lng, classData.location_lat, classData.location_lng);
      const radius = classData.location_radius || 100;
      const verified = distance <= radius;

      if (!verified) throw new Error(`You are ${Math.round(distance)}m away. Must be within ${radius}m.`);

      const { error } = await supabase.from("attendance_records").insert({
        session_id: selectedSession,
        student_id: user!.id,
        status: "present",
        latitude: coords.lat,
        longitude: coords.lng,
        location_verified: true,
      });
      if (error) {
        if (error.code === "23505") throw new Error("Already marked for this session");
        throw error;
      }
      return { verified: true };
    },
    onSuccess: (data) => {
      toast.success(`Attendance marked! ${data.verified ? "Location verified ✓" : "Location not required"}`);
      qc.invalidateQueries({ queryKey: ["my-attendance"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Location-Based Attendance</h2>
        <p className="text-muted-foreground">Mark attendance using your GPS location</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Step 1: Get Your Location</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={getLocation} disabled={gpsStatus === "loading"} className="w-full gap-2">
            <MapPin className="h-4 w-4" />
            {gpsStatus === "loading" ? "Getting location..." : "Get My Location"}
          </Button>
          {gpsStatus === "success" && coords && (
            <div className="flex items-center gap-2 text-sm text-accent">
              <CheckCircle className="h-4 w-4" />
              Location captured: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
            </div>
          )}
          {gpsStatus === "error" && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <XCircle className="h-4 w-4" />
              Failed to get location. Please enable GPS permissions.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Step 2: Select Session & Mark</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-10" />
          ) : !activeSessions?.length ? (
            <p className="text-sm text-muted-foreground">No active sessions for your classes.</p>
          ) : (
            <>
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger><SelectValue placeholder="Select active session" /></SelectTrigger>
                <SelectContent>
                  {activeSessions.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.classes?.name} — {new Date(s.session_date).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => markAttendance.mutate()}
                disabled={!coords || !selectedSession || markAttendance.isPending}
                className="w-full"
              >
                {markAttendance.isPending ? "Marking..." : "Mark Attendance"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
