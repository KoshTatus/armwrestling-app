import React, { useState } from "react";
import { registerUser } from "../../api/api";
import { Link } from "react-router-dom";
import styles from "./RegisterForm.module.css";
import { Gender } from "../../types/authTypes";
import logo from "../../assets/federation_logo.png"
import { LoginFormProps } from "../LoginForm/LoginForm";


const RegisterForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [patronymic, setPatronymic] = useState("");
  const [gender, setGender] = useState(Gender.MALE);
  const [birthDate, setBirthDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  // Состояние для чекбокса согласия
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const genderLabels: Record<Gender, string> = {
    [Gender.MALE]: "Мужской",
    [Gender.FEMALE]: "Женский",
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Проверка согласия на обработку данных
    if (!agreedToTerms) {
      alert("Необходимо дать согласие на обработку персональных данных.");
      return;
    }

    try {
      await registerUser(
        { 
          login, 
          password,
          name,
          surname,
          patronymic,
          gender,
          birth_date: new Date(birthDate),
        }
      );
      alert("Registration successful!");
      onLogin();
    } catch (error) {
      alert("Registration failed: " + (error as Error).message);
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
        <h2 className={styles.heading}>Регистрация</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "15px" }}>
            <input
              type="email"
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

          <div style={{ marginBottom: "20px" }}>
            <input
              type="text"
              placeholder="Фамилия"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              required
              className={styles.input}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <input
              type="text"
              placeholder="Имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={styles.input}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <input
              type="text"
              placeholder="Отчество"
              value={patronymic}
              onChange={(e) => setPatronymic(e.target.value)}
              required
              className={styles.input}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>Дата рождения:</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
              className={styles.input}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>Пол:</label>
            <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
              {[Gender.MALE, Gender.FEMALE].map((genderValue) => (
                <label key={genderValue} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <input
                    type="radio"
                    name="gender"
                    value={genderValue}
                    checked={gender === genderValue}
                    onChange={() => setGender(genderValue as Gender)}
                    className={styles.input}
                  />
                  {genderLabels[genderValue as Gender]}
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "0.9em", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                required
                style={{ marginTop: "3px" }}
              />
              <span>
                Я даю согласие на обработку моих персональных данных
              </span>
            </label>
          </div>

          <button type="submit" className={styles.button}>
            Зарегистрироваться
          </button>
        </form>
        <p className={styles.footerText}>
          Уже есть аккаунт?{" "}
          <Link to="/login" className={styles.link}>
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterForm;