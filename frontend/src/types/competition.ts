export interface CompetitionCreate {
  title: string;
  venue: string;
  date?: string;
}

export interface Competition extends CompetitionCreate {
  id: number;
  organizer_id: number;
}