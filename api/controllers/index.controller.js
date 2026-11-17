
import { getWelcomeMessage } from "../services/index.service.js";

export const getWelcome = (req, res) => {
  const resultado = getWelcomeMessage();
  res.json(resultado);
};
