import React from "react";
import ReactDOM from "react-dom/client";
import { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import AuthPage from "./login/AuthPage";
import Menu from "./frontend/components/Menu";
import GuestMenu from "./frontend/components/Menuguest";
import Client from "./Client";
import Guide from "./frontend/components/Guide";
import GestioneAmicizie from "./login/GestioneAmicizie";
import Aiplayer from "./AI/BotvsBot";
import PlayervsBot from "./AI/PlayervsBot";
import Classifica from "./leaderboard/Classifica";
import Tornei from "./Tornei";
import UserProfile from "./login/UserPage";
import DeleteData from "./DeleteData";




const App = () => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleSelectOption = (option: string) => {
    setSelectedOption(option);
  };
  return (
    <Router>
      <Toaster />
      <Routes>
        {/* Redirect dalla root a /auth */}
        <Route path="/" element={<Navigate to="/auth" />} />

        {/* Route per la pagina di autenticazione */}
        <Route path="/auth" element={<AuthPage />} />

        {/* Route per il menu principale */}
        <Route
          path="/menu"
          element={<Menu onSelectOption={handleSelectOption} />}
        />
        {/* Route per il menu guest */}
        <Route
          path="/GuestMenu"
          element={<GuestMenu onSelectOption={handleSelectOption} />}
        />
          {/* Route per la guida */}
        <Route path="/guide" element={<Guide />} />
        
        {/* Route per il client del gioco */}
        <Route path="/client" element={<Client />} />

        {/* Route per giocare contro il bot */}
        <Route path="/play" element={<Aiplayer />} />

        {/* Route per giocare contro il bot */}
        <Route path="/playvsbot" element={<PlayervsBot />} />

        {/* Route per tornei */}
        <Route path="/tornei" element={<Tornei />} />

        {/*Route amici*/}
        <Route path="/friends" element={<GestioneAmicizie />} />

        {/* Route classifica */}
        <Route path="/classifica" element={<Classifica />} />

        {/* Route per il menù utente */}
        <Route path="/user-profile" element={<UserProfile />} />

        {/* Route per la cancellazione dati */}
        <Route path="/delete-data" element={<DeleteData />} />

      </Routes>
    </Router>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
