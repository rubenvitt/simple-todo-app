/**
 * Content Formatters for Shareable Content
 * 
 * Provides various formatting utilities for sharing tasks, lists, and other
 * content in different formats (text, markdown, JSON, CSV, etc.)
 */

import { Task } from '../types';

// Base interfaces for shareable content
export interface ShareableTask {
  id: string;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'todo' | 'in_progress' | 'done' | 'backlog';
  dueDate?: Date | string;
  assignee?: {
    id: string;
    name: string;
    email?: string;
  };
  tags?: string[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ShareableList {
  id: string;
  name: string;
  description?: string;
  tasks?: ShareableTask[];
  owner?: {
    id: string;
    name: string;
    email?: string;
  };
  collaborators?: Array<{
    id: string;
    name: string;
    role: 'viewer' | 'editor' | 'owner';
  }>;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface FormattingOptions {
  includeMetadata?: boolean;
  includeTimestamps?: boolean;
  includeCollaborators?: boolean;
  maxLength?: number;
  template?: 'minimal' | 'detailed' | 'professional';
  dateFormat?: 'short' | 'long' | 'iso';
  includeEmojis?: boolean;
  includeProgress?: boolean;
}

// Priority and status emojis
const PRIORITY_EMOJIS = {
  low: '🟢',
  medium: '🟡', 
  high: '🔴'
};

const STATUS_EMOJIS = {
  todo: '⭕',
  backlog: '📋',
  in_progress: '🔄',
  done: '✅'
};

/**
 * Format date consistently across all formatters
 */
export function formatDate(date: Date | string, format: 'short' | 'long' | 'iso' = 'short'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  switch (format) {
    case 'iso':
      return dateObj.toISOString();
    case 'long':
      return dateObj.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    case 'short':
    default:
      return dateObj.toLocaleDateString();
  }
}

/**
 * Calculate task completion statistics
 */
export function getTaskStats(tasks: ShareableTask[]): {
  total: number;
  completed: number;
  inProgress: number;
  todo: number;
  overdue: number;
  percentage: number;
} {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'done').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const todo = tasks.filter(t => t.status === 'todo' || t.status === 'backlog').length;
  
  const now = new Date();
  const overdue = tasks.filter(t => {
    if (t.status === 'done' || !t.dueDate) return false;
    const dueDate = typeof t.dueDate === 'string' ? new Date(t.dueDate) : t.dueDate;
    return dueDate < now;
  }).length;
  
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  return { total, completed, inProgress, todo, overdue, percentage };
}

/**
 * Text Formatter - Human-readable plain text
 */
export class TextFormatter {
  static formatTask(task: ShareableTask, options: FormattingOptions = {}): string {
    const {
      includeMetadata = true,
      includeTimestamps = false,
      template = 'detailed',
      dateFormat = 'short',
      includeEmojis = true
    } = options;

    let text = '';

    // Title with status emoji
    if (includeEmojis && task.status && STATUS_EMOJIS[task.status]) {
      text += `${STATUS_EMOJIS[task.status]} ${task.title}`;
    } else {
      text += task.title;
    }

    // Priority
    if (includeEmojis && task.priority && PRIORITY_EMOJIS[task.priority]) {
      text += ` ${PRIORITY_EMOJIS[task.priority]}`;
    } else if (task.priority && template !== 'minimal') {
      text += ` [${task.priority.toUpperCase()}]`;
    }

    text += '\n';

    // Description
    if (task.description && template !== 'minimal') {
      text += `Description: ${task.description}\n`;
    }

    // Metadata
    if (includeMetadata && template !== 'minimal') {
      if (task.status) {
        text += `Status: ${task.status.replace('_', ' ')}\n`;
      }
      
      if (task.dueDate) {
        text += `Due: ${formatDate(task.dueDate, dateFormat)}\n`;
      }
      
      if (task.assignee) {
        text += `Assigned to: ${task.assignee.name}\n`;
      }
      
      if (task.tags && task.tags.length > 0) {
        text += `Tags: ${task.tags.join(', ')}\n`;
      }
    }

    // Timestamps
    if (includeTimestamps && (task.createdAt || task.updatedAt)) {
      text += '\n';
      if (task.createdAt) {
        text += `Created: ${formatDate(task.createdAt, dateFormat)}\n`;
      }
      if (task.updatedAt) {
        text += `Updated: ${formatDate(task.updatedAt, dateFormat)}\n`;
      }
    }

    return text.trim();
  }

  static formatList(list: ShareableList, options: FormattingOptions = {}): string {
    const {
      includeMetadata = true,
      includeTimestamps = false,
      includeCollaborators = false,
      template = 'detailed',
      dateFormat = 'short',
      includeEmojis = true,
      includeProgress = true
    } = options;

    let text = '';

    // Header
    text += `${list.name}\n`;
    text += '='.repeat(list.name.length) + '\n\n';

    // Description
    if (list.description) {
      text += `${list.description}\n\n`;
    }

    // Progress stats
    if (includeProgress && list.tasks && list.tasks.length > 0) {
      const stats = getTaskStats(list.tasks);
      
      if (includeEmojis) {
        text += `📊 Progress: ${stats.completed}/${stats.total} tasks completed (${stats.percentage}%)\n`;
        
        if (stats.overdue > 0) {
          text += `⚠️ ${stats.overdue} overdue tasks\n`;
        }
      } else {
        text += `Progress: ${stats.completed}/${stats.total} tasks completed (${stats.percentage}%)\n`;
        
        if (stats.overdue > 0) {
          text += `Warning: ${stats.overdue} overdue tasks\n`;
        }
      }
      
      text += '\n';
    }

    // Tasks
    if (list.tasks && list.tasks.length > 0) {
      text += 'Tasks:\n';
      text += '------\n';
      
      list.tasks.forEach((task, index) => {
        const taskText = this.formatTask(task, { ...options, template: 'minimal' });
        text += `${index + 1}. ${taskText}\n`;
      });
      
      text += '\n';
    }

    // Metadata
    if (includeMetadata && template !== 'minimal') {
      if (list.owner) {
        text += `Owner: ${list.owner.name}\n`;
      }
      
      if (includeCollaborators && list.collaborators && list.collaborators.length > 0) {
        text += `Collaborators: ${list.collaborators.map(c => `${c.name} (${c.role})`).join(', ')}\n`;
      }
    }

    // Timestamps
    if (includeTimestamps && (list.createdAt || list.updatedAt)) {
      text += '\n';
      if (list.createdAt) {
        text += `Created: ${formatDate(list.createdAt, dateFormat)}\n`;
      }
      if (list.updatedAt) {
        text += `Updated: ${formatDate(list.updatedAt, dateFormat)}\n`;
      }
    }

    return text.trim();
  }
}

/**
 * Markdown Formatter - GitHub-compatible markdown
 */
export class MarkdownFormatter {
  static formatTask(task: ShareableTask, options: FormattingOptions = {}): string {
    const {
      includeMetadata = true,
      includeTimestamps = false,
      template = 'detailed',
      dateFormat = 'short'
    } = options;

    let md = '';

    // Title with checkbox
    const checkbox = task.status === 'done' ? '[x]' : '[ ]';
    md += `- ${checkbox} **${task.title}**`;

    // Priority badge
    if (task.priority) {
      const priorityColors = {
        low: 'green',
        medium: 'yellow',
        high: 'red'
      };
      md += ` ![${task.priority}](https://img.shields.io/badge/priority-${task.priority}-${priorityColors[task.priority]})`;
    }

    md += '\n';

    // Description
    if (task.description && template !== 'minimal') {
      md += `  > ${task.description}\n`;
    }

    // Metadata table
    if (includeMetadata && template !== 'minimal') {
      const metadata: string[] = [];
      
      if (task.status) {
        metadata.push(`**Status:** ${task.status.replace('_', ' ')}`);
      }
      
      if (task.dueDate) {
        metadata.push(`**Due:** ${formatDate(task.dueDate, dateFormat)}`);
      }
      
      if (task.assignee) {
        metadata.push(`**Assignee:** ${task.assignee.name}`);
      }
      
      if (task.tags && task.tags.length > 0) {
        const tagBadges = task.tags.map(tag => `\`${tag}\``).join(' ');
        metadata.push(`**Tags:** ${tagBadges}`);
      }
      
      if (metadata.length > 0) {
        md += '  \n  ' + metadata.join(' | ') + '\n';
      }
    }

    // Timestamps
    if (includeTimestamps && (task.createdAt || task.updatedAt)) {
      md += '  \n';
      if (task.createdAt) {
        md += `  *Created: ${formatDate(task.createdAt, dateFormat)}*\n`;
      }
      if (task.updatedAt) {
        md += `  *Updated: ${formatDate(task.updatedAt, dateFormat)}*\n`;
      }
    }

    return md;
  }

  static formatList(list: ShareableList, options: FormattingOptions = {}): string {
    const {
      includeMetadata = true,
      includeTimestamps = false,
      includeCollaborators = false,
      template = 'detailed',
      dateFormat = 'short',
      includeProgress = true
    } = options;

    let md = '';

    // Header
    md += `# ${list.name}\n\n`;

    // Description
    if (list.description) {
      md += `${list.description}\n\n`;
    }

    // Progress section
    if (includeProgress && list.tasks && list.tasks.length > 0) {
      const stats = getTaskStats(list.tasks);
      
      md += '## 📊 Progress\n\n';
      md += `![Progress](https://img.shields.io/badge/progress-${stats.percentage}%25-blue)\n`;
      md += `- **Total tasks:** ${stats.total}\n`;
      md += `- **Completed:** ${stats.completed}\n`;
      md += `- **In progress:** ${stats.inProgress}\n`;
      md += `- **Todo:** ${stats.todo}\n`;
      
      if (stats.overdue > 0) {
        md += `- **⚠️ Overdue:** ${stats.overdue}\n`;
      }
      
      md += '\n';
    }

    // Tasks section
    if (list.tasks && list.tasks.length > 0) {
      md += '## 📋 Tasks\n\n';
      
      list.tasks.forEach(task => {
        md += this.formatTask(task, { ...options, template: 'minimal' });
        md += '\n';
      });
      
      md += '\n';
    }

    // Metadata section
    if (includeMetadata && template !== 'minimal') {
      md += '## ℹ️ Information\n\n';
      
      if (list.owner) {
        md += `- **Owner:** ${list.owner.name}\n`;
      }
      
      if (includeCollaborators && list.collaborators && list.collaborators.length > 0) {
        md += `- **Collaborators:**\n`;
        list.collaborators.forEach(collab => {
          md += `  - ${collab.name} (${collab.role})\n`;
        });
      }
      
      if (includeTimestamps && (list.createdAt || list.updatedAt)) {
        if (list.createdAt) {
          md += `- **Created:** ${formatDate(list.createdAt, dateFormat)}\n`;
        }
        if (list.updatedAt) {
          md += `- **Updated:** ${formatDate(list.updatedAt, dateFormat)}\n`;
        }
      }
      
      md += '\n';
    }

    return md.trim();
  }
}

/**
 * CSV Formatter - Spreadsheet-compatible format
 */
export class CSVFormatter {
  private static escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  static formatTasks(tasks: ShareableTask[], options: FormattingOptions = {}): string {
    const {
      includeMetadata = true,
      includeTimestamps = false,
      dateFormat = 'iso'
    } = options;

    // Headers
    const headers = ['Title', 'Description', 'Status', 'Priority'];
    
    if (includeMetadata) {
      headers.push('Due Date', 'Assignee', 'Tags');
    }
    
    if (includeTimestamps) {
      headers.push('Created', 'Updated');
    }

    let csv = headers.join(',') + '\n';

    // Rows
    tasks.forEach(task => {
      const row: string[] = [
        this.escapeCSV(task.title),
        this.escapeCSV(task.description || ''),
        this.escapeCSV(task.status || ''),
        this.escapeCSV(task.priority || '')
      ];

      if (includeMetadata) {
        row.push(
          task.dueDate ? formatDate(task.dueDate, dateFormat) : '',
          this.escapeCSV(task.assignee?.name || ''),
          this.escapeCSV(task.tags?.join('; ') || '')
        );
      }

      if (includeTimestamps) {
        row.push(
          task.createdAt ? formatDate(task.createdAt, dateFormat) : '',
          task.updatedAt ? formatDate(task.updatedAt, dateFormat) : ''
        );
      }

      csv += row.join(',') + '\n';
    });

    return csv;
  }

  static formatList(list: ShareableList, options: FormattingOptions = {}): string {
    if (!list.tasks || list.tasks.length === 0) {
      return 'No tasks found\n';
    }

    // Add list metadata as comments
    let csv = `# List: ${list.name}\n`;
    if (list.description) {
      csv += `# Description: ${list.description}\n`;
    }
    
    const stats = getTaskStats(list.tasks);
    csv += `# Progress: ${stats.completed}/${stats.total} completed (${stats.percentage}%)\n`;
    csv += '\n';

    // Tasks CSV
    csv += this.formatTasks(list.tasks, options);

    return csv;
  }
}

/**
 * JSON Formatter - Structured data format
 */
export class JSONFormatter {
  static formatTask(task: ShareableTask, options: FormattingOptions = {}): string {
    const {
      includeMetadata = true,
      includeTimestamps = false
    } = options;

    const output: any = {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority
    };

    if (includeMetadata) {
      if (task.dueDate) output.dueDate = task.dueDate;
      if (task.assignee) output.assignee = task.assignee;
      if (task.tags) output.tags = task.tags;
    }

    if (includeTimestamps) {
      if (task.createdAt) output.createdAt = task.createdAt;
      if (task.updatedAt) output.updatedAt = task.updatedAt;
    }

    return JSON.stringify(output, null, 2);
  }

  static formatList(list: ShareableList, options: FormattingOptions = {}): string {
    const {
      includeMetadata = true,
      includeTimestamps = false,
      includeCollaborators = false,
      includeProgress = true
    } = options;

    const output: any = {
      id: list.id,
      name: list.name,
      description: list.description
    };

    if (list.tasks) {
      output.tasks = list.tasks.map(task => JSON.parse(this.formatTask(task, options)));
    }

    if (includeProgress && list.tasks) {
      output.stats = getTaskStats(list.tasks);
    }

    if (includeMetadata) {
      if (list.owner) output.owner = list.owner;
      if (includeCollaborators && list.collaborators) {
        output.collaborators = list.collaborators;
      }
    }

    if (includeTimestamps) {
      if (list.createdAt) output.createdAt = list.createdAt;
      if (list.updatedAt) output.updatedAt = list.updatedAt;
    }

    return JSON.stringify(output, null, 2);
  }
}

/**
 * Email Formatter - Email-friendly format
 */
export class EmailFormatter {
  static formatTask(task: ShareableTask, options: FormattingOptions = {}): string {
    const {
      template = 'professional',
      dateFormat = 'long',
      includeEmojis = false
    } = options;

    let email = '';

    if (template === 'professional') {
      email += `Subject: Task Assignment - ${task.title}\n\n`;
      email += `Dear Team,\n\n`;
      email += `You have been assigned the following task:\n\n`;
    }

    email += `Task: ${task.title}\n`;
    
    if (task.description) {
      email += `Description: ${task.description}\n`;
    }
    
    if (task.priority) {
      email += `Priority: ${task.priority.toUpperCase()}\n`;
    }
    
    if (task.dueDate) {
      email += `Due Date: ${formatDate(task.dueDate, dateFormat)}\n`;
    }
    
    if (task.assignee) {
      email += `Assigned to: ${task.assignee.name}\n`;
    }

    if (template === 'professional') {
      email += `\nPlease review the task details and let us know if you have any questions.\n\n`;
      email += `Best regards,\nTodo App Team\n`;
    }

    return email;
  }

  static formatList(list: ShareableList, options: FormattingOptions = {}): string {
    const {
      template = 'professional',
      dateFormat = 'long',
      includeProgress = true
    } = options;

    let email = '';

    if (template === 'professional') {
      email += `Subject: Project Update - ${list.name}\n\n`;
      email += `Dear Team,\n\n`;
      email += `Here's an update on the project "${list.name}":\n\n`;
    }

    if (list.description) {
      email += `Project Description: ${list.description}\n\n`;
    }

    if (includeProgress && list.tasks) {
      const stats = getTaskStats(list.tasks);
      email += `Project Status:\n`;
      email += `- Total Tasks: ${stats.total}\n`;
      email += `- Completed: ${stats.completed} (${stats.percentage}%)\n`;
      email += `- In Progress: ${stats.inProgress}\n`;
      email += `- Pending: ${stats.todo}\n`;
      
      if (stats.overdue > 0) {
        email += `- Overdue: ${stats.overdue}\n`;
      }
      
      email += '\n';
    }

    if (list.tasks && list.tasks.length > 0) {
      email += `Task Details:\n`;
      email += `${'-'.repeat(50)}\n`;
      
      list.tasks.forEach((task, index) => {
        email += `${index + 1}. ${task.title}`;
        if (task.status === 'done') {
          email += ' ✓';
        } else if (task.priority === 'high') {
          email += ' [HIGH PRIORITY]';
        }
        email += '\n';
        
        if (task.description) {
          email += `   ${task.description}\n`;
        }
        
        if (task.dueDate) {
          email += `   Due: ${formatDate(task.dueDate, dateFormat)}\n`;
        }
        
        email += '\n';
      });
    }

    if (template === 'professional') {
      email += `Please review and let us know if you have any questions or concerns.\n\n`;
      email += `Best regards,\nProject Management Team\n`;
    }

    return email;
  }
}

// Main formatter factory
export class ContentFormatter {
  static getFormatter(format: 'text' | 'markdown' | 'csv' | 'json' | 'email') {
    switch (format) {
      case 'text':
        return TextFormatter;
      case 'markdown':
        return MarkdownFormatter;
      case 'csv':
        return CSVFormatter;
      case 'json':
        return JSONFormatter;
      case 'email':
        return EmailFormatter;
      default:
        return TextFormatter;
    }
  }

  static formatTask(
    task: ShareableTask,
    format: 'text' | 'markdown' | 'csv' | 'json' | 'email' = 'text',
    options: FormattingOptions = {}
  ): string {
    const formatter = this.getFormatter(format);
    return formatter.formatTask(task, options);
  }

  static formatList(
    list: ShareableList,
    format: 'text' | 'markdown' | 'csv' | 'json' | 'email' = 'text',
    options: FormattingOptions = {}
  ): string {
    const formatter = this.getFormatter(format);
    
    if (format === 'csv') {
      return CSVFormatter.formatList(list, options);
    }
    
    return formatter.formatList(list, options);
  }

  static formatTasks(
    tasks: ShareableTask[],
    format: 'text' | 'markdown' | 'csv' | 'json' | 'email' = 'text',
    options: FormattingOptions = {}
  ): string {
    if (format === 'csv') {
      return CSVFormatter.formatTasks(tasks, options);
    }

    if (format === 'json') {
      return JSON.stringify(tasks.map(task => 
        JSON.parse(JSONFormatter.formatTask(task, options))
      ), null, 2);
    }

    // For other formats, format each task individually
    const formatter = this.getFormatter(format);
    return tasks.map(task => formatter.formatTask(task, options)).join('\n\n');
  }
}

// Export default instances
export const textFormatter = TextFormatter;
export const markdownFormatter = MarkdownFormatter;
export const csvFormatter = CSVFormatter;
export const jsonFormatter = JSONFormatter;
export const emailFormatter = EmailFormatter;
export const contentFormatter = ContentFormatter;