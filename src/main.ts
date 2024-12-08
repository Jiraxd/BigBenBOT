import { Client, Events, ActivityType, GatewayIntentBits } from "discord.js";
import { config } from "./config";
import { CommandManager } from "./managers/cmd.manager";
import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  getVoiceConnection,
  joinVoiceChannel,
  StreamType,
  VoiceConnectionStatus,
} from "@discordjs/voice";
import path from "path";

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
});

const commandManager = new CommandManager();

let lastJoin = new Date(Date.now());

client.once(Events.ClientReady, async (ctx) => {
  console.log(`${client.user?.username} is ready!`);
  commandManager.registerCommands();
  commandManager.deployCommands();
  client.user?.setActivity("BLUD", { type: ActivityType.Listening });
  setInterval(async () => announceNewHour, 1000);
});

client.on(Events.InteractionCreate, (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  commandManager.executeCommand(interaction);
});

client.login(config.DISCORD_TOKEN);

function announceNewHour() {
  if (lastJoin.getHours() === new Date(Date.now()).getHours()) return;
  lastJoin = new Date(Date.now());
  const existingConnection = getVoiceConnection(config.DEFAULT_VOICE);
  if (existingConnection) {
    existingConnection.destroy();
  }

  const adapter = client.guilds.cache.get(config.GUILD_ID)?.voiceAdapterCreator;
  if (!adapter) {
    return;
  }
  const connection = joinVoiceChannel({
    channelId: config.DEFAULT_VOICE,
    guildId: config.GUILD_ID,
    adapterCreator: adapter,
  });

  connection.on(VoiceConnectionStatus.Ready, () => {
    console.log("The bot has connected to the channel!");
  });

  try {
    const filePath = path.join(__dirname, "/bigben.mp3");
    const player = createAudioPlayer();

    let playCount = 0;
    const maxPlays = 3;

    const playAudio = () => {
      const resource = createAudioResource(filePath, {
        inputType: StreamType.Arbitrary,
      });
      resource.volume?.setVolume(0.5);
      player.play(resource);
    };

    player.on(AudioPlayerStatus.Idle, () => {
      playCount++;
      if (playCount < maxPlays) {
        playAudio();
      } else {
        connection.destroy();
      }
    });

    playAudio();
    connection.subscribe(player);
    console.log("Playing sound");
  } catch (error) {
    console.error(error);
  }
}
