import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import QrScanner from "@/components/QrScanner";

export default function Attendance() {
  const { role } = useAuth();
  return role === "teacher" ? <TeacherAttendance /> : <StudentAttendance />;
}

function TeacherAttendance() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedClass, setSelectedClass] = useState("");
  const [activeSession, setActiveSession] = useState<any>(null);

  const { data: classes, isLoading: classesLoading } = useQuery({
    queryKey: ["teacher-classes", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("classes").select("id, name").eq("teacher_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: students } = useQuery({
    queryKey: ["class-students", selectedClass],
    queryFn: async () => {
      const { data } = await supabase
        .from("class_students")
        .select("student_id, profiles:student_id(id, full_name, email)")
        .eq("class_id", selectedClass);
      return data || [];
    },
    enabled: !!selectedClass,
  });

  const { data: sessionRecords } = useQuery({
    queryKey: ["session-records", activeSession?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance_records")
        .select("student_id, status, marked_at, location_verified")
        .eq("session_id", activeSession!.id);
      return data || [];
    },
    enabled: !!activeSession,
    refetchInterval: 5000,
  });

  const startSession = useMutation({
    mutationFn: async () => {
      const token = crypto.randomUUID();
      const { data, error } = await supabase
        .from("attendance_sessions")
        .insert({ class_id: selectedClass, teacher_id: user!.id, qr_token: token })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setActiveSession(data);
      toast.success("Session started!");
      qc.invalidateQueries({ queryKey: ["recent-sessions"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const endSession = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("attendance_sessions")
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq("id", activeSession.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setActiveSession(null);
      toast.success("Session ended");
      qc.invalidateQueries({ queryKey: ["recent-sessions"] });
    },
  });

  const markManual = useMutation({
    mutationFn: async ({ studentId, status }: { studentId: string; status: string }) => {
      const { error } = await supabase.from("attendance_records").upsert(
        { session_id: activeSession.id, student_id: studentId, status },
        { onConflict: "session_id,student_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["session-records", activeSession?.id] });
      toast.success("Attendance updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (classesLoading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Mark Attendance</h2>
        <p className="text-muted-foreground">Start a session and mark attendance or generate a QR code</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Session Control</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedClass} onValueChange={setSelectedClass} disabled={!!activeSession}>
            <SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger>
            <SelectContent>
              {classes?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>

          {!activeSession ? (
            <Button onClick={() => startSession.mutate()} disabled={!selectedClass || startSession.isPending}>
              {startSession.isPending ? "Starting..." : "Start Session"}
            </Button>
          ) : (
            <Button variant="destructive" onClick={() => endSession.mutate()} disabled={endSession.isPending}>
              End Session
            </Button>
          )}
        </CardContent>
      </Card>

      {activeSession && (
        <>
          <Card>
            <CardHeader><CardTitle>QR Code for Students</CardTitle></CardHeader>
            <CardContent className="flex justify-center">
              <QRCodeSVG value={activeSession.qr_token} size={200} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Students</CardTitle></CardHeader>
            <CardContent>
              {!students?.length ? (
                <p className="text-muted-foreground text-sm">No students enrolled.</p>
              ) : (
                <div className="space-y-2">
                  {students.map((s: any) => {
                    const record = sessionRecords?.find((r) => r.student_id === s.student_id);
                    return (
                      <div key={s.student_id} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="font-medium">{s.profiles?.full_name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{s.profiles?.email}</p>
                          {record && (
                            <span className="text-xs capitalize text-muted-foreground">
                              {record.status} {record.location_verified ? "· GPS ✓" : ""}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant={record?.status === "present" ? "default" : "outline"} onClick={() => markManual.mutate({ studentId: s.student_id, status: "present" })}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant={record?.status === "absent" ? "destructive" : "outline"} onClick={() => markManual.mutate({ studentId: s.student_id, status: "absent" })}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant={record?.status === "late" ? "secondary" : "outline"} onClick={() => markManual.mutate({ studentId: s.student_id, status: "late" })}>
                            <Clock className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function StudentAttendance() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [scanning, setScanning] = useState(false);

  const markViaQr = useMutation({
    mutationFn: async (token: string) => {
      // Find active session with this QR token
      const { data: session, error: sErr } = await supabase
        .from("attendance_sessions")
        .select("id, class_id")
        .eq("qr_token", token)
        .eq("is_active", true)
        .single();
      if (sErr || !session) throw new Error("Invalid or expired QR code");

      const { error } = await supabase.from("attendance_records").insert({
        session_id: session.id,
        student_id: user!.id,
        status: "present",
      });
      if (error) {
        if (error.code === "23505") throw new Error("Already marked for this session");
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Attendance marked successfully!");
      setScanning(false);
      qc.invalidateQueries({ queryKey: ["my-attendance"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: myRecords, isLoading } = useQuery({
    queryKey: ["my-attendance", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance_records")
        .select("id, status, marked_at, attendance_sessions(session_date, classes(name))")
        .eq("student_id", user!.id)
        .order("marked_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Mark Attendance</h2>
        <p className="text-muted-foreground">Scan the QR code shown by your teacher</p>
      </div>

      <Card>
        <CardHeader><CardTitle>QR Scanner</CardTitle></CardHeader>
        <CardContent>
          {scanning ? (
            <div className="space-y-4">
              <QrScanner onScan={(result) => markViaQr.mutate(result)} />
              <Button variant="outline" onClick={() => setScanning(false)} className="w-full">Cancel</Button>
            </div>
          ) : (
            <Button onClick={() => setScanning(true)} className="w-full">
              Open QR Scanner
            </Button>
          )}
          {markViaQr.isPending && <p className="mt-2 text-sm text-muted-foreground">Marking attendance...</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent Attendance</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32" />
          ) : !myRecords?.length ? (
            <p className="text-sm text-muted-foreground">No attendance records yet.</p>
          ) : (
            <div className="space-y-2">
              {myRecords.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{r.attendance_sessions?.classes?.name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.attendance_sessions?.session_date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${r.status === "present" ? "bg-accent/20 text-accent" : r.status === "absent" ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground"}`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
