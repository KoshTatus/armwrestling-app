import React, { useState, useEffect, useMemo, useRef } from "react";
import { fetchUserApplications, fetchCompetitions, fetchAgeCategories, fetchWeightCategories, downloadFile, API_BASE_URL, fetchCompetitionById } from "../../api/api";
import styles from "./UserApplicationsPage.module.css";
import { formatDate } from "../../utils/dateFormater";
import { StatusMap } from "../../types/applicationTypes";
import { getCookieValue } from "../../utils/auth";

interface Application {
  id: number;
  competition_id: number;
  rank_id: string;
  age_category_id: number;
  weight_category_id: number;
  team: string;
  gender: string;
  created_at: string;
  update_at: string;
  status: number;
  files: { id: number; name: string }[]; // Новое поле для файлов
}

interface Competition {
  id: number;
  name: string;
}

interface AgeCategory {
  id: number;
  name: string;
}

interface WeightCategory {
  id: number;
  name: string;
}

const ApplicationCard: React.FC<{ application: any }> = React.memo(({ application }) => {
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

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Ошибка при скачивании файла");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = ""; // или можно указать имя файла
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl); // Очистка памяти
    } catch (error: any) {
      console.error("Ошибка скачивания файла:", error.message);
    }
  };

  return (
    <li className={styles.applicationCard}>
      <h2 className={styles.applicationTitle}>
        Соревнование: {competitionTitle}
      </h2>
      <text>
        Статус:   
      </text>
      <text
        className={`${styles.applicationStatus} ${
          application.status === 0
            ? styles.statusPending
            : application.status === 1
            ? styles.statusApproved
            : application.status === 2
            ? styles.statusRejected
            : ''
        }`}
      >
        {StatusMap.get(application.status)}
      </text>
      <p className={styles.applicationDetails}>
        Возрастная категория: {application.ageCategoryName}
      </p>
      <p className={styles.applicationDetails}>
        Весовая категория: {application.weightCategoryName}
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
    </li>
  );
});

const UserApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Рефы для хранения данных о категориях и соревнованиях
  const competitionsRef = useRef<Competition[]>([]);
  const ageCategoriesRef = useRef<AgeCategory[]>([]);
  const weightCategoriesRef = useRef<WeightCategory[]>([]);

  // Функция для поиска имени по id
  const getNameById = (id: number, items: { id: number; name: string }[]) => {
    const item = items.find((item) => item.id === id);
    return item ? item.name : "Неизвестно";
  };

  useEffect(() => {
    const loadApplications = async () => {
      try {
        // Параллельная загрузка данных
        const [data, competitionsData, ageCategoriesData, weightCategoriesData] = await Promise.all([
          fetchUserApplications(),
          fetchCompetitions(),
          fetchAgeCategories(),
          fetchWeightCategories(),
        ]);
        setApplications(data);
        competitionsRef.current = competitionsData;
        ageCategoriesRef.current = ageCategoriesData;
        weightCategoriesRef.current = weightCategoriesData;
      } catch (err: any) {
        console.error("Ошибка загрузки данных:", err);
        setError("Не удалось загрузить данные.");
      } finally {
        setLoading(false);
      }
    };

    loadApplications();
  }, []);

  // Мемоизация преобразованных заявок
  const preparedApplications = useMemo(() => {
    return applications.map((application) => ({
      ...application,
      competitionName: getNameById(application.competition_id, competitionsRef.current),
      ageCategoryName: getNameById(application.age_category_id, ageCategoriesRef.current),
      weightCategoryName: getNameById(application.weight_category_id, weightCategoriesRef.current),
    }));
  }, [applications]);

  // Условные рендеры
  if (loading) {
    return <div className={styles.loading}>Загрузка заявок...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Мои заявки</h1>
      {preparedApplications.length === 0 ? (
        <p className={styles.noApplications}>У вас пока нет заявок.</p>
      ) : (
        <ul className={styles.applicationsList}>
          {preparedApplications.map((application) => (
            <ApplicationCard key={application.id} application={application} />
          ))}
        </ul>
      )}
    </div>
  );
};

export default UserApplicationsPage;