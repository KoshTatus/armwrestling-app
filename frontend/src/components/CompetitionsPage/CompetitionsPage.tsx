// CompetitionsPage.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCompetitions } from "../../api/api";
import { Competition } from "../../types/competition";
import { getCookieValue, decodeTokenPayload } from "../../utils/auth";
import { Role } from "../../types/authTypes";
import styles from "./CompetitionsPage.module.css";

const CompetitionsPage: React.FC = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<number | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = getCookieValue("token");
    if (token) {
      setIsAuthenticated(true);
      const payload = decodeTokenPayload(token);
      if (payload) {
        setRole(payload.role_id);
      }
    } else {
      setIsAuthenticated(false);
      setRole(null);
    }

    const loadCompetitions = async () => {
      try {
        const data = await fetchCompetitions();
        setCompetitions(data);
      } catch (err) {
        console.error("Ошибка загрузки соревнований:", err);
        setError("Не удалось загрузить список соревнований.");
      } finally {
        setLoading(false);
      }
    };

    loadCompetitions();
  }, []);

  const handleCreateCompetition = () => {
    navigate("/competitions/create");
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка соревнований...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Список соревнований</h1>
        {role === Role.ORGANIZER && (
          <button
            onClick={handleCreateCompetition}
            className={styles.createButton}
          >
            Создать соревнование
          </button>
        )}
      </div>

      {competitions.length === 0 ? (
        <p className={styles.noCompetitions}>Нет доступных соревнований.</p>
      ) : (
        <ul className={styles.competitionsList}>
          {competitions.map((competition) => (
            <li key={competition.id} className={styles.competitionCard}>
              <h2 className={styles.competitionTitle}>{competition.title}</h2>
              <p className={styles.competitionVenue}>
                Место проведения: {competition.venue}
              </p>
              {competition.date && (
                <p className={styles.competitionDate}>
                  Дата и время: {new Date(competition.date).toLocaleString("ru-RU", {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              )}

              <div className={styles.buttonGroup}>
                <button
                  className={styles.startingListButton}
                  onClick={() => navigate(`/competitions/${competition.id}/starting-list`)}
                >
                  Стартовый список
                </button>
                {isAuthenticated && (
                  <button
                    className={styles.applyButton}
                    onClick={() => navigate(`/competitions/${competition.id}/application`)}
                  >
                    Подать заявку
                  </button>
                )}
                <button
                  className={styles.resultsButton}
                  onClick={() => navigate(`/competitions/${competition.id}/results`)}
                >
                  Результаты
                </button>
                <button className={styles.bracketButton} onClick={() => navigate(`/competitions/${competition.id}/bracket`)}>
                        🏆 Турнирная сетка
                      </button>

                {role === Role.ORGANIZER && (
                    <>
                      <button
                        className={styles.bracketButton}
                        onClick={() => navigate(`/competitions/${competition.id}/start-weight`)}
                      >
                        ⚖️ Взвешивание
                      </button>
                      
                      {role === Role.ORGANIZER && (
                        <button onClick={() => navigate(`/competitions/${competition.id}/tournament`)}>
                          🏆 Провести турнир
                        </button>
                      )}
                    </>
                  )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CompetitionsPage;