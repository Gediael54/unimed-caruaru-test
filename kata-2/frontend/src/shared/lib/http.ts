type ApiProblem = {
  detail?: string;
  title?: string;
  error?: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

async function readErrorMessage(response: Response): Promise<string> {
  const fallbackMessage = `Request failed with status ${response.status}.`;

  try {
    const body = (await response.json()) as ApiProblem;
    return body.detail ?? body.error ?? body.title ?? fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers
    },
    ...options
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
