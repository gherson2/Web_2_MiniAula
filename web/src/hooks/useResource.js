import { useEffect, useState, useCallback } from "react";
import { errorMessage } from "../services/api";

export function useResource(load) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const reload = useCallback(() => setVersion((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, loading: true, error: "" });
    Promise.resolve().then(() => load(controller.signal)).then((data) => {
      if (!controller.signal.aborted) setState({ data, loading: false, error: "" });
    }).catch((error) => {
      if (!controller.signal.aborted) setState({ data: null, loading: false, error: errorMessage(error) });
    });
    return () => controller.abort();
  }, [load, version]);
  return { ...state, reload };
}
