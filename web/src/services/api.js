import axios from "axios";
import { readSession, clearSession } from "./session";

const baseURL = import.meta.env.VITE_API_URL;
if (!baseURL) throw new Error("Configura VITE_API_URL en web/.env antes de iniciar o compilar.");
export const api = axios.create({ baseURL, timeout: 15000 });
api.interceptors.request.use((config) => {
  const token = readSession()?.token;
  if (token && !config.publicRequest) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use((response) => response, (error) => {
  if (error.response?.status === 401 && !error.config?.publicRequest) {
    clearSession();
    window.dispatchEvent(new Event("miniaula:unauthorized"));
  }
  return Promise.reject(error);
});
export function errorMessage(error) {
  const payload = error.response?.data?.error;
  if (payload?.details?.length) {
    return `${payload.message} ${payload.details.map((item) => item.message).join(" ")}`;
  }
  return payload?.message || (error.response ? "No se pudo completar la operación." :
    "No pudimos conectar con la API. Verifica que el servidor esté encendido.");
}
