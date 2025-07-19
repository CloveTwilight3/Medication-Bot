import { Client, GatewayIntentBits, Events, REST, Routes, EmbedBuilder } from 'discord.js';
import { Storage } from './storage';
import { CommandHandler } from './commands';
import { MedicationScheduler } from './scheduler';

// Load environment variables
require('dotenv').config();

const token = process.env.DISCORD_TOKEN!;
const clientId = process.env.CLIENT_ID!;
const authorizedUsers = JSON.parse(process.env.AUTHORIZED_USERS || '[]');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages]
});

const storage = new Storage();
const commandHandler = new CommandHandler(storage, authorizedUsers);
let scheduler: MedicationScheduler;

client.once(Events.ClientReady, async () => {
  console.log(`Ready! Logged in as ${client.user?.tag}`);
  
  // Register commands
  const rest = new REST().setToken(token);
  const commands = commandHandler.getCommands().map(command => command.toJSON());

  try {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('Successfully registered application commands.');
  } catch (error) {
    console.error('Error registering commands:', error);
  }

  // Initialize scheduler
  scheduler = new MedicationScheduler(client, storage, authorizedUsers);
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
    await commandHandler.handleCommand(interaction);
  } else if (interaction.isButton()) {
    const [action, medicationId] = interaction.customId.split('_');
    
    if (action === 'taken' || action === 'skip') {
      scheduler.handleReminderResponse(medicationId, action as 'taken' | 'skip');
      
      // Update the message to show the action taken
      const color = action === 'taken' ? '#00ff00' : '#808080';
      const title = action === 'taken' ? '✅ Medication Taken' : '⏭️ Skipped for Today';
      
      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription('Reminder updated successfully!')
        .setTimestamp();

      await interaction.update({ embeds: [embed], components: [] });
    }
  }
});

client.login(token);