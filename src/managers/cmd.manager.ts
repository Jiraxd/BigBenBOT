import {
  SlashCommandBooleanOption,
  SlashCommandBuilder,
  SlashCommandNumberOption,
  SlashCommandStringOption,
  SlashCommandUserOption,
} from "@discordjs/builders";
import { REST } from "@discordjs/rest";
import { readdirSync } from "fs";
import { Routes } from "discord-api-types/v10";
import { CommandInteraction } from "discord.js";
import { config } from "../config";

// Peacefully borrowed from https://github.com/Dudewithoutname <3
export class CommandManager {
  private commands: Map<string, Command>;
  private rest: REST;

  constructor() {
    this.commands = new Map();
    this.rest = new REST({ version: "10" }).setToken(config.DISCORD_TOKEN);
  }

  registerCommands = () => {
    const files = readdirSync(`./src/commands/`).filter((f: string) =>
      f.endsWith(".ts")
    );

    files.forEach((file: string) => {
      const command = require(`../commands/${file}`);
      this.commands.set(command.body.name, command.body);
    });
    console.log("[CommandManager] Commands Registered!");
  };

  deployCommands = () => {
    const discordCommands: SlashCommandBuilder[] = [];

    this.commands.forEach((command: Command) => {
      const builder = new SlashCommandBuilder()
        .setName(command.name)
        .setDescription(command.description);
      command.parameters?.forEach((param: CommandParameter) => {
        switch (param.type) {
          case CommandParameterType.USER:
            builder.addUserOption((option: SlashCommandUserOption) =>
              option
                .setName(param.name)
                .setDescription(param.description)
                .setRequired(param.required || false)
            );
            break;
          case CommandParameterType.NUMBER:
            builder.addNumberOption((option: SlashCommandNumberOption) =>
              option
                .setName(param.name)
                .setDescription(param.description)
                .setRequired(param.required || false)
            );
            break;
          case CommandParameterType.STRING:
            builder.addStringOption((option: SlashCommandStringOption) =>
              option
                .setName(param.name)
                .setDescription(param.description)
                .setRequired(param.required || false)
            );
            break;
          case CommandParameterType.BOOLEAN:
            builder.addBooleanOption((option: SlashCommandBooleanOption) =>
              option
                .setName(param.name)
                .setDescription(param.description)
                .setRequired(param.required || false)
            );
            break;
        }
      });

      discordCommands.push(builder);
    });

    discordCommands.map((command) => command.toJSON());

    this.rest
      .put(
        Routes.applicationGuildCommands(config.DISCORD_ID, config.GUILD_ID),
        { body: discordCommands }
      )
      .then(() => console.log("[CommandManager] Commands Deployed!"))
      .catch((err: Error) =>
        console.log(`[CommandManager] Error while command deploying! ${err}`)
      );
  };

  executeCommand = async (interaction: CommandInteraction): Promise<Function> =>
    await this.commands.get(interaction.commandName)?.execute(interaction);
}

export type Command = {
  name: string;
  description: string;
  parameters?: CommandParameter[];
  execute: Function;
};

export type CommandParameter = {
  name: string;
  description: string;
  type: CommandParameterType;
  required?: boolean;
};

export enum CommandParameterType {
  STRING,
  BOOLEAN,
  NUMBER,
  USER,
}
