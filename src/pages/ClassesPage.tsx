import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Trash2, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Classes() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [locLat, setLocLat] = useState("");
  const [locLng, setLocLng] = useState("");
  const [locRadius, setLocRadius] = useState("100");

  const { data: classes, isLoading } = useQuery({
    queryKey: ["classes-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("classes")
        .select("*, profiles:teacher_id(full_name)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: teachers } = useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id, profiles:user_id(full_name, email)").eq("role", "teacher");
      return data || [];
    },
  });

  const createClass = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name is required");
      const { error } = await supabase.from("classes").insert({
        name: name.trim(),
        description: description.trim(),
        teacher_id: teacherId || null,
        location_lat: locLat ? parseFloat(locLat) : null,
        location_lng: locLng ? parseFloat(locLng) : null,
        location_radius: parseInt(locRadius) || 100,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Class created");
      setOpen(false);
      setName("");
      setDescription("");
      setTeacherId("");
      setLocLat("");
      setLocLng("");
      qc.invalidateQueries({ queryKey: ["classes-list"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteClass = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("classes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Class deleted");
      qc.invalidateQueries({ queryKey: ["classes-list"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Classes</h2>
          <p className="text-muted-foreground">Manage classes, assign teachers, and add students</p>
        </div>
        {role === "admin" && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> New Class</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Class</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mathematics 101" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
                </div>
                <div className="space-y-2">
                  <Label>Teacher</Label>
                  <Select value={teacherId} onValueChange={setTeacherId}>
                    <SelectTrigger><SelectValue placeholder="Assign teacher" /></SelectTrigger>
                    <SelectContent>
                      {teachers?.map((t: any) => (
                        <SelectItem key={t.user_id} value={t.user_id}>
                          {t.profiles?.full_name || t.profiles?.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Latitude</Label>
                    <Input value={locLat} onChange={(e) => setLocLat(e.target.value)} placeholder="0.0" type="number" step="any" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Longitude</Label>
                    <Input value={locLng} onChange={(e) => setLocLng(e.target.value)} placeholder="0.0" type="number" step="any" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Radius (m)</Label>
                    <Input value={locRadius} onChange={(e) => setLocRadius(e.target.value)} placeholder="100" type="number" />
                  </div>
                </div>
                <Button onClick={() => createClass.mutate()} disabled={createClass.isPending} className="w-full">
                  {createClass.isPending ? "Creating..." : "Create Class"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
      ) : !classes?.length ? (
        <Card><CardContent className="p-6 text-center text-muted-foreground">No classes yet.</CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {classes.map((c: any) => (
            <ClassCard key={c.id} cls={c} onDelete={() => deleteClass.mutate(c.id)} isAdmin={role === "admin"} />
          ))}
        </div>
      )}
    </div>
  );
}

function ClassCard({ cls, onDelete, isAdmin }: { cls: any; onDelete: () => void; isAdmin: boolean }) {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState("");

  const { data: enrolledStudents } = useQuery({
    queryKey: ["enrolled-students", cls.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("class_students")
        .select("id, student_id, profiles:student_id(full_name, email)")
        .eq("class_id", cls.id);
      return data || [];
    },
  });

  const { data: allStudents } = useQuery({
    queryKey: ["all-students"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id, profiles:user_id(full_name, email)").eq("role", "student");
      return data || [];
    },
    enabled: addOpen,
  });

  const addStudent = useMutation({
    mutationFn: async () => {
      if (!selectedStudent) throw new Error("Select a student");
      const { error } = await supabase.from("class_students").insert({ class_id: cls.id, student_id: selectedStudent });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Student added");
      setSelectedStudent("");
      setAddOpen(false);
      qc.invalidateQueries({ queryKey: ["enrolled-students", cls.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeStudent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("class_students").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Student removed");
      qc.invalidateQueries({ queryKey: ["enrolled-students", cls.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>{cls.name}</CardTitle>
          <p className="text-sm text-muted-foreground">{cls.description || "No description"}</p>
          <p className="mt-1 text-xs text-muted-foreground">Teacher: {cls.profiles?.full_name || "Unassigned"}</p>
          {cls.location_lat && <p className="text-xs text-muted-foreground">📍 {cls.location_lat.toFixed(4)}, {cls.location_lng?.toFixed(4)} ({cls.location_radius}m)</p>}
        </div>
        {isAdmin && (
          <Button variant="ghost" size="icon" onClick={onDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Students ({enrolledStudents?.length || 0})</p>
            {isAdmin && (
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1"><UserPlus className="h-3 w-3" /> Add</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Student to {cls.name}</DialogTitle></DialogHeader>
                  <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                    <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                    <SelectContent>
                      {allStudents
                        ?.filter((s: any) => !enrolledStudents?.some((e: any) => e.student_id === s.user_id))
                        .map((s: any) => (
                          <SelectItem key={s.user_id} value={s.user_id}>
                            {s.profiles?.full_name || s.profiles?.email}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => addStudent.mutate()} disabled={addStudent.isPending}>
                    {addStudent.isPending ? "Adding..." : "Add Student"}
                  </Button>
                </DialogContent>
              </Dialog>
            )}
          </div>
          {enrolledStudents?.map((s: any) => (
            <div key={s.id} className="flex items-center justify-between rounded border px-3 py-1.5 text-sm">
              <span>{s.profiles?.full_name || s.profiles?.email}</span>
              {isAdmin && (
                <button onClick={() => removeStudent.mutate(s.id)} className="text-destructive hover:underline text-xs">Remove</button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
