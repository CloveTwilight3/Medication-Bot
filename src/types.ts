export interface Medication {
  id: string;
  name: string;
  dose: number; // in mg
  amount: number; // number of pills/injections
  time: string; // HH:MM format
  type: 'pill' | 'injection';
  userId: string;
  lastTaken?: string; // ISO date string
  skippedToday?: boolean;
  activeReminder?: string; // message ID of active reminder
}

export interface ReminderData {
  medicationId: string;
  messageId: string;
  timestamp: number;
}