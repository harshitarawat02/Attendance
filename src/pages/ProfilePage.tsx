import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ProfilePage() {
  const { user, profile, role } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [rollNo, setRollNo] = useState(profile?.roll_no || "");
  const [branch, setBranch] = useState(profile?.branch || "");

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!fullName.trim()) throw new Error("Name is required");
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), phone: phone.trim(), roll_no: rollNo.trim(), branch: branch.trim(), updated_at: new Date().toISOString() })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => toast.success("Profile updated!"),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Profile</h2>
        <p className="text-muted-foreground">Manage your account details</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Account Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Input value={role || ""} disabled className="capitalize" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1234567890" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rollNo">Roll No</Label>
            <Input id="rollNo" value={rollNo} onChange={(e) => setRollNo(e.target.value)} placeholder="e.g. 045" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="branch">Branch</Label>
            <Input id="branch" value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="e.g. IT-1, IT-2, AIML" />
          </div>
          <Button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending} className="w-full">
            {updateProfile.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
