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

/**
 * Strip markdown formatting from a string for plain-text display.
//  * Removes: headings (#), bold/italic (**/
//  */
export function stripMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/#{1,6}\s+/g, '')          // headings
    .replace(/\*\*(.+?)\*\*/g, '$1')    // bold
    .replace(/\*(.+?)\*/g, '$1')        // italic
    .replace(/~~(.+?)~~/g, '$1')        // strikethrough
    .replace(/`(.+?)`/g, '$1')          // inline code
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // links
    .replace(/!\[.*?\]\(.+?\)/g, '')    // images
    .replace(/>\s+/g, '')               // blockquotes
    .replace(/[-*+]\s+/g, '')           // list items
    .replace(/\n{3,}/g, '\n\n')         // extra newlines
    .trim();
}

export async function enrollTheUsersAndSendMail<T>(
  values: T,
  path: string,
  type: "PATCH" | "PUT" | "POST" | "DELETE"
) {
  return updateTheField(values, path, type);
}

export function renderMarkdownAndHTML(text: string): string {
  if (!text) return "";

  let html = text;

  // Code blocks (fenced)
  html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto my-3 font-mono text-xs border border-border">$1</pre>');
  // Inline code
  html = html.replace(/`([^`\n]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono text-xs border border-border text-primary">$1</code>');

  // Headings
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-base font-extrabold mt-4 mb-2 text-text">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-lg font-black mt-5 mb-2.5 pb-1 border-b border-border text-text">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-xl font-black mt-6 mb-3 pb-1 border-b-2 border-border text-text">$1</h1>');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');

  // Blockquotes
  html = html.replace(/^\>\s+(.*)$/gim, '<blockquote class="border-l-4 border-primary pl-4 py-1 my-3 text-textLight italic bg-primary/5">$1</blockquote>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');

  // Bullet Lists
  html = html.replace(/^\s*[-*+]\s+(.*)$/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*?<\/li>)+/gs, '<ul class="list-disc pl-5 my-3 flex flex-col gap-1">$1</ul>');

  // Ordered Lists
  html = html.replace(/^\s*(\d+)\.\s+(.*)$/gim, '<li>$2</li>');
  html = html.replace(/(<li>.*?<\/li>)+/gs, (match) => {
    if (match.includes('list-disc')) return match;
    return `<ol class="list-decimal pl-5 my-3 flex flex-col gap-1">${match}</ol>`;
  });

  // Paragraph breaks for raw newlines that aren't inside HTML blocks
  html = html.replace(/\n/g, '<br />');

  return html;
}
