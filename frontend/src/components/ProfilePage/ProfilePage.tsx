// ProfilePage.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Gender } from "../../types/authTypes";
import { getCookieValue, decodeTokenPayload, clearAuthCookies } from "../../utils/auth";
import { API_BASE_URL, fetchUserById } from "../../api/api";
import styles from "./ProfilePage.module.css";

interface UserProfile {
  id: number;
  login: string;
  name: string;
  surname: string;
  patronymic: string;
  gender: Gender;
  birth_date: string;
}

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    login: "",
    name: "",
    surname: "",
    patronymic: "",
    gender: Gender.MALE,
    birthDate: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const genderLabels: Record<Gender, string> = {
    [Gender.MALE]: "Мужской",
    [Gender.FEMALE]: "Женский",
  };

  // Загрузка данных профиля с использованием существующего метода
  useEffect(() => {
    const fetchProfile = async () => {
      const token = getCookieValue("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const payload = decodeTokenPayload(token);
      if (!payload || !payload.id) {
        setError("Не удалось получить информацию о пользователе");
        setLoading(false);
        return;
      }

      try {
        const data = await fetchUserById(payload.id);
        
        setProfile(data);
        setFormData({
          login: data.login || "",
          name: data.name || "",
          surname: data.surname || "",
          patronymic: data.patronymic || "",
          gender: data.gender === Gender.MALE ? Gender.MALE : Gender.FEMALE,
          birthDate: data.birth_date ? data.birth_date.split("T")[0] : "",
        });
      } catch (err: any) {
        console.error("Ошибка загрузки профиля:", err);
        setError(err.message || "Не удалось загрузить данные профиля");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleGenderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, gender: parseInt(e.target.value) as Gender }));
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const token = getCookieValue("token");
    if (!token) {
      setError("Сессия истекла, пожалуйста, войдите заново");
      setSaving(false);
      return;
    }

    const payload = decodeTokenPayload(token);
    if (!payload || !payload.id) {
      setError("Ошибка авторизации");
      setSaving(false);
      return;
    }

    try {
      const updateData = {
        login: formData.login,
        surname: formData.surname,
        name: formData.name,   
        patronymic: formData.patronymic,
        gender: formData.gender,
        birth_date: formData.birthDate,
      };

      const response = await fetch(`${API_BASE_URL}/users/${payload.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.message || "Ошибка при обновлении профиля");
      }

      const result = await response.json();
      const updatedProfile = result.data || result;
      setProfile(updatedProfile);
      setSuccess("Профиль успешно обновлен!");

      if (updatedProfile.login !== profile?.login) {
        setTimeout(() => {
          alert("Логин был изменен. Пожалуйста, войдите заново.");
          clearAuthCookies();
          window.location.href = "/login";
        }, 1500);
      }
    } catch (err: any) {
      console.error("Ошибка обновления профиля:", err);
      setError(err.message || "Не удалось обновить профиль");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка профиля...</div>;
  }

  if (error && !profile) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.profileCard}>
        <div className={styles.header}>
          <div className={styles.avatar}>
            {profile?.surname?.charAt(0) || profile?.name?.charAt(0) || "👤"}
          </div>
          <h1 className={styles.title}>Личный кабинет</h1>
          <p className={styles.subtitle}>Редактирование профиля</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {success && <div className={styles.successMessage}>{success}</div>}
          {error && <div className={styles.error}>{error}</div>}
          
          <div className={styles.infoNote}>
            <span>ℹ️</span> Изменение логина потребует повторного входа в систему
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="login">Логин (Email)</label>
            <input
              type="email"
              id="login"
              name="login"
              value={formData.login}
              onChange={handleChange}
              required
              placeholder="example@mail.com"
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="surname">Фамилия</label>
              <input
                type="text"
                id="surname"
                name="surname"
                value={formData.surname}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="name">Имя</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="patronymic">Отчество</label>
            <input
              type="text"
              id="patronymic"
              name="patronymic"
              value={formData.patronymic}
              onChange={handleChange}
              placeholder="Иванович"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Пол</label>
            <div className={styles.radioGroup}>
              {Object.entries(genderLabels).map(([value, label]) => (
                <label key={value} className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="gender"
                    value={value}
                    checked={formData.gender === parseInt(value)}
                    onChange={handleGenderChange}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="birthDate">Дата рождения</label>
            <input
              type="date"
              id="birthDate"
              name="birthDate"
              value={formData.birthDate}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.buttonGroup}>
            <button
              type="submit"
              className={styles.saveButton}
              disabled={saving}
            >
              {saving ? "Сохранение..." : "Сохранить изменения"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className={styles.cancelButton}
              disabled={saving}
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;