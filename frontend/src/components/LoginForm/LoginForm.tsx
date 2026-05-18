import React, { useState } from "react";
import { loginUser } from "../../api/api";
import { useNavigate, Link } from "react-router-dom";
import styles from "./LoginForm.module.css";
import logo from "../../assets/federation_logo.png"

export interface LoginFormProps {
  onLogin: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginUser(
        { 
          login, 
          password 
        }
      );
      onLogin();
    } catch (error) {
      alert("Login failed: " + (error as Error).message);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.logoWrapper}>
        <img
          src={logo}
          alt="Логотип"
          className={styles.logo}
        />
      </div>

      <div className={styles.formContainer}>
        <h2 className={styles.heading}>Вход</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "15px" }}>
            <input
              type="text"
              placeholder="Логин"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
              className={styles.input}
            />
          </div>
          <div style={{ marginBottom: "20px" }}>
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={styles.input}
            />
          </div>
          <button type="submit" className={styles.button}>
            Войти
          </button>
        </form>
        <p className={styles.footerText}>
          Нет аккаунта?{" "}
          <Link to="/register" className={styles.link}>
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;