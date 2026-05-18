// ResultsPage.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCookieValue } from "../../utils/auth";
import { API_BASE_URL } from "../../api/api";
import styles from "./ResultsPage.module.css";

// Типы данных
interface Participant {
  place_by_two_arms: number;
  full_name: string;
  gender: number;
  birth_date: string;
  rank: string;
  team: string;
  left_hand_place: number;
  left_points: number;
  right_hand_place: number;
  right_points: number;
  total_points: number;
  athlete_weight: number | null;
}

interface WeightCategory {
  weight_category: string;
  participants: Participant[];
}

interface AgeCategoryGroup {
  age_category: string;
  weight_categories: WeightCategory[];
}

interface ResultsResponse {
  data: AgeCategoryGroup[];
}

const ResultsPage: React.FC = () => {
  const { competitionId } = useParams<{ competitionId: string }>();
  const navigate = useNavigate();
  const [groupedData, setGroupedData] = useState<AgeCategoryGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [competitionTitle, setCompetitionTitle] = useState<string>("");

  useEffect(() => {
    const loadResults = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/results/${competitionId}`, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Ошибка загрузки результатов");
        }

        const result: ResultsResponse = await response.json();
        setGroupedData(result.data || []);
        
        // Попытка получить название соревнования
        try {
          const competitionResponse = await fetch(`${API_BASE_URL}/competitions/${competitionId}`);
          if (competitionResponse.ok) {
            const compResult = await competitionResponse.json();
            const competition = compResult.data || compResult;
            setCompetitionTitle(competition.title || `Соревнование #${competitionId}`);
          } else {
            setCompetitionTitle(`Соревнование #${competitionId}`);
          }
        } catch {
          setCompetitionTitle(`Соревнование #${competitionId}`);
        }
      } catch (err: any) {
        console.error("Ошибка загрузки результатов:", err);
        setError("Не удалось загрузить результаты соревнования.");
      } finally {
        setLoading(false);
      }
    };

    if (competitionId) {
      loadResults();
    }
  }, [competitionId]);

  // Функция для скачивания протокола
  const handleExportProtocol = async () => {
    setExporting(true);
    setError(null);

    const token = getCookieValue("token");
    if (!token) {
      setError("Необходимо авторизоваться для скачивания протокола");
      setExporting(false);
      return;
    }

    try {
      const url = `${API_BASE_URL}/results/${competitionId}/export`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Ошибка при скачивании протокола");
      }

      // Получаем blob (файл)
      const blob = await response.blob();
      
      // Извлекаем имя файла из заголовка Content-Disposition
      const contentDisposition = response.headers.get("content-disposition");
      let fileName = `protocol_competition_${competitionId}.docx`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          fileName = match[1].replace(/['"]/g, "");
        }
      }

      // Создаем ссылку для скачивания
      const url_blob = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url_blob;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url_blob);
    } catch (err: any) {
      console.error("Ошибка при скачивании протокола:", err);
      setError(err.message || "Не удалось скачать протокол");
    } finally {
      setExporting(false);
    }
  };

  const handleBack = () => {
    navigate("/competitions");
  };

  // Подсчет общего количества участников
  const getTotalParticipants = () => {
    return groupedData.reduce((total, ageGroup) => {
      return total + ageGroup.weight_categories.reduce((subTotal, weightCat) => {
        return subTotal + weightCat.participants.length;
      }, 0);
    }, 0);
  };

  // Форматирование даты рождения
  const formatBirthDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Получение текста пола
  const getGenderText = (gender: number) => {
    return gender === 1 ? "муж." : "жен.";
  };

  // Получение класса для места
  const getPlaceClass = (place: number) => {
    if (place === 1) return styles.place1;
    if (place === 2) return styles.place2;
    if (place === 3) return styles.place3;
    return styles.placeOther;
  };

  // Форматирование веса
  const formatWeight = (weight: number | null) => {
    if (weight === null || weight === undefined) return "";
    return weight.toFixed(2);
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка результатов...</div>;
  }

  if (error && !groupedData.length) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
        <button onClick={handleBack} className={styles.backButton}>
          Вернуться к соревнованиям
        </button>
      </div>
    );
  }

  const hasData = groupedData.length > 0 && getTotalParticipants() > 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={handleBack} className={styles.backButton}>
          ← Назад
        </button>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>
            Итоговые результаты
            {competitionTitle && (
              <span className={styles.subtitle}>: {competitionTitle}</span>
            )}
          </h1>
          {hasData && (
            <div className={styles.stats}>
              Всего участников: <strong>{getTotalParticipants()}</strong>
            </div>
          )}
        </div>
        {hasData && (
          <button
            onClick={handleExportProtocol}
            className={styles.exportButton}
            disabled={exporting}
          >
            📄 {exporting ? "Формирование..." : "Скачать протокол (Word)"}
          </button>
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {!hasData ? (
        <div className={styles.emptyState}>
          <p>Результаты пока не опубликованы.</p>
          <p className={styles.emptyHint}>
            После завершения соревнования здесь появятся итоговые результаты.
          </p>
        </div>
      ) : (
        <div className={styles.tablesContainer}>
          {groupedData.map((ageGroup, ageIndex) => (
            <div key={ageIndex} className={styles.ageCategorySection}>
              <div className={styles.ageCategoryHeader}>
                <h2 className={styles.ageCategoryTitle}>{ageGroup.age_category}</h2>
              </div>

              <div className={styles.weightCategoriesContainer}>
                {ageGroup.weight_categories.map((weightCat, weightIndex) => (
                  <div key={weightIndex} className={styles.weightCategorySection}>
                    <div className={styles.weightCategoryHeader}>
                      <h3 className={styles.weightCategoryTitle}>
                        {weightCat.weight_category}
                      </h3>
                      <span className={styles.weightCategoryCount}>
                        {weightCat.participants.length} участн.
                      </span>
                    </div>
                    <div className={styles.tableWrapper}>
                      <table className={styles.resultsTable}>
                        <thead>
                          <tr>
                            <th>Место по "двоеборью"</th>
                            <th>Фамилия, имя, отчество</th>
                            <th>Пол, дата рождения</th>
                            <th>Спортивное звание</th>
                            <th>Команда</th>
                            <th>Место в борьбе левой рукой</th>
                            <th>Очки</th>
                            <th>Место в борьбе правой рукой</th>
                            <th>Очки</th>
                            <th>Сумма очков</th>
                            <th>Вес спортсмена</th>
                          </tr>
                        </thead>
                        <tbody>
                          {weightCat.participants.map((participant, partIndex) => (
                            <tr key={partIndex}>
                              <td className={styles.placeCell}>
                                <span className={getPlaceClass(participant.place_by_two_arms)}>
                                  {participant.place_by_two_arms}
                                </span>
                              </td>
                              <td className={styles.textLeft}>{participant.full_name}</td>
                              <td>
                                {getGenderText(participant.gender)}, {formatBirthDate(participant.birth_date)}
                              </td>
                              <td>{participant.rank || "—"}</td>
                              <td className={styles.textLeft}>{participant.team || "—"}</td>
                              <td>{participant.left_hand_place}</td>
                              <td>{participant.left_points}</td>
                              <td>{participant.right_hand_place}</td>
                              <td>{participant.right_points}</td>
                              <td><strong>{participant.total_points}</strong></td>
                              <td>{formatWeight(participant.athlete_weight)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResultsPage;