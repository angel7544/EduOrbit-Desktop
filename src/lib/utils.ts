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

  function parseInline(inlineText: string): string {
    let html = inlineText;
    
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');

    // Inline code
    html = html.replace(/`([^`\n]+)`/g, (_, code) => {
      const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono text-xs border border-gray-200 dark:border-gray-700 text-primary">${escaped}</code>`;
    });

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline font-semibold" target="_blank" rel="noopener noreferrer">$1</a>');

    return html;
  }

  // Normalize line endings
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  
  let result: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let hasPendingEmptyLine = false;
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Handle code blocks
    if (trimmed.startsWith('```')) {
      if (listType) {
        result.push(`</${listType}>`);
        listType = null;
      }
      if (inCodeBlock) {
        result.push('</pre>');
        inCodeBlock = false;
      } else {
        result.push('<pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto my-3 font-mono text-xs border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200">');
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      // Escape HTML tags in code blocks
      const escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      result.push(escaped);
      continue;
    }

    // Check if empty line
    if (trimmed === '') {
      if (listType) {
        hasPendingEmptyLine = true;
      } else {
        result.push('<br />');
      }
      continue;
    }

    // Check for Horizontal Rule: ---, ***, ___
    if (/^\s*([-*_])\1\1+\s*$/.test(line)) {
      if (listType) {
        result.push(`</${listType}>`);
        listType = null;
      }
      hasPendingEmptyLine = false;
      result.push('<hr class="my-4 border-t border-gray-200 dark:border-gray-700" />');
      continue;
    }

    // Check for Headings (up to h6)
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      if (listType) {
        result.push(`</${listType}>`);
        listType = null;
      }
      hasPendingEmptyLine = false;
      const level = headingMatch[1].length;
      const headingText = parseInline(headingMatch[2]);
      
      if (level === 1) {
        result.push(`<h1 class="text-2xl font-black mt-6 mb-3 pb-1 border-b-2 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-50">${headingText}</h1>`);
      } else if (level === 2) {
        result.push(`<h2 class="text-xl font-black mt-5 mb-2.5 pb-1 border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-50">${headingText}</h2>`);
      } else if (level === 3) {
        result.push(`<h3 class="text-lg font-extrabold mt-4 mb-2 text-gray-900 dark:text-gray-50">${headingText}</h3>`);
      } else if (level === 4) {
        result.push(`<h4 class="text-base font-extrabold mt-3 mb-1.5 text-gray-900 dark:text-gray-50">${headingText}</h4>`);
      } else if (level === 5) {
        result.push(`<h5 class="text-sm font-bold mt-2 mb-1 text-gray-900 dark:text-gray-50">${headingText}</h5>`);
      } else {
        result.push(`<h6 class="text-xs font-bold mt-2 mb-1 text-gray-500 dark:text-gray-400">${headingText}</h6>`);
      }
      continue;
    }

    // Check for Blockquotes
    const quoteMatch = line.match(/^\s*>\s*(.*)$/);
    if (quoteMatch) {
      if (listType) {
        result.push(`</${listType}>`);
        listType = null;
      }
      hasPendingEmptyLine = false;
      const quoteText = parseInline(quoteMatch[1]);
      result.push(`<blockquote class="border-l-4 border-primary pl-4 py-1 my-3 text-gray-600 dark:text-gray-300 italic bg-primary/5 rounded-r">${quoteText}</blockquote>`);
      continue;
    }

    // Check for Bullet Lists
    const bulletMatch = line.match(/^\s*[-*+]\s+(.*)$/);
    if (bulletMatch) {
      const content = parseInline(bulletMatch[1]);
      if (listType !== 'ul') {
        if (listType) {
          result.push(`</${listType}>`);
        }
        result.push('<ul class="list-disc pl-5 my-3 flex flex-col gap-1 text-gray-800 dark:text-gray-200">');
        listType = 'ul';
      }
      const itemClass = hasPendingEmptyLine ? ' class="mt-2"' : '';
      result.push(`<li${itemClass}>${content}</li>`);
      hasPendingEmptyLine = false;
      continue;
    }

    // Check for Ordered Lists
    const orderedMatch = line.match(/^\s*(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      const content = parseInline(orderedMatch[2]);
      if (listType !== 'ol') {
        if (listType) {
          result.push(`</${listType}>`);
        }
        result.push('<ol class="list-decimal pl-5 my-3 flex flex-col gap-1 text-gray-800 dark:text-gray-200">');
        listType = 'ol';
      }
      const itemClass = hasPendingEmptyLine ? ' class="mt-2"' : '';
      result.push(`<li${itemClass}>${content}</li>`);
      hasPendingEmptyLine = false;
      continue;
    }

    // Normal Text Paragraph Line
    if (listType) {
      result.push(`</${listType}>`);
      listType = null;
    }
    if (hasPendingEmptyLine) {
      result.push('<br />');
      hasPendingEmptyLine = false;
    }
    result.push(parseInline(line));
  }

  if (listType) {
    result.push(`</${listType}>`);
  }

  return result.join('\n');
}

