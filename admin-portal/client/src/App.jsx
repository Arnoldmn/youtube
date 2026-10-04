import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./context/Auth.jsx";
import { LiveProvider } from "./context/Live.jsx";
import { MetaProvider } from "./context/Meta.jsx";
import Layout from "./components/Layout.jsx";
import { Spinner } from "./components/ui.jsx";
import Login from "./pages/Login.jsx";
import Account from "./pages/Account.jsx";
import Jobs from "./pages/Jobs.jsx";
import MyJobs from "./pages/MyJobs.jsx";
import Team from "./pages/Team.jsx";
import Applications from "./pages/Applications.jsx";

export default function App() {
  const { user } = useAuth();
  const location = useLocation();

  if (user === undefined) return <div className="boot"><Spinner label="Starting Lingua Ops…" /></div>;
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace state={{ from: location.pathname + location.search }} />} />
      </Routes>
    );
  }

  const home = user.role === "admin" ? "/jobs" : "/my-jobs";
  const isAdmin = user.role === "admin";
  return (
    <MetaProvider>
      <LiveProvider>
        {user.mustChangePassword ? (
          // Temporary password: nothing else is reachable until they choose their own.
          <Routes><Route element={<Layout />}><Route path="*" element={<Account forced />} /></Route></Routes>
        ) : (
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to={home} replace />} />
            <Route path="/login" element={<Navigate to={location.state?.from || home} replace />} />
            <Route path="/account" element={<Account />} />
            {isAdmin && <Route path="/jobs" element={<Jobs />} />}
            {isAdmin && <Route path="/team" element={<Team />} />}
            {isAdmin && <Route path="/applications" element={<Applications />} />}
            <Route path="/my-jobs" element={<MyJobs />} />
            <Route path="*" element={<Navigate to={home} replace />} />
          </Route>
        </Routes>
        )}
      </LiveProvider>
    </MetaProvider>
  );
}
