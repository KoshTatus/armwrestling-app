import axios from "axios";
import { UserLogin, UserData, UserRegister, Gender } from "../types/authTypes";
import { getCookieValue } from "../utils/auth";
import { CompetitionCreate } from "../types/competition";

export const API_BASE_URL = "http://localhost:5000/api";

const handleResponse = async (response: any) => {
  if (!response || response.status >= 400) {
    throw new Error(response.data.detail || response.statusText);
  }
  return response.data.data;
};

export const registerUser = async (userData: UserRegister) => {
  console.log(userData);
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, userData, {
      headers: {
        "Content-Type": "application/json",
      },
      withCredentials: true
    });
    return handleResponse(response);
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || error.message);
  }
};

export const loginUser = async (userData: UserLogin) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/auth/login`,
      userData,
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      }
    );
    return handleResponse(response);
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || error.message);
  }
};

export const fetchCompetitions = async () => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/competitions`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      }
    );
    
    return handleResponse(response);
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || error.message);
  }
};

export const fetchCompetitionById = async (competitonId: number) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/competitions/${competitonId}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      }
    );
    
    return handleResponse(response);
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || error.message);
  }
};

export const fetchAgeCategories = async (id: number | null = null) => {
  try {
    const params = id !== null ? { id } : {};
    const response = await axios.get(
      `${API_BASE_URL}/competitions/age_categories`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
        params,
      }
    );
    return handleResponse(response);
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || error.message);
  }
};

export const fetchWeightCategories = async (id: number | null = null) => {
  try {
    const params = id !== null ? { id } : {};
    const response = await axios.get(
      `${API_BASE_URL}/competitions/weight_categories`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
        params,
      }
    );
    
    return handleResponse(response);
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || error.message);
  }
};

export const fetchRanks = async (id: number | null = null) => {
  try {
    const params = id !== null ? { id } : {};
    const response = await axios.get(
      `${API_BASE_URL}/competitions/ranks`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
        params
      }
    );
    
    return handleResponse(response);
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || error.message);
  }
};


export const fetchUserApplications = async () => {
  try {
    const token = getCookieValue("token");
    const response = await axios.get(
      `${API_BASE_URL}/applications`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        withCredentials: true,
      }
    );
    
    return handleResponse(response);
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || error.message);
  }
};

export const fetchAllApplications = async () => {
  try {
    const token = getCookieValue("token");
    const response = await axios.get(
      `${API_BASE_URL}/applications/all`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        withCredentials: true,
      }
    );
    
    return handleResponse(response);
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || error.message);
  }
};

export const updateApplicationStatus = async (applicationId: number, newStatus: number) => {
  try {
    const token = getCookieValue("token");
    const response = await axios.patch(
      `${API_BASE_URL}/applications/all/${applicationId}`,
      newStatus,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        withCredentials: true,
      }
    );
    
    return handleResponse(response);
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || error.message);
  }
};

export const sendStatusEmail = async (applicationId: number, text: string) => {
  try {
    const token = getCookieValue("token");
    const response = await axios.post(
      `${API_BASE_URL}/notifications/${applicationId}`,
        text,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        withCredentials: true,
      }
    );
    
    return handleResponse(response);
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || error.message);
  }
};


export const fetchUserById = async (userId: number) => {
  try {
    const token = getCookieValue("token");
    const response = await axios.get(
      `${API_BASE_URL}/users/${userId}/`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        withCredentials: true,
      }
    );
    return handleResponse(response);
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || error.message);
  }
};

export const submitApplication = async (
  applicationData: FormData,
  competitionId: string
) => {
  try {
    const token = getCookieValue("token"); // Получаем токен из кук
    if (!token) {
      throw new Error("Токен не найден. Пожалуйста, войдите снова.");
    }

    const response = await axios.post(
      `${API_BASE_URL}/competitions/${competitionId}/application`,
      applicationData, // Передаем данные заявки в теле запроса
      {
        headers: {
          "Content-Type": "multipart/formdata",
          Authorization: `Bearer ${token}`, // Передаем токен в заголовке
        },
        withCredentials: true, // Если требуется передача кук
      }
    );

    return response.data; // Возвращаем данные ответа
  } catch (error: any) {
    // Обрабатываем ошибку
    if (error.response) {
      // Если сервер вернул ответ с ошибкой
      throw new Error(error.response.data.detail || "Ошибка при отправке заявки");
    } else if (error.request) {
      // Если запрос был отправлен, но ответ не получен
      throw new Error("Сервер не ответил. Проверьте подключение к интернету.");
    } else {
      // Если произошла ошибка при формировании запроса
      throw new Error(error.message || "Неизвестная ошибка");
    }
  }
};

export const downloadFile = async (fileId: number) => {
  try {
    const token = getCookieValue("token");

    // Выполняем запрос к серверу для получения файла
    const response = await axios.get(
      `${API_BASE_URL}/files/${fileId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`, // Добавляем токен авторизации
        },
        responseType: "blob", // Указываем, что ожидаем двоичные данные (Blob)
        withCredentials: true,
      }
    );

    // Создаем временную ссылку для скачивания файла
    const url = window.URL.createObjectURL(new Blob([response.data]));

    // Создаем элемент <a> для скачивания
    const link = document.createElement("a");
    link.href = url;

    // Извлекаем имя файла из заголовка Content-Disposition
    const contentDisposition = response.headers["content-disposition"];
    let fileName = "file"; // Значение по умолчанию
    if (contentDisposition && contentDisposition.includes("filename=")) {
      fileName = contentDisposition
        .split("filename=")[1]
        .split(";")[0]
        .replace(/['"]/g, ""); // Убираем кавычки, если они есть
    }

    // Устанавливаем имя файла для скачивания
    link.setAttribute("download", fileName);

    // Добавляем ссылку в DOM и имитируем клик
    document.body.appendChild(link);
    link.click();

    // Очищаем URL объект и удаляем ссылку
    window.URL.revokeObjectURL(url);
    link.remove();
  } catch (error: any) {
    console.error("Ошибка при скачивании файла:", error.message);
    throw new Error(error.response?.data?.detail || error.message);
  }
};

export const createCompetition = async (competitionData: CompetitionCreate) => {
  try {
    const token = getCookieValue("token");
    if (!token) {
      throw new Error("Токен не найден. Пожалуйста, войдите снова.");
    }

    const response = await axios.post(
      `${API_BASE_URL}/competitions/`,
      competitionData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      }
    );

    return handleResponse(response);
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || error.message);
  }
};

export interface StartingListParticipant {
  surname: string;
  name: string;
  rank: string;
  team: string;
}

export interface StartingListWeightCategory {
  weight_category: string;
  participants: StartingListParticipant[];
}

export interface StartingListAgeGroup {
  age_category: string;
  weight_categories: StartingListWeightCategory[];
}

export interface StartingListResponse {
  data: StartingListAgeGroup[];
}

// Получение стартового списка
export const fetchStartingList = async (competitionId: string): Promise<StartingListResponse> => {

  const response = await fetch(`${API_BASE_URL}/competitions/${competitionId}/list`, {
  });

  if (!response.ok) {
    throw new Error(`Ошибка загрузки стартового списка: ${response.statusText}`);
  }

  return response.json();
};

export const fetchApprovedApplicationsForWeighing = async (competitionId: number) => {
  try {
    const token = getCookieValue("token");
    const response = await axios.get(
      `${API_BASE_URL}/competitions/${competitionId}/applications/approved`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      }
    );
    return handleResponse(response);
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || error.message);
  }
};

// Сохранение веса участника
export const updateParticipantWeight = async (
  competitionId: number,
  applicationId: number,
  weight: number
) => {
  try {
    const token = getCookieValue("token");
    const response = await axios.patch(
      `${API_BASE_URL}/competitions/${competitionId}/application/${applicationId}/weight`,
      null,
      {
        params: { weight },
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      }
    );
    return handleResponse(response);
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || error.message);
  }
};

