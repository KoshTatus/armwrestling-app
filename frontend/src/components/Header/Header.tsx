// Header.tsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Role } from "../../types/authTypes";
import { getCookieValue, decodeTokenPayload } from "../../utils/auth";
import { fetchUserById } from "../../api/api";
import logo from "../../assets/federation_logo.png";
import styles from "./Header.module.css";

interface HeaderProps {
  onLogout?: () => void;
  isAuthenticated?: boolean;
}

interface UserInfo {
  surname: string;
  name: string;
}

const Header: React.FC<HeaderProps> = ({ onLogout, isAuthenticated = false }) => {
  const navigate = useNavigate();
  const [role, setRole] = useState<number | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Получение роли из токена
  useEffect(() => {
    if (isAuthenticated) {
      const token = getCookieValue("token");
      if (token) {
        const payload = decodeTokenPayload(token);
        if (payload) {
          setRole(payload.role_id);
        }
      }
    }
  }, [isAuthenticated]);

  // Получение данных пользователя для отображения инициалов
  useEffect(() => {
    const fetchUserInfo = async () => {
      const token = getCookieValue("token");
      if (!token || !isAuthenticated) return;

      const payload = decodeTokenPayload(token);
      if (!payload || !payload.id) return;

      try {
        // Используем существующий метод из api.ts
        const data = await fetchUserById(payload.id);
        setUserInfo({
          surname: data.surname || "",
          name: data.name || "",
        });
      } catch (error) {
        console.error("Ошибка загрузки данных пользователя:", error);
      }
    };

    fetchUserInfo();
  }, [isAuthenticated]);

  // Закрытие меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogin = () => navigate("/login");
  const handleRegister = () => navigate("/register");
  const handleProfile = () => {
    setShowProfileMenu(false);
    navigate("/profile");
  };

  // Получение инициалов из данных пользователя
  const getUserInitials = () => {
    if (userInfo?.surname && userInfo?.name) {
      return `${userInfo.surname.charAt(0)}${userInfo.name.charAt(0)}`;
    }
    return "👤";
  };

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <img src={logo} alt="Логотип" className={styles.logo} />
      </div>
      
      <nav className={styles.nav}>
        {isAuthenticated ? (
          <>
            <Link to="/competitions" className={styles.link}>Соревнования</Link>
            <Link to="/applications" className={styles.link}>Мои заявки</Link>
            {role === Role.ORGANIZER && (
              <Link to="/applications/all" className={styles.link}>Все заявки</Link>
            )}
          </>
        ) : (
          <Link to="/competitions" className={styles.link}>Соревнования</Link>
        )}
      </nav>

      <div className={styles.authButtons}>
        {isAuthenticated ? (
          <div className={styles.profileMenuContainer} ref={menuRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className={styles.profileButton}
            >
              <span className={styles.profileAvatar}>{getUserInitials()}</span>
              <span className={styles.profileArrow}>▼</span>
            </button>
            {showProfileMenu && (
              <div className={styles.profileDropdown}>
                <button onClick={handleProfile} className={styles.dropdownItem}>
                  📋 Мой профиль
                </button>
                <button onClick={onLogout} className={`${styles.dropdownItem} ${styles.logoutItem}`}>
                  🚪 Выйти
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <button onClick={handleLogin} className={styles.loginButton}>
              Войти
            </button>
            <button onClick={handleRegister} className={styles.registerButton}>
              Регистрация
            </button>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;