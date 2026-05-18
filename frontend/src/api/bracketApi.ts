// src/api/bracketApi.ts
import axios from "axios";
import { getCookieValue } from "../utils/auth";
import { API_BASE_URL } from "./api";

export interface ParticipantInfo {
  id: number;
  full_name: string;
  team: string;
  rank: string;
  loss_count: number;
}

export interface MatchDetail {
  id: number;
  round_number: number;
  match_number: number;
  participant1: ParticipantInfo | null;
  participant2: ParticipantInfo | null;
  winner: ParticipantInfo | null;
  participant1_score: number;
  participant2_score: number;
  status: "scheduled" | "in_progress" | "completed" | "bye";
  is_final: boolean;
  next_winner_match: number | null;
  next_loser_match: number | null;
}

export interface BracketDetail {
  id: number;
  competition_id: number;
  weight_category_id: number;
  status: "pending" | "in_progress" | "completed";
  current_round: number;
  matches: MatchDetail[];
  participant_losses: Record<number, number>;
}

export interface MatchResult {
  winner_id: number;
  score_p1: number;
  score_p2: number;
}

export interface BracketStatusResponse {
  bracket_status: string;
  current_round: number;
  matches: {
    total: number;
    completed: number;
    in_progress: number;
    scheduled: number;
  };
  participants: {
    total: number;
    active: number;
    eliminated: number;
  };
}

// Получение всех сеток соревнования
export const fetchBracketsByCompetition = async (competitionId: number) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/bracket/${competitionId}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      }
    );
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || error.message);
  }
};

// Получение детальной информации о сетке
export const fetchBracketDetail = async (competitionId: number, weightCategoryId: number) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/bracket/${competitionId}/${weightCategoryId}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      }
    );
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || error.message);
  }
};

// Создание турнирной сетки
export const createBracket = async (competitionId: number, weightCategoryId: number) => {
  try {
    const token = getCookieValue("token");
    const response = await axios.post(
      `${API_BASE_URL}/bracket/${competitionId}/${weightCategoryId}/create`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      }
    );
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || error.message);
  }
};

// Получение матчей сетки
export const fetchBracketMatches = async (
  competitionId: number,
  weightCategoryId: number,
  roundNumber?: number,
  status?: string
) => {
  try {
    const params = new URLSearchParams();
    if (roundNumber) params.append("round_number", roundNumber.toString());
    if (status) params.append("status", status);
    
    const response = await axios.get(
      `${API_BASE_URL}/bracket/${competitionId}/${weightCategoryId}/matches?${params.toString()}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      }
    );
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || error.message);
  }
};

// Получение детальной информации о матче
export const fetchMatchDetail = async (matchId: number) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/bracket/matches/${matchId}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      }
    );
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || error.message);
  }
};

// Фиксация результата матча
export const submitMatchResult = async (matchId: number, result: MatchResult) => {
  try {
    const token = getCookieValue("token");
    const response = await axios.post(
      `${API_BASE_URL}/bracket/matches/${matchId}/result`,
      result,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      }
    );
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || error.message);
  }
};

// Генерация следующего раунда
export const generateNextRound = async (competitionId: number, weightCategoryId: number) => {
  try {
    const token = getCookieValue("token");
    const response = await axios.post(
      `${API_BASE_URL}/bracket/${competitionId}/${weightCategoryId}/next-round`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      }
    );
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || error.message);
  }
};

// Получение текущего статуса сетки
export const fetchBracketStatus = async (competitionId: number, weightCategoryId: number) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/bracket/${competitionId}/${weightCategoryId}/current-status`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      }
    );
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || error.message);
  }
};

// Получение победителей
export const fetchBracketWinners = async (competitionId: number, weightCategoryId: number) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/bracket/${competitionId}/${weightCategoryId}/winners`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      }
    );
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || error.message);
  }
};