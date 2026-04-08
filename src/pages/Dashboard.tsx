import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, BookOpen, ClipboardCheck, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const { user, role } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats", user?.id, role],
    queryFn: async () => {
      const [classesRes, sessionsRes, recordsRes, usersRes] = await Promise.all([
        role === "student"
          ? supabase.from("class_students").select("class_id").eq("student_id", user!.id)
          : role === "teacher"
          ? supabase.from("classes").select("id").eq("teacher_id", user!.id)
          : supabase.from("classes").select("id"),
        supabase.from("attendance_sessions").select("id"),
        role === "student"
          ? supabase.from("attendance_records").select("id, status").eq("student_id", user!.id)
          : supabase.from("attendance_records").select("id, status"),
        role === "admin" ? supabase.from("profiles").select("id") : Promise.resolve({ data: [] }),
      ]);

      const records = recordsRes.data || [];
      const present = records.filter((r) => r.status === "present").length;
      const total = records.length;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

      return {
        totalClasses: classesRes.data?.length || 0,
        totalSessions: sessionsRes.data?.length || 0,
        totalRecords: total,
        presentCount: present,
        absentCount: records.filter((r) => r.status === "absent").length,
        attendancePercentage: percentage,
        totalUsers: (usersRes as any).data?.length || 0,
      };
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-20" /></CardContent></Card>
        ))}
      </div>
    );
  }

  const cards = [
    { title: "Total Classes", value: stats?.totalClasses ?? 0, icon: BookOpen, color: "text-primary" },
    { title: "Attendance Rate", value: `${stats?.attendancePercentage ?? 0}%`, icon: TrendingUp, color: "text-accent" },
    { title: "Present", value: stats?.presentCount ?? 0, icon: ClipboardCheck, color: "text-accent" },
    { title: "Absent", value: stats?.absentCount ?? 0, icon: Users, color: "text-destructive" },
  ];

  if (role === "admin") {
    cards.push({ title: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, color: "text-primary" });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground">Overview of attendance statistics</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={cn("h-5 w-5", card.color)} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentSessions />
        </CardContent>
      </Card>
    </div>
  );
}

function RecentSessions() {
  const { data, isLoading } = useQuery({
    queryKey: ["recent-sessions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance_sessions")
        .select("id, session_date, is_active, started_at, classes(name), profiles:teacher_id(full_name)")
        .order("started_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  if (isLoading) return <Skeleton className="h-32" />;
  if (!data?.length) return <p className="text-muted-foreground text-sm">No sessions yet.</p>;

  return (
    <div className="space-y-3">
      {data.map((s: any) => (
        <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="font-medium">{s.classes?.name || "Unknown Class"}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(s.session_date).toLocaleDateString()} · {s.profiles?.full_name || "N/A"}
            </p>
          </div>
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", s.is_active ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground")}>
            {s.is_active ? "Active" : "Ended"}
          </span>
        </div>
      ))}
    </div>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}
