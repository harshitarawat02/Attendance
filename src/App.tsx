import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AttendancePage from "./pages/AttendancePage";
import LocationAttendance from "./pages/LocationAttendance";
import Records from "./pages/Records";
import ClassesPage from "./pages/ClassesPage";
import UsersPage from "./pages/UsersPage";
import ProfilePage from "./pages/ProfilePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Index />} />
            <Route path="/attendance" element={<ProtectedRoute allowedRoles={["teacher", "student"]}><AttendancePage /></ProtectedRoute>} />
            <Route path="/location" element={<ProtectedRoute allowedRoles={["student"]}><LocationAttendance /></ProtectedRoute>} />
            <Route path="/records" element={<ProtectedRoute allowedRoles={["admin", "teacher", "student"]}><Records /></ProtectedRoute>} />
            <Route path="/classes" element={<ProtectedRoute allowedRoles={["admin", "teacher"]}><ClassesPage /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute allowedRoles={["admin"]}><UsersPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
