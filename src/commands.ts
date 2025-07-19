import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Storage } from './storage';
import { Medication } from './types';
import crypto from 'crypto';

export class CommandHandler {
  private storage: Storage;
  private authorizedUsers: string[];

  constructor(storage: Storage, authorizedUsers: string[]) {
    this.storage = storage;
    this.authorizedUsers = authorizedUsers;
  }

  getCommands() {
    return [
      new SlashCommandBuilder()
        .setName('medication')
        .setDescription('Manage your medications')
        .addSubcommand(subcommand =>
          subcommand
            .setName('add')
            .setDescription('Add a new medication')
            .addStringOption(option =>
              option.setName('name')
                .setDescription('Name of the medication')
                .setRequired(true))
            .addNumberOption(option =>
              option.setName('dose')
                .setDescription('Dose in mg')
                .setRequired(true))
            .addIntegerOption(option =>
              option.setName('amount')
                .setDescription('Number of pills/injections')
                .setRequired(true))
            .addStringOption(option =>
              option.setName('time')
                .setDescription('Time to take (HH:MM format, UK time)')
                .setRequired(true))
            .addStringOption(option =>
              option.setName('type')
                .setDescription('Type of medication')
                .setRequired(true)
                .addChoices(
                  { name: 'Pill', value: 'pill' },
                  { name: 'Injection', value: 'injection' }
                )))
        .addSubcommand(subcommand =>
          subcommand
            .setName('remove')
            .setDescription('Remove a medication')
            .addStringOption(option =>
              option.setName('name')
                .setDescription('Name of the medication to remove')
                .setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('list')
            .setDescription('List all your medications'))
    ];
  }

  async handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!this.authorizedUsers.includes(interaction.user.id)) {
      await interaction.reply({ content: 'You are not authorized to use this bot.', ephemeral: true });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'add':
        await this.handleAddMedication(interaction);
        break;
      case 'remove':
        await this.handleRemoveMedication(interaction);
        break;
      case 'list':
        await this.handleListMedications(interaction);
        break;
    }
  }

  private async handleAddMedication(interaction: ChatInputCommandInteraction): Promise<void> {
    const name = interaction.options.getString('name', true);
    const dose = interaction.options.getNumber('dose', true);
    const amount = interaction.options.getInteger('amount', true);
    const time = interaction.options.getString('time', true);
    const type = interaction.options.getString('type', true) as 'pill' | 'injection';

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      await interaction.reply({ content: 'Invalid time format. Please use HH:MM format.', ephemeral: true });
      return;
    }

    const medication: Medication = {
      id: crypto.createHash('sha256').update(`${name}-${interaction.user.id}-${Date.now()}`).digest('hex').substring(0, 16),
      name,
      dose,
      amount,
      time,
      type,
      userId: interaction.user.id
    };

    this.storage.addMedication(medication);

    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('✅ Medication Added')
      .addFields(
        { name: 'Name', value: name, inline: true },
        { name: 'Dose', value: `${dose}mg`, inline: true },
        { name: 'Amount', value: `${amount} ${type}(s)`, inline: true },
        { name: 'Time', value: time, inline: true },
        { name: 'Type', value: type.charAt(0).toUpperCase() + type.slice(1), inline: true }
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  private async handleRemoveMedication(interaction: ChatInputCommandInteraction): Promise<void> {
    const name = interaction.options.getString('name', true);
    const userMedications = this.storage.getUserMedications(interaction.user.id);
    const medication = userMedications.find(med => med.name.toLowerCase() === name.toLowerCase());

    if (!medication) {
      await interaction.reply({ content: `No medication found with the name "${name}".`, ephemeral: true });
      return;
    }

    const success = this.storage.removeMedication(medication.id);

    if (success) {
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('🗑️ Medication Removed')
        .setDescription(`Successfully removed "${medication.name}" from your medications.`);

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else {
      await interaction.reply({ content: 'Failed to remove medication. Please try again.', ephemeral: true });
    }
  }

  private async handleListMedications(interaction: ChatInputCommandInteraction): Promise<void> {
    const userMedications = this.storage.getUserMedications(interaction.user.id);

    if (userMedications.length === 0) {
      await interaction.reply({ content: 'You have no medications registered.', ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('💊 Your Medications')
      .setDescription(`You have ${userMedications.length} medication(s) registered:`);

    userMedications.forEach((med, index) => {
      embed.addFields({
        name: `${index + 1}. ${med.name}`,
        value: `**Dose:** ${med.dose}mg\n**Amount:** ${med.amount} ${med.type}(s)\n**Time:** ${med.time}\n**Type:** ${med.type.charAt(0).toUpperCase() + med.type.slice(1)}`,
        inline: true
      });
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}