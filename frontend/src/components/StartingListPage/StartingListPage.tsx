// StartingListPage.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchStartingList, fetchCompetitionById } from "../../api/api";
import styles from "./StartingListPage.module.css";

interface Participant {
  surname: string;
  name: string;
  rank: string;
  team: string;
}

interface WeightCategory {
  weight_category: string;
  participants: Participant[];
}

interface AgeCategoryGroup {
  age_category: string;
  weight_categories: WeightCategory[];
}

interface StartingListResponse {
  data: AgeCategoryGroup[];
}

const StartingListPage: React.FC = () => {
  const { competitionId } = useParams<{ competitionId: string }>();
  const navigate = useNavigate();
  const [groupedData, setGroupedData] = useState<AgeCategoryGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [competitionTitle, setCompetitionTitle] = useState<string>("");

  useEffect(() => {
    const loadStartingList = async () => {
      try {
        setLoading(true);
        const response = await fetchStartingList(competitionId!);
        setGroupedData(response.data);
        
        // Попытка получить название соревнования
        try {
          const competition = await fetchCompetitionById(parseInt(competitionId!));
          setCompetitionTitle(competition.title);
        } catch {
          setCompetitionTitle(`Соревнование #${competitionId}`);
        }
      } catch (err: any) {
        console.error("Ошибка загрузки стартового списка:", err);
        setError("Не удалось загрузить стартовый список.");
      } finally {
        setLoading(false);
      }
    };

    if (competitionId) {
      loadStartingList();
    }
  }, [competitionId]);

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

  if (loading) {
    return <div className={styles.loading}>Загрузка стартового списка...</div>;
  }

  if (error) {
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
            Стартовый список
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
      </div>

      {!hasData ? (
        <div className={styles.emptyState}>
          <p>Стартовый список пока пуст.</p>
          <p className={styles.emptyHint}>Заявки на соревнование ещё не поданы или не одобрены.</p>
        </div>
      ) : (
        <div className={styles.tablesContainer}>
          {groupedData.map((ageGroup, ageIndex) => (
            <div key={ageIndex} className={styles.ageCategorySection}>
              <div className={styles.ageCategoryHeader}>
                <h2 className={styles.ageCategoryTitle}>{ageGroup.age_category}</h2>
              </div>
              
              {ageGroup.weight_categories.length === 0 ? (
                <div className={styles.emptyWeightCategory}>
                  <p>Нет участников в данной возрастной категории</p>
                </div>
              ) : (
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
                        <table className={styles.table}>
                          <thead>
                            <tr>
                              <th>№</th>
                              <th>Фамилия</th>
                              <th>Имя</th>
                              <th>Разряд</th>
                              <th>Команда</th>
                            </tr>
                          </thead>
                          <tbody>
                            {weightCat.participants.map((participant, partIndex) => (
                              <tr key={partIndex}>
                                <td className={styles.rowNumber}>{partIndex + 1}</td>
                                <td>{participant.surname}</td>
                                <td>{participant.name}</td>
                                <td>{participant.rank}</td>
                                <td>{participant.team}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StartingListPage;