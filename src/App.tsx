import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import RouteDetail from "@/pages/RouteDetail";
import Booking from "@/pages/Booking";
import Orders from "@/pages/Orders";
import Review from "@/pages/Review";
import AdminSchedule from "@/pages/AdminSchedule";
import AdminStatistics from "@/pages/AdminStatistics";
import { useEffect } from "react";
import { apiFetch, useAppStore } from "@/store/useAppStore";

function Layout({ children }: { children: React.ReactNode }) {
  const { token, user, setUser } = useAppStore();

  useEffect(() => {
    if (token && !user) {
      apiFetch("/api/auth/me").then((res) => {
        if (res.success && res.data) setUser(res.data);
      });
    }
  }, [token]);

  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/login" element={<Login />} />
        <Route path="/route/:id" element={<Layout><RouteDetail /></Layout>} />
        <Route path="/booking" element={<Layout><Booking /></Layout>} />
        <Route path="/orders" element={<Layout><Orders /></Layout>} />
        <Route path="/review/:orderId" element={<Layout><Review /></Layout>} />
        <Route path="/admin/schedule" element={<Layout><AdminSchedule /></Layout>} />
        <Route path="/admin/statistics" element={<Layout><AdminStatistics /></Layout>} />
      </Routes>
    </Router>
  );
}
