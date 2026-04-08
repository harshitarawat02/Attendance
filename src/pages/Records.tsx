import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download } from "lucide-react";

const BRANCHES = ["IT-1", "IT-2", "AIML"];

export default function Records() {
  const { role, user } = useAuth();
  const [classFilter, setClassFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [studentSearch, setStudentSearch] = useState("");

  const { data: classes } = useQuery({
    queryKey: ["all-classes"],
    queryFn: async () => {
      const { data } = await supabase.from("classes").select("id, name");
      return data || [];
    },
  });

  const { data: records, isLoading } = useQuery({
    queryKey: ["attendance-records", classFilter, dateFilter, branchFilter, role, user?.id],
    queryFn: async () => {
      let query = supabase
        .from("attendance_records")
        .select("id, status, marked_at, latitude, longitude, location_verified, profiles:student_id(full_name, email, roll_no, branch), attendance_sessions(session_date, classes(name))")
        .order("marked_at", { ascending: false });

      if (role === "student") {
        query = query.eq("student_id", user!.id);
      }

      const { data } = await query;
      let results = data || [];

      if (classFilter !== "all") {
        results = results.filter((r: any) => r.attendance_sessions?.classes?.name === classFilter);
      }
      if (dateFilter) {
        results = results.filter((r: any) => r.attendance_sessions?.session_date === dateFilter);
      }
      if (branchFilter !== "all") {
        results = results.filter((r: any) => r.profiles?.branch === branchFilter);
      }
      if (studentSearch.trim()) {
        const s = studentSearch.toLowerCase();
        results = results.filter((r: any) =>
          r.profiles?.full_name?.toLowerCase().includes(s) ||
          r.profiles?.email?.toLowerCase().includes(s) ||
          r.profiles?.roll_no?.toLowerCase().includes(s)
        );
      }

      return results;
    },
  });

  const exportCSV = () => {
    if (!records?.length) return;
    const headers = ["Student", "Email", "Roll No", "Branch", "Class", "Date", "Status", "Location Verified"];
    const rows = records.map((r: any) => [
      r.profiles?.full_name || "",
      r.profiles?.email || "",
      r.profiles?.roll_no || "",
      r.profiles?.branch || "",
      r.attendance_sessions?.classes?.name || "",
      r.attendance_sessions?.session_date || "",
      r.status,
      r.location_verified ? "Yes" : "No",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-records-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Attendance Records</h2>
          <p className="text-muted-foreground">View and export attendance data</p>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={!records?.length} className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger><SelectValue placeholder="Filter by branch" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger><SelectValue placeholder="Filter by class" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes?.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
            {role !== "student" && (
              <Input placeholder="Search student..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><Skeleton className="h-48" /></div>
          ) : !records?.length ? (
            <p className="p-6 text-sm text-muted-foreground">No records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {role !== "student" && <th className="px-4 py-3 text-left font-medium">Student</th>}
                    {role !== "student" && <th className="px-4 py-3 text-left font-medium">Roll No</th>}
                    <th className="px-4 py-3 text-left font-medium">Branch</th>
                    <th className="px-4 py-3 text-left font-medium">Class</th>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">GPS</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r: any) => (
                    <tr key={r.id} className="border-b last:border-0">
                      {role !== "student" && <td className="px-4 py-3">{r.profiles?.full_name || "—"}</td>}
                      {role !== "student" && <td className="px-4 py-3">{r.profiles?.roll_no || "—"}</td>}
                      <td className="px-4 py-3">{r.profiles?.branch || "—"}</td>
                      <td className="px-4 py-3">{r.attendance_sessions?.classes?.name || "—"}</td>
                      <td className="px-4 py-3">{r.attendance_sessions?.session_date || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${r.status === "present" ? "bg-accent/20 text-accent" : r.status === "absent" ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground"}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">{r.location_verified ? "✓ Verified" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
