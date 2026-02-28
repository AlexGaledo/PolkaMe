import { createBrowserRouter } from "react-router-dom";
import { PublicLayout, DashboardLayout } from "./components/layout";
import {
  LandingPage,
  DashboardPage,
  VerificationPage,
  GovernancePage,
  SecurityPage,
} from "./pages";

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [{ index: true, element: <LandingPage /> }],
  },
  {
    element: <DashboardLayout />,
    children: [
      { path: "dashboard", element: <DashboardPage /> },
      { path: "verification", element: <VerificationPage /> },
      { path: "governance", element: <GovernancePage /> },
      { path: "security", element: <SecurityPage /> },
    ],
  },
]);

export default router;
