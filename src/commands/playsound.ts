import { CommandInteraction, GuildMember } from "discord.js";
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  StreamType,
  getVoiceConnection,
} from "@discordjs/voice";
import {
  Command,
  CommandParameter,
  CommandParameterType,
} from "../managers/cmd.manager";
import path from "path";

export const body: Command = {
  name: "bigben",
  description: "Play big ben",
  parameters: [
    {
      name: "amount",
      description:
        "The amount of times the bot will play the Big Ben sound (max 10)",
      type: CommandParameterType.NUMBER,
      required: false,
    },
  ],
  execute: async (interaction: CommandInteraction) => {
    const amount = (interaction.options.get("amount")?.value as number) || 1;

    if (amount > 10) {
      await interaction.reply("Maximum amount is 10!");
      return;
    }

    if (!interaction.guild) {
      await interaction.reply("You're not in voice channel");
      return;
    }

    if (!(interaction.member instanceof GuildMember)) {
      await interaction.reply("You're not in voice channel");
      return;
    }

    if (!interaction.member.voice.channel) {
      await interaction.reply("You're not in voice channel");
      return;
    }
    const existingConnection = getVoiceConnection(interaction.guild.id);
    if (existingConnection) {
      await interaction.reply("The bot is already playing");
      return;
    }

    const voiceChannel = interaction.member.voice.channel;

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: interaction.guild.id,
      adapterCreator: interaction.guild.voiceAdapterCreator,
    });

    connection.on(VoiceConnectionStatus.Ready, () => {
      console.log("The bot has connected to the channel!");
    });

    try {
      const filePath = path.join(__dirname, "../bigben.mp3");
      const player = createAudioPlayer();

      let playCount = 0;
      const maxPlays = amount;

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

      await interaction.reply("Playing Big Ben sound!");
    } catch (error) {
      console.error(error);
      await interaction.reply("Failed to play sound.");
    }
  },
};
