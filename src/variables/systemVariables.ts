import { SystemVariable } from './SystemVariable';
import { VariableContext } from './IVariable';
import { getYear, getMonth, getDay, formatDate } from '../utils/dateUtils';

export class YearVariable extends SystemVariable {
  constructor() {
    super('YEAR', 'Current year in YYYY format');
  }

  resolve(context: VariableContext): string {
    return getYear(context.date);
  }
}

export class MonthVariable extends SystemVariable {
  constructor() {
    super('MONTH', 'Current month in MM format');
  }

  resolve(context: VariableContext): string {
    return getMonth(context.date);
  }
}

export class DayVariable extends SystemVariable {
  constructor() {
    super('DAY', 'Current day in DD format');
  }

  resolve(context: VariableContext): string {
    return getDay(context.date);
  }
}

export class DateVariable extends SystemVariable {
  constructor() {
    super('DATE', 'Current date in YYYY-MM-DD format');
  }

  resolve(context: VariableContext): string {
    return formatDate(context.date);
  }
}

export class TimeVariable extends SystemVariable {
  constructor() {
    super('TIME', 'Current time in HH:mm:ss format');
  }

  resolve(context: VariableContext): string {
    const hours = context.date.getHours().toString().padStart(2, '0');
    const minutes = context.date.getMinutes().toString().padStart(2, '0');
    const seconds = context.date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }
}

export class DateTimeVariable extends SystemVariable {
  constructor() {
    super('DATETIME', 'Current date and time in YYYY-MM-DD HH:mm:ss format');
  }

  resolve(context: VariableContext): string {
    const dateStr = formatDate(context.date);
    const hours = context.date.getHours().toString().padStart(2, '0');
    const minutes = context.date.getMinutes().toString().padStart(2, '0');
    const seconds = context.date.getSeconds().toString().padStart(2, '0');
    return `${dateStr} ${hours}:${minutes}:${seconds}`;
  }
}

export class TimestampVariable extends SystemVariable {
  constructor() {
    super('TIMESTAMP', 'Unix timestamp in milliseconds');
  }

  resolve(context: VariableContext): string {
    return context.date.getTime().toString();
  }
}

export class TitleVariable extends SystemVariable {
  constructor() {
    super('TITLE', 'Memo title');
  }

  async resolve(context: VariableContext): Promise<string> {
    // Check if title was provided in userInputs
    if (context.userInputs?.['TITLE']) {
      return context.userInputs['TITLE'];
    }

    // If workspaceService is available, prompt for input
    if (context.workspaceService) {
      const input = await context.workspaceService.showInputBox({
        prompt: 'Enter memo title',
        placeHolder: 'My memo title'
      });
      if (input) {
        return input;
      }
    }

    // Fallback to date
    return formatDate(context.date);
  }
}