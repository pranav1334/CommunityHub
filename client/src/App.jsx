import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";

import AuthLanding from "./pages/AuthLanding";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import CommunityDetails from "./pages/CommunityDetails";
import CreateCommunity from "./pages/CreateCommunity";
import AdminHome from "./pages/AdminHome";
import AdminDashboard from "./pages/AdminDashboard";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("communityhub_token");

  if (!token) {
    return <Navigate to="/" />;
  }

  return children;
}

function App() {
  return (
    <>
      <Navbar />

      <Routes>
        <Route path="/" element={<AuthLanding />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/communities"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />

        <Route
          path="/communities/:communityId"
          element={
            <ProtectedRoute>
              <CommunityDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/create-community"
          element={
            <ProtectedRoute>
              <CreateCommunity />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminHome />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/:communityId"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;