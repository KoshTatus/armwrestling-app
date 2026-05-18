// StartWeightPage.tsx (полный файл с поддержкой удаления участника)
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCookieValue } from "../../utils/auth";
import {
  API_BASE_URL,
  fetchCompetitionById,
  fetchApprovedApplicationsForWeighing,
  fetchAgeCategories,
  fetchWeightCategories,
  fetchRanks,
  updateParticipantWeight,
  updateApplicationWeightCategory,
  createManualApplication,
  deleteApplication,   // новая функция API
} from "../../api/api";
import styles from "./StartWeightPage.module.css";

interface Participant {
  application_id: number;
  full_name: string;
  weight_category: string;
  weight_category_id: number;
  age_category: string;
  team: string;
  weight: number | null;
  tempWeight: number | null;
}

interface AgeCategory {
  id: number;
  name: string;
  min_year: number;
  max_year: number | null;
}

interface WeightCategory {
  id: number;
  name: string;
  min_weight: number;
  max_weight: number | null;
}

interface Rank {
  id: number;
  name: string;
}

const StartWeightPage: React.FC = () => {
  const { competitionId } = useParams<{ competitionId: string }>();
  const navigate = useNavigate();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [ageCategories, setAgeCategories] = useState<AgeCategory[]>([]);
  const [weightCategories, setWeightCategories] = useState<WeightCategory[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [competitionTitle, setCompetitionTitle] = useState("");

  // Модальное окно смены категории
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedParticipantId, setSelectedParticipantId] = useState<number | null>(null);
  const [pendingWeight, setPendingWeight] = useState<number | null>(null);
  const [selectedNewCategoryId, setSelectedNewCategoryId] = useState<number | null>(null);
  const [availableCategoriesForWeight, setAvailableCategoriesForWeight] = useState<WeightCategory[]>([]);

  // Модальное окно добавления участника
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    surname: "",
    name: "",
    patronymic: "",
    age_category_id: 0,
    weight_category_id: 0,
    rank_id: 0,
    team: "",
    weight: "",
  });
  const [adding, setAdding] = useState(false);

  // Загрузка категорий и разрядов при монтировании
  useEffect(() => {
    const loadStaticData = async () => {
      try {
        const [age, weight, ranksData] = await Promise.all([
          fetchAgeCategories(),
          fetchWeightCategories(),
          fetchRanks(),
        ]);
        setAgeCategories(age);
        setWeightCategories(weight);
        setRanks(ranksData);
        if (age.length) setAddForm(prev => ({ ...prev, age_category_id: age[0].id }));
        if (weight.length) setAddForm(prev => ({ ...prev, weight_category_id: weight[0].id }));
        if (ranksData.length) setAddForm(prev => ({ ...prev, rank_id: ranksData[0].id }));
      } catch (err) {
        console.error("Ошибка загрузки справочников", err);
        setError("Не удалось загрузить данные для форм");
      }
    };
    loadStaticData();
  }, []);

  // Загрузка участников соревнования
  useEffect(() => {
    const loadParticipants = async () => {
      const token = getCookieValue("token");
      if (!token) {
        setError("Необходимо авторизоваться");
        setLoading(false);
        return;
      }
      try {
        const competition = await fetchCompetitionById(parseInt(competitionId!));
        setCompetitionTitle(competition.title);

        const apps = await fetchApprovedApplicationsForWeighing(parseInt(competitionId!));
        setParticipants(
          apps.map((app: any) => ({
            application_id: app.application_id,
            full_name: app.full_name,
            weight_category: app.weight_category,
            weight_category_id: app.weight_category_id,
            age_category: app.age_category,
            team: app.team,
            weight: app.weight || null,
            tempWeight: app.weight || null,
          }))
        );
      } catch (err: any) {
        console.error("Ошибка загрузки участников:", err);
        setError(err.message || "Не удалось загрузить список участников");
      } finally {
        setLoading(false);
      }
    };
    if (competitionId) loadParticipants();
  }, [competitionId]);

  // Вспомогательные функции работы с категориями
  const isWeightInCategory = (weight: number, categoryId: number): boolean => {
    const cat = weightCategories.find(c => c.id === categoryId);
    if (!cat) return false;
    if (weight < cat.min_weight) return false;
    if (cat.max_weight !== null && weight > cat.max_weight) return false;
    return true;
  };

  const getCategoriesForWeight = (weight: number): WeightCategory[] => {
    return weightCategories.filter(cat => {
      if (weight < cat.min_weight) return false;
      if (cat.max_weight !== null && weight > cat.max_weight) return false;
      return true;
    });
  };

  // Сохранение веса (и, при необходимости, смена категории)
  const performSaveWeight = async (applicationId: number, weight: number, newCategoryId?: number) => {
    setSavingId(applicationId);
    setError(null);
    setSuccess(null);
    try {
      if (newCategoryId !== undefined) {
        await updateApplicationWeightCategory(applicationId, newCategoryId);
        const newCat = weightCategories.find(c => c.id === newCategoryId);
        setParticipants(prev =>
          prev.map(p =>
            p.application_id === applicationId
              ? { ...p, weight_category: newCat?.name || p.weight_category, weight_category_id: newCategoryId }
              : p
          )
        );
      }
      await updateParticipantWeight(parseInt(competitionId!), applicationId, weight);
      setParticipants(prev =>
        prev.map(p =>
          p.application_id === applicationId ? { ...p, weight, tempWeight: weight } : p
        )
      );
      const participant = participants.find(p => p.application_id === applicationId);
      setSuccess(`Вес для ${participant?.full_name} сохранен (${weight} кг)`);
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      setError(err.message || "Ошибка сохранения");
      setTimeout(() => setError(null), 3000);
    } finally {
      setSavingId(null);
    }
  };

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

    if (!isWeightInCategory(weight, participant.weight_category_id)) {
      const suitable = getCategoriesForWeight(weight);
      if (suitable.length === 0) {
        setError(`Нет весовых категорий, подходящих для веса ${weight} кг. Обратитесь к организатору.`);
        setTimeout(() => setError(null), 5000);
        return;
      }
      setSelectedParticipantId(applicationId);
      setPendingWeight(weight);
      setAvailableCategoriesForWeight(suitable);
      setSelectedNewCategoryId(suitable[0].id);
      setShowCategoryModal(true);
      return;
    }
    await performSaveWeight(applicationId, weight);
  };

  const handleWeightChange = (applicationId: number, value: string) => {
    const weight = value === "" ? null : parseFloat(value);
    setParticipants(prev =>
      prev.map(p =>
        p.application_id === applicationId ? { ...p, tempWeight: weight } : p
      )
    );
  };

  // Сохранение всех весов
  const handleSaveAll = async () => {
    const unsaved = participants.filter(p => p.tempWeight !== null && p.tempWeight !== p.weight);
    if (unsaved.length === 0) {
      setError("Нет изменений для сохранения");
      setTimeout(() => setError(null), 2000);
      return;
    }
    let saved = 0;
    let errors = 0;
    for (const p of unsaved) {
      if (p.tempWeight !== null && p.tempWeight > 0 && p.tempWeight <= 300) {
        if (isWeightInCategory(p.tempWeight, p.weight_category_id)) {
          try {
            await updateParticipantWeight(parseInt(competitionId!), p.application_id, p.tempWeight);
            setParticipants(prev =>
              prev.map(part =>
                part.application_id === p.application_id
                  ? { ...part, weight: p.tempWeight, tempWeight: p.tempWeight }
                  : part
              )
            );
            saved++;
          } catch {
            errors++;
          }
        } else {
          errors++;
        }
      }
    }
    if (errors === 0) {
      setSuccess(`Сохранено весов: ${saved}`);
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(`Сохранено: ${saved}, ошибок: ${errors} (некоторые веса не подходят под категорию)`);
      setTimeout(() => setError(null), 5000);
    }
  };

  // Удаление заявки участника
  const handleDeleteParticipant = async (applicationId: number, fullName: string) => {
    if (!window.confirm(`Вы действительно хотите удалить участника "${fullName}"? Это действие необратимо.`)) {
      return;
    }
    try {
      await deleteApplication(applicationId);
      setParticipants(prev => prev.filter(p => p.application_id !== applicationId));
      setSuccess(`Участник ${fullName} удален`);
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      setError(err.message || "Ошибка удаления участника");
      setTimeout(() => setError(null), 3000);
    }
  };

  // Добавление участника вручную
  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.surname || !addForm.name || !addForm.age_category_id || !addForm.weight_category_id || !addForm.team) {
      setError("Заполните все обязательные поля");
      return;
    }
    const weightValue = addForm.weight === "" ? null : parseFloat(addForm.weight);
    if (weightValue !== null && (weightValue <= 0 || weightValue > 300)) {
      setError("Вес должен быть от 0 до 300 кг");
      return;
    }
    setAdding(true);
    try {
      const result = await createManualApplication({
        competition_id: parseInt(competitionId!),
        age_category_id: addForm.age_category_id,
        weight_category_id: addForm.weight_category_id,
        rank_id: addForm.rank_id,
        team: addForm.team,
        weight: weightValue,
        surname: addForm.surname,
        name: addForm.name,
        patronymic: addForm.patronymic || null,
      });
      const newParticipant: Participant = {
        application_id: result.application_id,
        full_name: result.full_name,
        weight_category: weightCategories.find(c => c.id === addForm.weight_category_id)?.name || "",
        weight_category_id: addForm.weight_category_id,
        age_category: ageCategories.find(c => c.id === addForm.age_category_id)?.name || "",
        team: addForm.team,
        weight: weightValue,
        tempWeight: weightValue,
      };
      setParticipants(prev => [...prev, newParticipant]);
      setShowAddModal(false);
      setAddForm({
        surname: "",
        name: "",
        patronymic: "",
        age_category_id: ageCategories[0]?.id || 0,
        weight_category_id: weightCategories[0]?.id || 0,
        rank_id: ranks[0]?.id || 0,
        team: "",
        weight: "",
      });
      setSuccess(`Участник ${result.full_name} добавлен`);
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleBack = () => navigate("/competitions");
  const handleGoToBracket = () => {
    const allSaved = participants.every(p => p.weight !== null && p.weight > 0);
    if (!allSaved) {
      setError("Не все веса сохранены. Сохраните вес каждого участника.");
      setTimeout(() => setError(null), 3000);
      return;
    }
    navigate(`/competitions/${competitionId}/bracket`);
  };

  if (loading) return <div className={styles.loading}>Загрузка участников...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={handleBack} className={styles.backButton}>← Назад</button>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>Предстартовое взвешивание</h1>
          {competitionTitle && <p className={styles.subtitle}>{competitionTitle}</p>}
        </div>
        <button onClick={() => setShowAddModal(true)} className={styles.addButton}>+ Добавить участника</button>
      </div>

      {success && <div className={styles.successMessage}>{success}</div>}
      {error && <div className={styles.errorMessage}>{error}</div>}

      {participants.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Нет участников, допущенных к соревнованию.</p>
          <button onClick={handleBack} className={styles.backButton}>Вернуться</button>
        </div>
      ) : (
        <div className={styles.formContainer}>
          <div className={styles.formHeader}>
            <h2>Участники соревнования</h2>
            <p>Введите точный вес участника. Если вес не соответствует категории, система предложит выбрать подходящую.</p>
          </div>
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
                  <th>Удаление</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p, idx) => {
                  const isChanged = p.tempWeight !== p.weight;
                  const isValid = p.tempWeight !== null && p.tempWeight > 0 && p.tempWeight <= 300;
                  const isSaving = savingId === p.application_id;
                  const isWeightSaved = p.weight !== null && p.weight > 0;
                  return (
                    <tr key={p.application_id}>
                      <td className={styles.textCenter}>{idx + 1}</td>
                      <td className={styles.textLeft}><strong>{p.full_name}</strong></td>
                      <td className={styles.textLeft}>{p.age_category}</td>
                      <td className={styles.textLeft}>{p.weight_category}</td>
                      <td className={styles.textLeft}>{p.team}</td>
                      <td className={styles.textCenter}>
                        <div className={styles.weightCell}>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="300"
                            value={p.tempWeight !== null ? p.tempWeight : ""}
                            onChange={(e) => handleWeightChange(p.application_id, e.target.value)}
                            className={`${styles.weightInput} ${isChanged ? styles.inputChanged : ""} ${!isValid && p.tempWeight !== null ? styles.inputError : ""}`}
                            placeholder="вес"
                          />
                        </div>
                      </td>
                      <td className={styles.textCenter}>
                        {isSaving ? (
                          <span className={styles.savingStatus}>💾 сохранение...</span>
                        ) : isWeightSaved ? (
                          <span className={styles.weightStatusSet}>✓ вес сохранен</span>
                        ) : (
                          <span className={styles.weightStatusPending}>⏳ не указан</span>
                        )}
                      </td>
                      <td className={styles.textCenter}>
                        <button
                          onClick={() => saveWeight(p.application_id)}
                          disabled={isSaving || !isValid || (!isChanged && isWeightSaved)}
                          className={styles.saveButton}
                        >
                          {isSaving ? "..." : "💾 Сохранить"}
                        </button>
                      </td>
                      <td className={styles.textCenter}>
                        <button
                          onClick={() => handleDeleteParticipant(p.application_id, p.full_name)}
                          className={styles.deleteButton}
                          title="Удалить участника"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className={styles.buttonGroup}>
            <button onClick={handleSaveAll} disabled={savingId !== null} className={styles.saveAllButton}>💾 Сохранить все веса</button>
            {participants.every(p => p.weight !== null && p.weight > 0) && (
              <button onClick={handleGoToBracket} className={styles.bracketButton}>🏆 Перейти к турнирной сетке</button>
            )}
            <button onClick={handleBack} className={styles.cancelButton}>Назад к соревнованиям</button>
          </div>
        </div>
      )}

      {/* Модалка смены категории */}
      {showCategoryModal && selectedParticipantId !== null && pendingWeight !== null && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Вес не соответствует категории</h3>
            <p>Участник <strong>{participants.find(p => p.application_id === selectedParticipantId)?.full_name}</strong> весит <strong>{pendingWeight}</strong> кг, что не подходит для категории "{participants.find(p => p.application_id === selectedParticipantId)?.weight_category}".</p>
            <p>Выберите подходящую весовую категорию:</p>
            <select value={selectedNewCategoryId || ""} onChange={e => setSelectedNewCategoryId(Number(e.target.value))} className={styles.categorySelect}>
              {availableCategoriesForWeight.map(cat => <option key={cat.id} value={cat.id}>{cat.name} ({cat.min_weight} - {cat.max_weight || "∞"} кг)</option>)}
            </select>
            <div className={styles.modalActions}>
              <button onClick={async () => {
                if (selectedNewCategoryId !== null) {
                  await performSaveWeight(selectedParticipantId, pendingWeight, selectedNewCategoryId);
                  setShowCategoryModal(false);
                }
              }} className={styles.modalSaveButton}>Сохранить в новой категории</button>
              <button onClick={() => setShowCategoryModal(false)} className={styles.modalCancelButton}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка добавления участника */}
      {showAddModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Добавить участника вручную</h3>
            <form onSubmit={handleAddParticipant}>
              <div className={styles.formGroup}>
                <label>Фамилия *</label>
                <input type="text" value={addForm.surname} onChange={e => setAddForm({...addForm, surname: e.target.value})} required />
              </div>
              <div className={styles.formGroup}>
                <label>Имя *</label>
                <input type="text" value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})} required />
              </div>
              <div className={styles.formGroup}>
                <label>Отчество</label>
                <input type="text" value={addForm.patronymic} onChange={e => setAddForm({...addForm, patronymic: e.target.value})} />
              </div>
              <div className={styles.formGroup}>
                <label>Возрастная категория *</label>
                <select value={addForm.age_category_id} onChange={e => setAddForm({...addForm, age_category_id: Number(e.target.value)})} required>
                  {ageCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Весовая категория *</label>
                <select value={addForm.weight_category_id} onChange={e => setAddForm({...addForm, weight_category_id: Number(e.target.value)})} required>
                  {weightCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Спортивное звание *</label>
                <select value={addForm.rank_id} onChange={e => setAddForm({...addForm, rank_id: Number(e.target.value)})}>
                  {ranks.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Команда *</label>
                <input type="text" value={addForm.team} onChange={e => setAddForm({...addForm, team: e.target.value})} required />
              </div>
              <div className={styles.formGroup}>
                <label>Вес (кг)</label>
                <input type="number" step="0.1" value={addForm.weight} onChange={e => setAddForm({...addForm, weight: e.target.value})} placeholder="необязательно" />
              </div>
              <div className={styles.modalActions}>
                <button type="submit" disabled={adding} className={styles.modalSaveButton}>{adding ? "Добавление..." : "Добавить"}</button>
                <button type="button" onClick={() => setShowAddModal(false)} className={styles.modalCancelButton}>Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StartWeightPage;