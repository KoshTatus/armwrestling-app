// src/types/bracketTypes.ts
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
  status: 'scheduled' | 'in_progress' | 'completed' | 'bye';
  is_final: boolean;
  next_winner_match: number | null;
  next_loser_match: number | null;
}

export interface BracketDetail {
  id: number;
  competition_id: number;
  weight_category_id: number;
  status: 'pending' | 'in_progress' | 'completed';
  current_round: number;
  matches: MatchDetail[];
  participant_losses: Record<number, number>;
}

export interface MatchResult {
  winner_id: number;
  score_p1: number;
  score_p2: number;
}

export interface WeightCategory {
  id: number;
  name: string;
  min_weight: number;
  max_weight?: number;
}