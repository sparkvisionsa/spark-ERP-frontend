export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function parseResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = Array.isArray(data.message) ? data.message[0] : data.message;
    throw new ApiError(response.status, message || "تعذر إكمال الطلب");
  }
  return data;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  if (response.status === 401 && retry && !path.includes("/auth/login") && !path.includes("/auth/refresh")) {
    const refreshed = await fetch(`${API_URL}/auth/refresh`, { method: "POST", credentials: "include" });
    if (refreshed.ok) return apiRequest<T>(path, options, false);
  }
  return parseResponse(response) as Promise<T>;
}

export function apiUpload<T>(path: string, form: FormData, onProgress?: (percent: number) => void, retry = true): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${API_URL}${path}`);
    request.withCredentials = true;
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () => reject(new ApiError(0, "تعذر الاتصال بالخادم أثناء رفع الملفات"));
    request.onload = async () => {
      let data: Record<string, unknown> = {};
      try { data = request.responseText ? JSON.parse(request.responseText) : {}; } catch { /* non-JSON response */ }
      if (request.status === 401 && retry) {
        try {
          const refreshed = await fetch(`${API_URL}/auth/refresh`, { method: "POST", credentials: "include" });
          if (refreshed.ok) { resolve(await apiUpload<T>(path, form, onProgress, false)); return; }
        } catch { /* handled below */ }
      }
      if (request.status >= 200 && request.status < 300) { onProgress?.(100); resolve(data as T); return; }
      const rawMessage = data.message;
      const message = Array.isArray(rawMessage) ? String(rawMessage[0] || "") : String(rawMessage || "");
      reject(new ApiError(request.status, message || "تعذر رفع المرفقات"));
    };
    request.send(form);
  });
}
