import React, { useState, useEffect, JSX } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import LoginForm from "./components/LoginForm/LoginForm";
import RegisterForm from "./components/RegisterForm/RegisterForm";
import CompetitionsPage from "./components/CompetitionsPage/CompetitionsPage";
import ApplicationForm from "./components/ApplicationForm/ApplicationForm";
import { getCookieValue, decodeTokenPayload, clearAuthCookies } from "./utils/auth";
import { Role } from "./types/authTypes";
import UserApplicationsPage from "./components/UserApplicatonsPage/UserApplicationsPage";
import Header from "./components/Header/Header";
import OrganizerApplicationsPage from "./components/OrganizerApplicationsPage/OrganizerApplicationsPage";
import CreateCompetitionForm from "./components/CreateCompetitonPage/CreateCompetitonForm";
import { createCompetition } from "./api/api";
import StartingListPage from "./components/StartingListPage/StartingListPage";
import ProfilePage from "./components/ProfilePage/ProfilePage";
import ResultsPage from "./components/ResultPage/ResultPage";
import StartWeightPage from "./components/StartWeightPage/StartWeightPage";
import TournamentPage from "./components/TournamentPage/TournamentPage";
import TournamentBracketPage from "./components/TournamentBracketPage/TournamentBracketPage";


const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const token = getCookieValue("token");
      if (token) {
        setIsAuthenticated(true);
        const payload = decodeTokenPayload(token);
        if (payload) {
          setRole(payload.role_id);
        }
      } else {
        setIsAuthenticated(false);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const handleLogin = () => {
    const token = getCookieValue("token");
    if (token) {
      const payload = decodeTokenPayload(token);
      if (payload) {
        setIsAuthenticated(true);
        setRole(payload.role_id);
      }
    }
  };

  const handleLogout = () => {
    clearAuthCookies();
    setIsAuthenticated(false);
    window.location.href = "/";
  };

  const handleBackToCompetitions = () => {
    window.location.href = "/competitions";
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  // Приватный маршрут (для авторизованных пользователей)
  const PrivateRoute = ({ children }: { children: JSX.Element }) => {
    return isAuthenticated ? children : <Navigate to="/login" replace />;
  };

  // Маршрут для организаторов
  const OrganizerRoute = ({ children }: { children: JSX.Element }) => {
    console.log("ORG");
    return role === Role.ORGANIZER ? children : <Navigate to="/competitions" replace />;
  };

  // Публичный маршрут (для неавторизованных пользователей)
  const PublicRoute = ({ children }: { children: JSX.Element }) => {
    return !isAuthenticated ? children : <Navigate to="/competitions" replace />;
  };

  return (
    <>
      <Header onLogout={handleLogout} isAuthenticated={isAuthenticated} />

      <Routes>
        {/* Главная страница (доступна всем) */}
        <Route path="/" element={<CompetitionsPage />} />
        <Route path="/competitions/:competitionId/bracket" element={<TournamentBracketPage />} />
        {/* Маршрут для входа (только для неавторизованных пользователей) */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginForm onLogin={handleLogin} />
            </PublicRoute>
          }
        />

        {/* Маршрут для регистрации (только для неавторизованных пользователей) */}
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterForm onLogin={handleLogin} />
            </PublicRoute>
          }
        />

        {/* Маршрут для списка соревнований (доступен всем, но с разными возможностями) */}
        <Route path="/competitions" element={<CompetitionsPage />} />

        {/* Маршрут для формы регистрации на соревнования (только для авторизованных пользователей) */}
        <Route
          path="/competitions/:competitionId/application"
          element={
            <PrivateRoute>
              <ApplicationForm />
            </PrivateRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <ProfilePage />
            </PrivateRoute>
          }
        />

        {/* Стартовый список (доступен всем) */}
        <Route path="/competitions/:competitionId/starting-list" element={<StartingListPage />} />

        {/* Маршрут для страницы заявок пользователя (только для авторизованных пользователей) */}
        <Route
          path="/applications"
          element={
            <PrivateRoute>
              <UserApplicationsPage />
            </PrivateRoute>
          }
        />

        <Route path="/competitions/:competitionId/results" element={<ResultsPage />} />

        {/* Маршрут для страницы всех заявок (только для организаторов) */}
        <Route
          path="/applications/all"
          element={
            <OrganizerRoute>
              <OrganizerApplicationsPage />
            </OrganizerRoute>
          }
        />
        <Route
          path="/competitions/:competitionId/start-weight"
          element={
            <OrganizerRoute>
              <StartWeightPage />
            </OrganizerRoute>
          }
        />

        <Route path="/competitions/:competitionId/tournament" element={<TournamentPage />} />
        
        {/* Маршрут для создания соревнования (только для организаторов) */}
        <Route
          path="/competitions/create"
          element={
            <OrganizerRoute>
              <CreateCompetitionForm 
                onCreate={createCompetition}
                onBack={handleBackToCompetitions}
              />
            </OrganizerRoute>
          }
        />
      </Routes>
    </>
  );
};

export default () => (
  <Router>
    <App />
  </Router>
);