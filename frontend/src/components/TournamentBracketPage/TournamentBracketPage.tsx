import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCookieValue } from '../../utils/auth';
import { API_BASE_URL, fetchAgeCategories, fetchWeightCategories } from '../../api/api';
import styles from './TournamentBracketPage.module.css';

interface Match {
  id: number;
  first: string;
  second: string;
  winner: string | null;
  is_bye: boolean;
}

interface RoundData {
  round_num: number;
  winners_matches: Match[];
  losers_matches: Match[];
}

const TournamentBracketPage: React.FC = () => {
  const { competitionId } = useParams();
  const navigate = useNavigate();
  const [ageCats, setAgeCats] = useState<any[]>([]);
  const [weightCats, setWeightCats] = useState<any[]>([]);
  const [selectedAge, setSelectedAge] = useState<number | null>(null);
  const [selectedWeight, setSelectedWeight] = useState<number | null>(null);
  const [selectedHand, setSelectedHand] = useState<'left' | 'right'>('left');
  const [rounds, setRounds] = useState<RoundData[]>([]);
  const [grandFinalMatches, setGrandFinalMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const [age, weight] = await Promise.all([fetchAgeCategories(), fetchWeightCategories()]);
        setAgeCats(age);
        setWeightCats(weight);
        if (age.length) setSelectedAge(age[0].id);
        if (weight.length) setSelectedWeight(weight[0].id);
      } catch (err) {
        setError('Не удалось загрузить категории');
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    if (!selectedAge || !selectedWeight) return;
    const fetchBracket = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = getCookieValue('token');
        const url = `${API_BASE_URL}/tournament/bracket/${competitionId}?age_category_id=${selectedAge}&weight_category_id=${selectedWeight}&hand=${selectedHand}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Ошибка загрузки сетки');
        const json = await res.json();
        setRounds(json.data.rounds);
        setGrandFinalMatches(json.data.grand_final_matches);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchBracket();
  }, [selectedAge, selectedWeight, selectedHand, competitionId]);

  const renderMatches = (matches: Match[]) => {
    if (!matches.length) {
      return <div className={styles.empty}>—</div>;
    }
    return matches.map((match) => (
      <div key={match.id} className={styles.matchCard}>
        <div
          className={`${styles.participant} ${
            match.winner === match.first ? styles.winner : ''
          }`}
        >
          {match.first || '(bye)'}
        </div>
        <div className={styles.vs}>vs</div>
        <div
          className={`${styles.participant} ${
            match.winner === match.second ? styles.winner : ''
          }`}
        >
          {match.second || '(bye)'}
        </div>
      </div>
    ));
  };

  const hasGrandFinal = grandFinalMatches.length > 0;

  return (
    <div className={styles.container}>
      <button
        className={styles.backButton}
        onClick={() => navigate(`/competitions`)}
      >
        ← Назад к соревнованию
      </button>

      <div className={styles.controls}>
        <select
          value={selectedAge || ''}
          onChange={(e) => setSelectedAge(Number(e.target.value))}
        >
          {ageCats.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        <select
          value={selectedWeight || ''}
          onChange={(e) => setSelectedWeight(Number(e.target.value))}
        >
          {weightCats.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        <div className={styles.handSelector}>
          <button
            className={selectedHand === 'left' ? styles.active : ''}
            onClick={() => setSelectedHand('left')}
          >
            Левая рука
          </button>
          <button
            className={selectedHand === 'right' ? styles.active : ''}
            onClick={() => setSelectedHand('right')}
          >
            Правая рука
          </button>
        </div>
      </div>

      {loading && <div className={styles.loading}>Загрузка сетки...</div>}
      {error && <div className={styles.error}>{error}</div>}

      {!loading && !error && rounds.length === 0 && !hasGrandFinal && (
        <div className={styles.noData}>
          Нет данных для отображения. Возможно, турнир ещё не проводился.
        </div>
      )}

      {rounds.length > 0 && (
        <div className={styles.bracketWrapper}>
          <div className={styles.bracketContainer}>
            {/* Строка сетки победителей */}
            <div className={styles.bracketRow}>
              <div className={styles.rowLabel}>Сетка победителей</div>
              <div className={styles.columns}>
                {rounds.map((round) => (
                  <div key={round.round_num} className={styles.column}>
                    <div className={styles.columnTitle}>Раунд {round.round_num}</div>
                    <div className={styles.matches}>
                      {renderMatches(round.winners_matches)}
                    </div>
                  </div>
                ))}
                {hasGrandFinal && (
                  <div className={`${styles.column} ${styles.grandFinalColumn}`}>
                    <div className={styles.columnTitle}>Гранд-финал</div>
                    <div className={styles.matches}>
                      {renderMatches(grandFinalMatches)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Строка сетки проигравших */}
            <div className={styles.bracketRow}>
              <div className={styles.rowLabel}>Сетка проигравших</div>
              <div className={styles.columns}>
                {rounds.map((round) => (
                  <div key={round.round_num} className={styles.column}>
                    <div className={styles.columnTitle}>Раунд {round.round_num}</div>
                    <div className={styles.matches}>
                      {renderMatches(round.losers_matches)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentBracketPage;