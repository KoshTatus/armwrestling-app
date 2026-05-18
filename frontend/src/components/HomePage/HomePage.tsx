// HomePage.tsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchCompetitions } from "../../api/api";
import { Competition } from "../../types/competition";
import styles from "./HomePage.module.css";

const HomePage: React.FC = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
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

  const handleViewStartingList = (competitionId: number) => {
    navigate(`/competitions/${competitionId}/starting-list`);
  };

  const filteredCompetitions = competitions.filter(competition =>
    competition.title.toLowerCase().includes(filterText.toLowerCase()) ||
    competition.venue.toLowerCase().includes(filterText.toLowerCase())
  );

  if (loading) {
    return <div className={styles.loading}>Загрузка соревнований...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>Добро пожаловать на портал спортивных соревнований</h1>
        <p className={styles.heroSubtitle}>
          Участвуйте в соревнованиях, отслеживайте результаты и становитесь чемпионами!
        </p>
      </div>

      <div className={styles.searchSection}>
        <div className={styles.searchWrapper}>
          <input
            type="text"
            placeholder="Поиск соревнований по названию или месту проведения..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className={styles.searchInput}
          />
          {filterText && (
            <button
              onClick={() => setFilterText("")}
              className={styles.clearButton}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {filteredCompetitions.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Соревнования не найдены.</p>
          {filterText && (
            <p className={styles.emptyHint}>Попробуйте изменить параметры поиска.</p>
          )}
        </div>
      ) : (
        <>
          <div className={styles.resultsCount}>
            Найдено соревнований: <strong>{filteredCompetitions.length}</strong>
          </div>
          <div className={styles.competitionsGrid}>
            {filteredCompetitions.map((competition) => (
              <div key={competition.id} className={styles.competitionCard}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.competitionTitle}>{competition.title}</h2>
                  {competition.date && (
                    <span className={styles.dateBadge}>
                      {new Date(competition.date).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
                
                <div className={styles.cardContent}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>📍 Место проведения:</span>
                    <span className={styles.infoValue}>{competition.venue}</span>
                  </div>
                  {competition.date && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>🕒 Дата и время:</span>
                      <span className={styles.infoValue}>
                        {new Date(competition.date).toLocaleString("ru-RU", {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  )}
                </div>

                <div className={styles.cardFooter}>
                  <button
                    onClick={() => handleViewStartingList(competition.id)}
                    className={styles.startingListButton}
                  >
                    📋 Смотреть стартовый список
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default HomePage;