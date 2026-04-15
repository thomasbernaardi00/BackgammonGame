import { useState } from "react";
import Login from "./login";
import Register from "./registrazione";
import GithubLogin from "./GithubLogin";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true); // inizialmente mostra login

  // Funzioni per fare lo switch
  const switchToRegister = () => setIsLogin(false);
  const switchToLogin = () => setIsLogin(true);

  return (
    <div className="auth-page">
      {isLogin ? (
        <Login switchToRegister={switchToRegister} />
      ) : (
        <Register switchToLogin={switchToLogin} />
      )}

      {/* Aggiungi il bottone "Continua con Facebook" */}
      <div className="social-login">
        <p>Otherwise continue with:</p>
        <GithubLogin />
      </div>
    </div>
  );
};

export default AuthPage;
