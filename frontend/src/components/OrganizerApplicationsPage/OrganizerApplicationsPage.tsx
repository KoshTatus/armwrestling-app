import React, { useState, useEffect, useMemo } from "react";
import {
  fetchAllApplications,
  updateApplicationStatus,
  fetchAgeCategories,
  fetchWeightCategories,
  API_BASE_URL,
  sendStatusEmail,
  fetchUserById,
  fetchCompetitionById,
} from "../../api/api";
import styles from "./OrganizerApplicationsPage.module.css";
import { formatDate } from "../../utils/dateFormater";
import { getCookieValue } from "../../utils/auth";

interface Application {
  id: number;
  competition_name: string;
  age_category_id: number;
  weight_category_id: number;
  team: string;
  gender: string;
  created_at: string;
  update_at: string;
  status: string;
  files: { id: number; name: string }[];
  full_name: string;
  user_id: number;
}

interface AgeCategory {
  id: number;
  name: string;
}

interface WeightCategory {
  id: number;
  name: string;
}

// Компонент для отдельной заявки
const ApplicationCard: React.FC<{
  application: any;
  onStatusChange: (id: number, status: string, userId: number, message?: string) => void;
}> = React.memo(({ application, onStatusChange }) => {
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");
  const [selectedStatus, setSelectedStatus] = useState(application.status);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [competitionTitle, setCompetitionTitle] = useState<string>("");

  const fetchCompetitionTitle = async (competitionId: number) => {
    const competiton = await fetchCompetitionById(competitionId);
    setCompetitionTitle(competiton.title);
  };
  useEffect(() => {
      if (application.competition_id) {
        fetchCompetitionTitle(application.competition_id);
      } else {
        setCompetitionTitle("Соревнование не указано");
      }
    }, [application.competition_id]);

  const handleFileDownload = async (fileId: number) => {
    try {
      const token = getCookieValue("token");
      const url = `${API_BASE_URL}/files/${fileId}`;

      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("download", "");

      link.onclick = () => {
        fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error("Ошибка при скачивании файла");
            }
            return response.blob();
          })
          .then((blob) => {
            const url = window.URL.createObjectURL(blob);
            link.href = url;
            link.click();
          })
          .catch((error) => {
            console.error("Ошибка скачивания:", error);
          });
      };

      link.click();
    } catch (error: any) {
      console.error("Ошибка скачивания файла:", error.message);
    }
  };

  const handleStatusSelect = (newStatus: string) => {
    setSelectedStatus(newStatus);
    // Показываем модальное окно для отправки сообщения
    setShowEmailModal(true);
  };

  const handleSendEmail = async () => {
    setSendingEmail(true);
    try {
      const statusText = 
        selectedStatus === "1" ? "принята" : 
        selectedStatus === "2" ? "отклонена" : 
        "в процессе обработки";
      
      const competiton = await fetchCompetitionById(application.competition_id)

      const defaultMessage = `Ваша заявка на участие в соревновании "${competiton.title}" была ${statusText}.${emailMessage ? `\n\nКомментарий организатора: ${emailMessage}` : ""}`;
      
      await onStatusChange(application.id, selectedStatus, application.user_id, defaultMessage);
      setShowEmailModal(false);
      setEmailMessage("");
    } catch (error) {
      console.error("Ошибка отправки:", error);
    } finally {
      setSendingEmail(false);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "0": return "В процессе";
      case "1": return "Принята";
      case "2": return "Отказано";
      default: return "Неизвестно";
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "0": return styles.statusPending;
      case "1": return styles.statusAccepted;
      case "2": return styles.statusRejected;
      default: return "";
    }
  };

  return (
    <>
      <li className={styles.applicationCard}>
        <h2 className={styles.applicationTitle}>
          Соревнование: {competitionTitle}
        </h2>
        <p className={styles.applicationDetails}>
          ФИО участника: {application.full_name || "Неизвестно"}
        </p>
        <p className={styles.applicationDetails}>
          Возрастная категория: {application.ageCategoryName || "Неизвестно"}
        </p>
        <p className={styles.applicationDetails}>
          Весовая категория: {application.weightCategoryName || "Неизвестно"}
        </p>
        <p className={styles.applicationDetails}>
          Команда: {application.team}
        </p>
        <p className={styles.applicationDetails}>
          Создана: {formatDate(application.created_at)}
        </p>
        <p className={styles.applicationDetails}>
          Обновлена: {formatDate(application.update_at)}
        </p>
        <p className={styles.applicationDetails}>
          Статус: <span className={getStatusClass(application.status)}>
            {getStatusText(application.status)}
          </span>
        </p>

        {/* Отображение файлов */}
        {application.files && application.files.length > 0 ? (
          <div className={styles.filesSection}>
            <h3>Прикрепленные файлы:</h3>
            <ul className={styles.filesList}>
              {application.files.map((file: { id: number; name: string }) => (
                <li key={file.id} className={styles.fileItem}>
                  <span className={styles.fileName}>{file.name}</span>
                  <button
                    className={styles.downloadButtonInline}
                    onClick={() => handleFileDownload(file.id)}
                  >
                    Скачать
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p>Нет прикрепленных файлов.</p>
        )}

        <div className={styles.statusContainer}>
          <label htmlFor={`status-${application.id}`}>Изменить статус:</label>
          <select
            id={`status-${application.id}`}
            value={selectedStatus}
            onChange={(e) => handleStatusSelect(e.target.value)}
            className={styles.statusDropdown}
          >
            <option value="0">В процессе</option>
            <option value="1">Принята</option>
            <option value="2">Отказано</option>
          </select>
        </div>
      </li>

      {/* Модальное окно для отправки email */}
      {showEmailModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Отправка уведомления на почту</h3>
            <p className={styles.modalStatus}>
              Новый статус:{" "}
              <strong>
                {selectedStatus === "1"
                  ? "Принята"
                  : selectedStatus === "2"
                  ? "Отказано"
                  : "В процессе"}
              </strong>
            </p>
            <div className={styles.formGroup}>
              <label htmlFor="emailMessage">Сообщение:</label>
              <textarea
                id="emailMessage"
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Введите дополнительную информацию для участника..."
                className={styles.messageTextarea}
                rows={4}
              />
            </div>
            <div className={styles.modalActions}>
              <button
                onClick={handleSendEmail}
                className={styles.sendButton}
                disabled={sendingEmail}
              >
                {sendingEmail ? "Отправка..." : "Отправить"}
              </button>
              <button
                onClick={() => setShowEmailModal(false)}
                className={styles.cancelButton}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

const OrganizerApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [ageCategories, setAgeCategories] = useState<AgeCategory[]>([]);
  const [weightCategories, setWeightCategories] = useState<WeightCategory[]>([]);
  const [userEmails, setUserEmails] = useState<Map<number, string>>(new Map());

  useEffect(() => {
      const loadData = async () => {
        try {
          const [data, ageCategoriesData, weightCategoriesData] = await Promise.all([
            fetchAllApplications(),
            fetchAgeCategories(),
            fetchWeightCategories(),
          ]);

          setApplications(data);
          setAgeCategories(ageCategoriesData);
          setWeightCategories(weightCategoriesData);

        } catch (err: any) {
          console.error("Ошибка загрузки данных:", err);
          setError("Не удалось загрузить данные.");
        } finally {
          setLoading(false);
        }
      };

      loadData();
    }, []);

  const getCategoryNameById = (id: number, categories: { id: number; name: string }[]) => {
    const category = categories.find((cat) => cat.id === id);
    return category ? category.name : "Неизвестно";
  };

  const preparedApplications = useMemo(() => {
    return applications.map((app) => ({
      ...app,
      ageCategoryName: getCategoryNameById(app.age_category_id, ageCategories),
      weightCategoryName: getCategoryNameById(app.weight_category_id, weightCategories),
      genderLabel: app.gender === "MALE" ? "Мужской" : "Женский",
      email: userEmails.get(app.user_id) || "Email не найден",
    }));
  }, [applications, ageCategories, weightCategories, userEmails]);

  const handleStatusChange = async (applicationId: number, newStatus: string, userId: number, emailMessage?: string) => {
    try {
      await updateApplicationStatus(applicationId, parseInt(newStatus));
      const user = await fetchUserById(userId);

      if (emailMessage) {
        const userEmail = user.login;
        if (userEmail) {
          await sendStatusEmail(applicationId, emailMessage);
        } else {
          console.warn(`Email не найден для пользователя ${userId}`);
          alert("Предупреждение: Email пользователя не найден, уведомление не отправлено");
        }
      }
      
      setApplications((prevApplications) =>
        prevApplications.map((app) =>
          app.id === applicationId ? { ...app, status: newStatus } : app
        )
      );
      
      alert("Статус обновлен" + (emailMessage ? " и уведомление отправлено на почту" : ""));
    } catch (err: any) {
      console.error("Ошибка обновления статуса:", err);
      alert("Не удалось обновить статус заявки.");
    }
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка заявок...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Все заявки участников</h1>
      {preparedApplications.length === 0 ? (
        <p className={styles.noApplications}>Нет заявок.</p>
      ) : (
        <ul className={styles.applicationsList}>
          {preparedApplications.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              onStatusChange={handleStatusChange}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

export default OrganizerApplicationsPage;