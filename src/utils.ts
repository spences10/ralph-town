// ANSI escape codes for terminal formatting
export const ESC = '\x1b[';
export const BOLD = `${ESC}1m`;
export const ITALIC = `${ESC}3m`;
export const DIM = `${ESC}2m`;
export const RESET = `${ESC}0m`;
export const GREEN = `${ESC}32m`;
export const CYAN = `${ESC}36m`;
export const YELLOW = `${ESC}33m`;
export const RED = `${ESC}31m`;

/**
 * Render markdown-like syntax to terminal formatting
 */
export function renderMarkdown(text: string, color?: string): string {
  const colorCode = color ?? RESET;

  // Bold: **text**
  let result = text.replace(/\*\*(.+?)\*\*/g, `${BOLD}$1${RESET}${colorCode}`);

  // Italic: *text* (but not if it's part of **)
  result = result.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, `${ITALIC}$1${RESET}${colorCode}`);

  // Code: `text`
  result = result.replace(/`(.+?)`/g, `${DIM}$1${RESET}${colorCode}`);

  return result;
}

/**
 * Print formatted output with role prefix
 */
export function printMessage(role: 'pm' | 'dev' | 'system', message: string): void {
  const prefix = {
    pm: `${GREEN}[Project Manager]${RESET}`,
    dev: `${CYAN}[Developer Agent]${RESET}`,
    system: `${YELLOW}[System]${RESET}`,
  };

  console.log(`${prefix[role]} ${renderMarkdown(message)}`);
}

/**
 * Print error message
 */
export function printError(message: string): void {
  console.error(`${RED}[Error]${RESET} ${message}`);
}

/**
 * Extract developer tasks from PM response
 */
export function extractDeveloperTasks(text: string): string[] {
  const taskRegex = /<developer_task>([\s\S]*?)<\/developer_task>/g;
  const tasks: string[] = [];
  let match;

  while ((match = taskRegex.exec(text)) !== null) {
    tasks.push(match[1].trim());
  }

  return tasks;
}

/**
 * Check if PM response indicates task completion
 */
export function isTaskComplete(text: string): boolean {
  return text.includes('TASK_COMPLETE');
}
