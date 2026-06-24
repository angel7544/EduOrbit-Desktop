import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const API_URL = (import.meta as any).env?.VITE_API_URL || (import.meta as any).env?.EXPO_PUBLIC_API_URL || "http://127.0.0.1:3000/api/";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function currencyFormater(num: number) {
  try {
    return new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch (e) {
    return num.toString();
  }
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0m";
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export async function updateTheField<T>(
  values: T,
  path: string,
  type: "PATCH" | "PUT" | "POST" | "DELETE" = "PATCH",
  isChapter = false
) {
  const fullPath = `${API_URL}${path}`.replace(/([^:]\/)\/+/g, "$1");
  try {
    const options: RequestInit = {
      method: type,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (type !== "DELETE") {
      options.body = JSON.stringify(values);
    }

    const res = await fetch(fullPath, options);

    let data: any = null;
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!res.ok) {
      const message =
        (data && (data.message || data.error || data.detail)) ||
        "Something went wrong";
      throw new Error(message);
    }

    return data;
  } catch (error: any) {
    const message =
      typeof error?.message === "string"
        ? error.message
        : "An unexpected error occurred";
    throw new Error(message);
  }
}

export async function generatePasswordsAndSendMails<T>(
  values: T,
  path: string,
  type: "PATCH" | "PUT" | "POST" | "DELETE"
) {
  return updateTheField(values, path, type);
}

export async function enrollTheUsersAndSendMail<T>(
  values: T,
  path: string,
  type: "PATCH" | "PUT" | "POST" | "DELETE"
) {
  return updateTheField(values, path, type);
}
