// src/pages/TournamentPage/TournamentPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getCookieValue, decodeTokenPayload } from '../../utils/auth';
import { API_BASE_URL, fetchAgeCategories, fetchWeightCategories } from '../../api/api';
import styles from './TournamentPage.module.css';

interface ParticipantStatus {
  name: string;
  wins: number;
  losses: number;
  eliminated: boolean;
}

interface MatchData {
  match_id: string;
  first_participant: string | null;
  second_participant: string | null;
  winner: string | null;
  loser: string | null;
  round_num: number;
  bracket: string;
  is_bye: boolean;
}

interface TournamentStatus {
  winners: ParticipantStatus[];
  losers: ParticipantStatus[];
  eliminated: ParticipantStatus[];
  current_round: number;
}

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

const TournamentPage: React.FC = () => {
  const { competitionId } = useParams<{ competitionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Состояние для выбора категорий и руки
  const [ageCategories, setAgeCategories] = useState<AgeCategory[]>([]);
  const [weightCategories, setWeightCategories] = useState<WeightCategory[]>([]);
  const [selectedAgeCategoryId, setSelectedAgeCategoryId] = useState<number | null>(null);
  const [selectedWeightCategoryId, setSelectedWeightCategoryId] = useState<number | null>(null);
  const [selectedHand, setSelectedHand] = useState<'left' | 'right'>('left');
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Состояние турнира
  const [currentMatch, setCurrentMatch] = useState<MatchData | null>(null);
  const [status, setStatus] = useState<TournamentStatus>({
    winners: [],
    losers: [],
    eliminated: [],
    current_round: 0
  });
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [tournamentFinished, setTournamentFinished] = useState(false);
  
  // Реф для предотвращения дублирования подключений
  const wsRef = useRef<WebSocket | null>(null);

  // Получаем tournament_id из URL (query param)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tid = params.get('tournament_id');
    if (tid) {
      setTournamentId(tid);
    }
  }, [location.search]);

  // Загрузка списков категорий
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const [age, weight] = await Promise.all([
          fetchAgeCategories(),
          fetchWeightCategories()
        ]);
        setAgeCategories(age);
        setWeightCategories(weight);
        if (age.length > 0) setSelectedAgeCategoryId(age[0].id);
        if (weight.length > 0) setSelectedWeightCategoryId(weight[0].id);
      } catch (err) {
        console.error('Ошибка загрузки категорий:', err);
        setError('Не удалось загрузить категории');
      } finally {
        setCategoriesLoading(false);
      }
    };
    loadCategories();
  }, []);

  // Проверка прав организатора
  useEffect(() => {
    const token = getCookieValue('token');
    if (token) {
      const payload = decodeTokenPayload(token);
      if (payload.role_id >= 2) {
        setIsOrganizer(true);
      } else {
        setError('У вас нет прав для управления турниром. Требуются права организатора.');
      }
    } else {
      setError('Необходима авторизация');
    }
  }, []);

  // Проверка существующего активного турнира (если нет tournament_id в URL)
  useEffect(() => {
    if (!isOrganizer || tournamentId || !selectedAgeCategoryId || !selectedWeightCategoryId) return;

    const checkExistingTournament = async () => {
      try {
        const token = getCookieValue('token');
        const response = await fetch(
          `${API_BASE_URL}/tournament/check/${competitionId}?age_category_id=${selectedAgeCategoryId}&weight_category_id=${selectedWeightCategoryId}&hand=${selectedHand}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.ok) {
          const data = await response.json();
          if (data.exists) {
            const shouldResume = window.confirm('Обнаружен незавершённый турнир для выбранной категории. Возобновить?');
            if (shouldResume) {
              setTournamentId(data.tournament_id);
              // Обновляем URL
              const url = new URL(window.location.href);
              url.searchParams.set('tournament_id', data.tournament_id);
              window.history.pushState({}, '', url.toString());
            }
          }
        }
      } catch (err) {
        console.error('Ошибка проверки турнира:', err);
      }
    };
    checkExistingTournament();
  }, [isOrganizer, tournamentId, selectedAgeCategoryId, selectedWeightCategoryId, selectedHand, competitionId]);

  // Запуск нового турнира (если нет tournament_id)
  const handleStartTournament = async () => {
    if (!selectedAgeCategoryId || !selectedWeightCategoryId) {
      setError('Выберите возрастную и весовую категории');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = getCookieValue('token');
      if (!token) throw new Error('Токен не найден');

      const response = await fetch(`${API_BASE_URL}/tournament/start/${competitionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          age_category_id: selectedAgeCategoryId,
          weight_category_id: selectedWeightCategoryId,
          hand: selectedHand,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Ошибка запуска турнира');
      }
      const data = await response.json();
      setTournamentId(data.tournament_id);
      // Обновляем URL
      const url = new URL(window.location.href);
      url.searchParams.set('tournament_id', data.tournament_id);
      window.history.pushState({}, '', url.toString());
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Подключение WebSocket после получения tournamentId
  useEffect(() => {
    if (!tournamentId || !isOrganizer) return;

    const connectWebSocket = () => {
      const token = getCookieValue('token');
      if (!token) {
        setError('Токен не найден');
        setLoading(false);
        return;
      }

      const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');
      const wsUrl = `${WS_BASE_URL}/tournament/ws/${tournamentId}?token=${encodeURIComponent(token)}`;

      const websocket = new WebSocket(wsUrl);
      wsRef.current = websocket;

      websocket.onopen = () => {
        console.log('WebSocket connected');
        setWs(websocket);
        setLoading(false);
      };

      websocket.onerror = () => {
        setError('Ошибка соединения с сервером');
        setLoading(false);
      };

      websocket.onclose = (event) => {
        console.log(`WebSocket closed: ${event.code} ${event.reason}`);
        if (event.code !== 1000) {
          setError(`Соединение закрыто: ${event.reason || 'неизвестная причина'}`);
        }
        setWs(null);
      };

      websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          switch (message.type) {
            case 'match':
              setCurrentMatch(message.data);
              break;
            case 'status':
              setStatus(message.data);
              break;
            case 'tournament_finished':
              setTournamentFinished(true);
              break;
            case 'error':
              setError(message.data);
              break;
            default:
              // логи игнорируем
              break;
          }
        } catch (err) {
          console.error('Ошибка парсинга сообщения:', err);
        }
      };
      return websocket;
    };

    const websocket = connectWebSocket();
    return () => {
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
      wsRef.current = null;
    };
  }, [tournamentId, isOrganizer]);

  const selectWinner = (winnerName: string) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'choice', winner: winnerName }));
      setCurrentMatch(null);
    } else {
      setError('Соединение с сервером потеряно');
    }
  };

  const handleSaveResults = async () => {
    if (!tournamentId) return;
    try {
      const token = getCookieValue('token');
      const response = await fetch(`${API_BASE_URL}/tournament/save/${tournamentId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Ошибка сохранения результатов');
      }
      alert('Результаты успешно сохранены!');
      handleBack();
    } catch (err: any) {
      alert(`Не удалось сохранить результаты: ${err.message}`);
    }
  };

  const handleBack = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    navigate(`/competitions`);
  };

  if (categoriesLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Загрузка категорий...</p>
      </div>
    );
  }

  // Если есть ошибка и нет турнира (только на этапе настройки)
  if (error && !tournamentId) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Ошибка</h2>
          <p>{error}</p>
          <button onClick={handleBack} className={styles.backButton}>
            Вернуться к соревнованию
          </button>
        </div>
      </div>
    );
  }

  // Форма выбора категорий и руки (пока нет tournamentId)
  if (!tournamentId) {
    return (
      <div className={styles.container}>
        <div className={styles.setupPanel}>
          <h2>Настройка турнира</h2>
          <div className={styles.formGroup}>
            <label>Возрастная категория:</label>
            <select
              value={selectedAgeCategoryId || ''}
              onChange={(e) => setSelectedAgeCategoryId(Number(e.target.value))}
            >
              {ageCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.min_year} - {cat.max_year || '∞'} г.)
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Весовая категория:</label>
            <select
              value={selectedWeightCategoryId || ''}
              onChange={(e) => setSelectedWeightCategoryId(Number(e.target.value))}
            >
              {weightCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.min_weight} - {cat.max_weight || '∞'} кг)
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Рука:</label>
            <div className={styles.radioGroup}>
              <label>
                <input
                  type="radio"
                  value="left"
                  checked={selectedHand === 'left'}
                  onChange={() => setSelectedHand('left')}
                />
                Левая
              </label>
              <label>
                <input
                  type="radio"
                  value="right"
                  checked={selectedHand === 'right'}
                  onChange={() => setSelectedHand('right')}
                />
                Правая
              </label>
            </div>
          </div>
          <button onClick={handleStartTournament} className={styles.startButton} disabled={loading}>
            {loading ? 'Запуск...' : 'Запустить турнир'}
          </button>
          {error && <div className={styles.errorMessage}>{error}</div>}
        </div>
      </div>
    );
  }

  // Активный турнир
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={handleBack} className={styles.backButton}>
          ← Назад к соревнованию
        </button>
        <h1 className={styles.title}>
          🏆 Турнир ({selectedHand === 'left' ? 'Левая рука' : 'Правая рука'})
        </h1>
        <div className={styles.roundInfo}>Раунд: {status.current_round}</div>
      </div>

      <div className={styles.statusPanel}>
        <div className={styles.winners}>
          <h3>✅ Сетка победителей (0 поражений)</h3>
          {status.winners.length === 0 ? (
            <div className={styles.empty}>—</div>
          ) : (
            status.winners.map((w) => (
              <div key={w.name} className={styles.statusItem}>
                <span className={styles.participantName}>{w.name}</span>
                <span className={styles.record}>({w.wins}-{w.losses})</span>
              </div>
            ))
          )}
        </div>

        <div className={styles.losers}>
          <h3>⚠️ Сетка проигравших (1 поражение)</h3>
          {status.losers.length === 0 ? (
            <div className={styles.empty}>—</div>
          ) : (
            status.losers.map((l) => (
              <div key={l.name} className={styles.statusItem}>
                <span className={styles.participantName}>{l.name}</span>
                <span className={styles.record}>({l.wins}-{l.losses})</span>
              </div>
            ))
          )}
        </div>

        <div className={styles.eliminated}>
          <h3>💀 Выбывшие (2 поражения)</h3>
          {status.eliminated.length === 0 ? (
            <div className={styles.empty}>—</div>
          ) : (
            status.eliminated.map((e) => (
              <div key={e.name} className={styles.statusItem}>
                <span className={styles.participantName}>{e.name}</span>
                <span className={styles.record}>({e.wins}-{e.losses})</span>
              </div>
            ))
          )}
        </div>
      </div>

      {currentMatch && !currentMatch.is_bye && (
        <div className={styles.matchPanel}>
          <h2 className={styles.matchTitle}>🔥 Текущий матч</h2>
          <div className={styles.matchInfo}>
            <span className={styles.bracket}>
              {currentMatch.bracket === 'winners'
                ? 'Сетка победителей'
                : currentMatch.bracket === 'losers'
                ? 'Сетка проигравших'
                : 'Гранд-финал'}
            </span>
            <span className={styles.round}>Раунд {currentMatch.round_num}</span>
          </div>
          <div className={styles.matchButtons}>
            <button
              onClick={() => selectWinner(currentMatch.first_participant!)}
              className={styles.playerButton}
            >
              {currentMatch.first_participant}
            </button>
            <span className={styles.vs}>VS</span>
            <button
              onClick={() => selectWinner(currentMatch.second_participant!)}
              className={styles.playerButton}
            >
              {currentMatch.second_participant}
            </button>
          </div>
          <p className={styles.matchHint}>Нажмите на имя победителя</p>
        </div>
      )}

      {tournamentFinished && (
        <div className={styles.savePanel}>
          <button onClick={handleSaveResults} className={styles.saveButton}>
            💾 Сохранить результаты в протокол
          </button>
        </div>
      )}

      {loading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
        </div>
      )}
    </div>
  );
};

export default TournamentPage;