export enum Gender {
  MALE = 1,
  FEMALE
}

export interface UserLogin {
  login: string;
  password: string
}

export enum Role {
  PARTICIPANT = 1,
  ORGANIZER,
  ADMIN
}

export interface UserRegister extends UserLogin{
  name: string;
  surname: string;
  patronymic: string;
  gender: Gender;
  birth_date: Date;
}

export interface UserData extends UserLogin{
  id: number;
}