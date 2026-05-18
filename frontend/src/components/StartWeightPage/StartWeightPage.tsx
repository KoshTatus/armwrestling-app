// StartWeightPage.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCookieValue } from "../../utils/auth";
import { 
  API_BASE_URL, 
  fetchCompetitionById, 
  fetchApprovedApplicationsForWeighing, 
  updateParticipantWeight 
} from "../../api/api";
import styles from "./StartWeightPage.module.css";

interface Participant {
  id: number;
  application_id: number;
  full_name: string;
  weight_category: string;
  age_category: string;
  team: string;
  weight: number | null;
  tempWeight: number | null;
}

const StartWeightPage: React.FC = () => {
  const { competitionId } = useParams<{ competitionId: string }>();
  const navigate = useNavigate();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [competitionTitle, setCompetitionTitle] = useState<string>("");

  // Загрузка участников с одобренными заявками
  useEffect(() => {
    const loadParticipants = async () => {
      const token = getCookieValue("token");
      if (!token) {
        setError("Необходимо авторизоваться");
        setLoading(false);
        return;
      }

      try {
        // Загружаем информацию о соревновании
        const competition = await fetchCompetitionById(parseInt(competitionId!));
        setCompetitionTitle(competition.title);

        // Загружаем одобренные заявки через новый эндпоинт
        const applications = await fetchApprovedApplicationsForWeighing(parseInt(competitionId!));
        
        setParticipants(applications.map((app: any) => ({
          id: app.id,
          application_id: app.application_id,
          full_name: app.full_name,
          weight_category: app.weight_category,
          age_category: app.age_category,
          team: app.team,
          weight: app.weight || null,
          tempWeight: app.weight || null,
        })));
      } catch (err: any) {
        console.error("Ошибка загрузки участников:", err);
        setError(err.message || "Не удалось загрузить список участников");
      } finally {
        setLoading(false);
      }
    };

    if (competitionId) {
      loadParticipants();
    }
  }, [competitionId]);

  // Сохранение веса участника
  const saveWeight = async (applicationId: number) => {
    const participant = participants.find(p => p.application_id === applicationId);
    if (!participant) return;

    const weight = participant.tempWeight;
    if (weight === null || weight === undefined) {
      setError("Введите вес перед сохранением");
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (weight <= 0) {
      setError("Вес должен быть больше 0");
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (weight > 300) {
      setError("Вес не может превышать 300 кг");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setSavingId(applicationId);
    setError(null);
    setSuccess(null);

    try {
      await updateParticipantWeight(parseInt(competitionId!), applicationId, weight);
      
      // Обновляем сохраненный вес
      setParticipants((prev) =>
        prev.map((p) =>
          p.application_id === applicationId
            ? { ...p, weight: weight, tempWeight: weight }
            : p
        )
      );

      setSuccess(`Вес для ${participant.full_name} сохранен (${weight} кг)`);
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      console.error("Ошибка сохранения веса:", err);
      setError(err.message || "Не удалось сохранить вес");
      setTimeout(() => setError(null), 3000);
    } finally {
      setSavingId(null);
    }
  };

  // Обработчик изменения веса в поле ввода
  const handleWeightChange = (applicationId: number, value: string) => {
    const weight = value === "" ? null : parseFloat(value);
    
    setParticipants((prev) =>
      prev.map((p) =>
        p.application_id === applicationId
          ? { ...p, tempWeight: weight }
          : p
      )
    );
  };

  // Сохранение всех весов
  const handleSaveAll = async () => {
    const unsavedParticipants = participants.filter(p => 
      p.tempWeight !== null && p.tempWeight !== p.weight
    );

    if (unsavedParticipants.length === 0) {
      setError("Нет изменений для сохранения");
      setTimeout(() => setError(null), 2000);
      return;
    }

    setError(null);
    setSuccess(null);

    let savedCount = 0;
    let errorCount = 0;

    for (const participant of unsavedParticipants) {
      if (participant.tempWeight !== null && participant.tempWeight > 0) {
        try {
          await updateParticipantWeight(parseInt(competitionId!), participant.application_id, participant.tempWeight);
          
          // Обновляем сохраненный вес в состоянии
          setParticipants((prev) =>
            prev.map((p) =>
              p.application_id === participant.application_id
                ? { ...p, weight: participant.tempWeight, tempWeight: participant.tempWeight }
                : p
            )
          );
          savedCount++;
        } catch {
          errorCount++;
        }
      }
    }

    if (errorCount === 0) {
      setSuccess(`Сохранено весов: ${savedCount}`);
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(`Сохранено: ${savedCount}, ошибок: ${errorCount}`);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleBack = () => {
    navigate(`/competitions`);
  };

  const handleGoToBracket = () => {
    // Проверяем, что все веса сохранены
    const allSaved = participants.every(p => p.weight !== null && p.weight > 0);
    if (!allSaved) {
      setError("Не все веса сохранены. Пожалуйста, сохраните вес каждого участника.");
      setTimeout(() => setError(null), 3000);
      return;
    }
    navigate(`/competitions/${competitionId}/bracket`);
  };

  // Статистика
  const allWeightsSet = participants.length > 0 && participants.every(p => p.weight !== null && p.weight > 0);
  const participantsWithWeight = participants.filter(p => p.weight !== null && p.weight > 0).length;
  const totalParticipants = participants.length;
  const hasUnsavedChanges = participants.some(p => p.tempWeight !== p.weight);
  const progressPercent = totalParticipants > 0 ? (participantsWithWeight / totalParticipants) * 100 : 0;

  if (loading) {
    return <div className={styles.loading}>Загрузка участников...</div>;
  }

  if (error && participants.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
        <button onClick={handleBack} className={styles.backButton}>
          Вернуться к соревнованию
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={handleBack} className={styles.backButton}>
          ← Назад
        </button>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>
            Предстартовое взвешивание
          </h1>
          {competitionTitle && (
            <p className={styles.subtitle}>{competitionTitle}</p>
          )}
        </div>
      </div>

      

      {/* Сообщения об успехе/ошибке */}
      {success && <div className={styles.successMessage}>{success}</div>}
      {error && <div className={styles.errorMessage}>{error}</div>}

      {participants.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Нет участников, допущенных к соревнованию.</p>
          <p className={styles.emptyHint}>
            Сначала необходимо одобрить заявки участников на странице "Все заявки".<br />
            Статус заявки должен быть "Принята".
          </p>
          <button onClick={handleBack} className={styles.backButton}>
            Вернуться
          </button>
        </div>
      ) : (
        <div className={styles.formContainer}>
          <div className={styles.formHeader}>
            <h2>Участники соревнования</h2>
            <p>Введите точный вес каждого участника. Допустимые значения: 0-300 кг</p>
          </div>

          <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
            <div className={styles.participantsList}>
              <div className={styles.tableWrapper}>
                <table className={styles.participantsTable}>
                  <thead>
                    <tr>
                      <th>№</th>
                      <th>ФИО участника</th>
                      <th>Возрастная категория</th>
                      <th>Весовая категория</th>
                      <th>Команда</th>
                      <th>Стартовый вес (кг)</th>
                      <th>Статус</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((participant, index) => {
                      const isChanged = participant.tempWeight !== participant.weight;
                      const isSaved = participant.weight !== null && participant.weight > 0;
                      const isValidWeight = participant.tempWeight !== null && participant.tempWeight > 0 && participant.tempWeight <= 300;
                      
                      return (
                        <tr key={participant.application_id}>
                          <td className={styles.textCenter}>{index + 1}</td>
                          <td className={styles.textLeft}>
                            <strong>{participant.full_name}</strong>
                          </td>
                          <td className={styles.textLeft}>{participant.age_category}</td>
                          <td className={styles.textLeft}>{participant.weight_category}</td>
                          <td className={styles.textLeft}>{participant.team}</td>
                          <td className={styles.textCenter}>
                            <div className={styles.weightCell}>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="300"
                                value={participant.tempWeight !== null ? participant.tempWeight : ""}
                                onChange={(e) =>
                                  handleWeightChange(participant.application_id, e.target.value)
                                }
                                className={`${styles.weightInput} ${isChanged ? styles.inputChanged : ""} ${!isValidWeight && participant.tempWeight !== null ? styles.inputError : ""}`}
                                placeholder="вес"
                              />
                              <span className={styles.unit}>кг</span>
                            </div>
                          </td>
                          <td className={styles.textCenter}>
                            {savingId === participant.application_id ? (
                              <span className={styles.savingStatus}>💾 сохранение...</span>
                            ) : isSaved ? (
                              <span className={styles.weightStatusSet}>✓ вес сохранен</span>
                            ) : (
                              <span className={styles.weightStatusPending}>⏳ не указан</span>
                            )}
                          </td>
                          <td className={styles.textCenter}>
                            <button
                              type="button"
                              onClick={() => saveWeight(participant.application_id)}
                              disabled={
                                savingId === participant.application_id || 
                                !isValidWeight ||
                                (!isChanged && isSaved)
                              }
                              className={styles.saveButton}
                            >
                              {savingId === participant.application_id ? "..." : "💾 Сохранить"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.buttonGroup}>
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={savingId !== null || !hasUnsavedChanges}
                className={styles.saveAllButton}
              >
                💾 Сохранить все веса
              </button>
              {allWeightsSet && (
                <button
                  type="button"
                  onClick={handleGoToBracket}
                  className={styles.bracketButton}
                >
                  🏆 Перейти к турнирной сетке
                </button>
              )}
              <button
                type="button"
                onClick={handleBack}
                className={styles.cancelButton}
              >
                Назад к соревнованиям
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default StartWeightPage;