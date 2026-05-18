import React, { useState } from 'react';
import { CompetitionCreate } from '../../types/competition';
import styles from './CreateCompetitonForm.module.css';

interface CreateCompetitionFormProps {
  onCreate: (data: CompetitionCreate) => void;
  onBack: () => void;
}

const CreateCompetitionForm: React.FC<CreateCompetitionFormProps> = ({ onCreate, onBack }) => {
  const [formData, setFormData] = useState<CompetitionCreate>({
    title: '',
    venue: '',
    date: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: CompetitionCreate = {
      title: formData.title.trim(),
      venue: formData.venue.trim(),
      date: formData.date || undefined,
    };
    onCreate(payload);
  };

  return (
    <div className={styles['competition-form-container']}>
      <h2>Создание соревнования</h2>
      <form onSubmit={handleSubmit} className={styles['competition-form']}>
        <div className={styles['form-group']}>
          <label htmlFor="title">Название соревнования *</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
          />
        </div>

        <div className={styles['form-group']}>
          <label htmlFor="venue">Место проведения *</label>
          <input
            type="text"
            id="venue"
            name="venue"
            value={formData.venue}
            onChange={handleChange}
            required
          />
        </div>

        <div className={styles['form-group']}>
          <label htmlFor="date">Дата и время</label>
          <input
            type="datetime-local"
            id="date"
            name="date"
            value={formData.date || ''}
            onChange={handleChange}
          />
        </div>

        <div className={styles['form-actions']}>
          <button type="submit" className={styles['auth-button']}>
            Создать соревнование
          </button>
          <button type="button" onClick={onBack} className={styles['back-button']}>
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateCompetitionForm;