import cron from 'node-cron';
import { Client, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, User } from 'discord.js';
import { Storage } from './storage';
import { Medication } from './types';
import crypto from 'crypto';

export class MedicationScheduler {
  private client: Client;
  private storage: Storage;
  private authorizedUsers: string[];
  private activeReminders: Map<string, NodeJS.Timeout> = new Map();

  constructor(client: Client, storage: Storage, authorizedUsers: string[]) {
    this.client = client;
    this.storage = storage;
    this.authorizedUsers = authorizedUsers;
    this.startScheduler();
  }

  private startScheduler(): void {
    // Check every minute for medications to remind about
    cron.schedule('* * * * *', () => {
      this.checkMedications();
    }, {
      timezone: 'Europe/London'
    });
  }

  private checkMedications(): void {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const today = now.toDateString();

    const medications = this.storage.getMedications();

    for (const medication of medications) {
      if (medication.time === currentTime && 
          (!medication.lastTaken || new Date(medication.lastTaken).toDateString() !== today) &&
          !medication.skippedToday &&
          !medication.activeReminder) {
        this.sendMedicationReminder(medication);
      }
    }

    // Reset skippedToday at midnight
    if (currentTime === '00:00') {
      medications.forEach(med => {
        if (med.skippedToday) {
          this.storage.updateMedication(med.id, { skippedToday: false });
        }
      });
    }
  }

  private async sendMedicationReminder(medication: Medication): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor('#da27e6')
      .setTitle('💊 Medication Reminder')
      .addFields(
        { name: 'Medication', value: medication.name, inline: true },
        { name: 'Dose', value: `${medication.dose}mg`, inline: true },
        { name: 'Amount', value: `${medication.amount} ${medication.type}(s)`, inline: true },
        { name: 'Time', value: medication.time, inline: true },
        { name: 'Type', value: medication.type.charAt(0).toUpperCase() + medication.type.slice(1), inline: true }
      )
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`taken_${medication.id}`)
          .setLabel('Taken')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`skip_${medication.id}`)
          .setLabel('Skip For Today')
          .setStyle(ButtonStyle.Secondary)
      );

    // Send to all authorized users
    for (const userId of this.authorizedUsers) {
      try {
        const user = await this.client.users.fetch(userId);
        const message = await user.send({ embeds: [embed], components: [row] });
        
        // Store the message ID for this medication
        this.storage.updateMedication(medication.id, { activeReminder: message.id });

        // Set up 1-hour follow-up reminder
        const timeoutId = setTimeout(() => {
          this.sendFollowUpReminder(medication, user);
        }, 60 * 60 * 1000); // 1 hour

        this.activeReminders.set(medication.id, timeoutId);

      } catch (error) {
        console.error(`Failed to send reminder to user ${userId}:`, error);
      }
    }
  }

  private async sendFollowUpReminder(medication: Medication, user: User): Promise<void> {
    // Check if medication was already taken or skipped
    const currentMed = this.storage.getMedications().find(med => med.id === medication.id);
    if (!currentMed?.activeReminder) return;

    try {
      await user.send(`⌚ Reminder to take your ${medication.name}`);
    } catch (error) {
      console.error(`Failed to send follow-up reminder:`, error);
    }
  }

  handleReminderResponse(medicationId: string, action: 'taken' | 'skip'): void {
    const medication = this.storage.getMedications().find(med => med.id === medicationId);
    if (!medication) return;

    // Clear the active reminder timeout
    const timeoutId = this.activeReminders.get(medicationId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.activeReminders.delete(medicationId);
    }

    if (action === 'taken') {
      this.storage.updateMedication(medicationId, { 
        lastTaken: new Date().toISOString(),
        activeReminder: undefined,
        skippedToday: false
      });
    } else if (action === 'skip') {
      this.storage.updateMedication(medicationId, { 
        skippedToday: true,
        activeReminder: undefined
      });
    }
  }
}