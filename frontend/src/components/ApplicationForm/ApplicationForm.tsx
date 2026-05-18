import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Gender } from "../../types/authTypes";
import { fetchAgeCategories, fetchRanks, fetchWeightCategories, submitApplication } from "../../api/api";
import styles from "./ApplicationForm.module.css";

interface AgeCategory {
  id: number;
  name: string;
  min_year: number;
  max_year?: number;
}

interface WeightCategory {
  id: number;
  name: string;
  min_weight: number;
  max_weight?: number;
}

export interface ApplicationFormData {
  age_category_id: number;
  weight_category_id: number;
  rank_id: number;
  team: string;
}

interface Rank {
  id: number;
  name: string;
}

// Добавляем интерфейс для файлов
interface FileState {
  file1: File | null;
  file2: File | null;
}

const ApplicationForm: React.FC = () => {
  const { competitionId } = useParams<{ competitionId: string }>();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<ApplicationFormData>({
    age_category_id: 0,
    weight_category_id: 0,
    rank_id: 1,
    team: "",
  });

  const [files, setFiles] = useState<FileState>({
    file1: null,
    file2: null,
  });

  const [ageCategories, setAgeCategories] = useState<AgeCategory[]>([]);
  const [weightCategories, setWeightCategories] = useState<WeightCategory[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const [ageData, weightData, rankData] = await Promise.all([
          fetchAgeCategories(),
          fetchWeightCategories(),
          fetchRanks(),
        ]);
        setAgeCategories(ageData);
        setWeightCategories(weightData);
        setRanks(rankData);
        if (ageData.length > 0 && weightData.length > 0) {
          setFormData((prev) => ({
            ...prev,
            age_category_id: ageData[0].id,
            weight_category_id: weightData[0].id,
          }));
        }
      } catch (err: any) {
        console.error("Ошибка загрузки категорий:", err);
        setError("Не удалось загрузить категории.");
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Проверка на согласие с обработкой персональных данных
    if (!agreedToTerms) {
      setError("Необходимо дать согласие на обработку персональных данных");
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Создаем FormData объект
      const formDataToSend = new FormData();
      
      // Добавляем текстовые данные
      Object.entries(formData).forEach(([key, value]) => {
        if (value){
          formDataToSend.append(key, value.toString());
        }
      });
      
      // Добавляем файлы
      if (files.file1) {
        formDataToSend.append('file1', files.file1);
      }
      if (files.file2) {
        formDataToSend.append('file2', files.file2);
      }

      await submitApplication(formDataToSend, competitionId!);
      alert("Заявка успешно отправлена!");
      navigate("/competitions");
    } catch (err: any) {
      console.error("Ошибка при отправке заявки:", err);
      setError("Не удалось отправить заявку.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Обработчик для файлов
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof FileState) => {
    if (e.target.files && e.target.files[0]) {
      setFiles((prev) => ({
        ...prev,
        [field]: e.target.files![0],
      }));
    }
  };

  if (loading) {
    return <div className={styles.loading}>Загрузка ...</div>;
  }

  if (error && !error.includes("персональных данных")) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Подача заявки на соревнование</h1>

      {error && <div className={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Возрастная категория */}
        <div className={styles.formGroup}>
          <label htmlFor="age_category_id">Возрастная категория:</label>
          <select
            id="age_category_id"
            name="age_category_id"
            value={formData.age_category_id}
            onChange={handleChange}
            required
          >
            {ageCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name} ({category.min_year} г.р. - {category.max_year || ""} г.р.)
              </option>
            ))}
          </select>
        </div>

        {/* Весовая категория */}
        <div className={styles.formGroup}>
          <label htmlFor="weight_category_id">Весовая категория:</label>
          <select
            id="weight_category_id"
            name="weight_category_id"
            value={formData.weight_category_id}
            onChange={handleChange}
            required
          >
            {weightCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name} ({category.min_weight} - {category.max_weight || "без ограничений"} кг)
              </option>
            ))}
          </select>
        </div>

        {/* Спортивное звание */}
        <div className={styles.formGroup}>
          <label htmlFor="rank_id">Спортивное звание:</label>
          <select
            id="rank_id"
            name="rank_id"
            value={formData.rank_id}
            onChange={handleChange}
            required
          >
            {ranks.map((rank) => (
              <option key={rank.id} value={rank.id}>
                {rank.name}
              </option>
            ))}
          </select>
        </div>

        {/* Команда */}
        <div className={styles.formGroup}>
          <label htmlFor="team">Команда:</label>
          <input
            type="text"
            id="team"
            name="team"
            value={formData.team}
            onChange={handleChange}
            required
          />
        </div>

        {/* Первый файл */}
        <div className={styles.formGroup}>
          <label htmlFor="file1">Копия паспорта:</label>
          <input
            type="file"
            id="file1"
            name="file1"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => handleFileChange(e, 'file1')}
            required
          />
        </div>

        {/* Второй файл */}
        <div className={styles.formGroup}>
          <label htmlFor="file2">Файл страхового полиса:</label>
          <input
            type="file"
            id="file2"
            name="file2"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => handleFileChange(e, 'file2')}
            required
          />
        </div>

        {/* Чекбокс согласия на обработку персональных данных */}
        <div className={styles.formGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => {
                setAgreedToTerms(e.target.checked);
                // Сбрасываем ошибку, если пользователь ставит галочку
                if (error && error.includes("персональных данных")) {
                  setError(null);
                }
              }}
              required
            />
            <span>
              Я даю согласие на обработку моих персональных данных
            </span>
          </label>
        </div>

        {/* Кнопка отправки */}
        <button
          type="submit"
          className={styles.submitButton}
          disabled={loading}
        >
          {loading ? "Отправка..." : "Подать заявку"}
        </button>
      </form>
    </div>
  );
};

export default ApplicationForm;