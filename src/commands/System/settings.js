const { MessageEmbed } = require('discord.js');
const Command = require('../../classes/Command');
const readableSettings = {
  modRole: 'Moderator Role',
  adminRole: 'Administrator Role',
  permissionNotice: 'Permission Notice',
  modLog: 'Moderator Log',
  restrictCmds: 'Command Channel'
};
const { settingsCache } = require('../../mongo/settings');

module.exports = new Command(async ({ client, interaction, guildSettings, args, emojis }) => {
  const { guild } = interaction;

  if (args[0].name === 'action') {
    const action = args[0].options[0].name;
    if (action === 'view') {
      const settingsEmbed = new MessageEmbed()
        .setColor(client.json.colors.main)
        .setAuthor(`Essential Settings for ${guild.name}!`, guild.iconURL({ dynamic: true }));

      let counter = 0;

      Object.entries(guildSettings._doc).forEach(([key, value]) => {
        if (
          key === 'disabledCmds'
          || key === '_guildId'
          || key === '__v'
          || key === '_id'
        ) return;
        if (
          typeof value === 'object'
        ) {
          Object.entries(value).forEach(([subKey, subValue]) => {
            if (subKey === '$init') return;
            counter++;
            addField(interaction, settingsEmbed, subKey, subValue, counter);
          });
        } else {
          counter++;
          addField(interaction, settingsEmbed, key, value, counter);
        }
      });

      interaction.reply({ embeds: [settingsEmbed] });
    // Reset
    } else {
      guildSettings.delete();
      settingsCache.delete(guild.id);
      interaction.reply({
        content: `${emojis.response.success} Successfully reset your server's settings!`,
        ephemeral: true
      });
    }
    return;
  }

  const requested = args[0].options[0].name;
  const newValue = args[0].options[0] ? args[0].options[0].options[0].value : false;
  const globalCommands = await client.application.commands.fetch();

  const updatePermissions = async (guild, permLevel) => {
    for (const command of globalCommands.filter((e) => {
      return client.commands.get(e.name).config.permLevel === permLevel;
    })) {
      guild.commands.permissions.set({
        command: command[0],
        permissions: [
          {
            id: guild.id,
            type: 'ROLE',
            permission: false
          },
          {
            id: guild.ownerId,
            type: 'USER',
            permission: true
          },
          {
            id: newValue,
            type: 'ROLE',
            permission: true
          }
        ]
      });
    }
  };

  switch (requested) {
    case 'modrole': {
      if (guildSettings.permissions.modRole === newValue) return replySameValue(interaction, 'modRole');
      guildSettings.permissions.modRole = newValue;
      await guildSettings.save();
      returnUpdated(interaction, 'modRole', guild.roles.cache.get(newValue).name);
      updatePermissions(guild, 'Moderator');
      break;
    }

    case 'adminrole': {
      if (guildSettings.permissions.adminRole === newValue) return replySameValue(interaction, 'adminRole');
      guildSettings.permissions.adminRole = newValue;
      await guildSettings.save();
      returnUpdated(interaction, 'adminRole', guild.roles.cache.get(newValue).name);
      updatePermissions(guild, 'Administrator');
      break;
    }

    case 'notice': {
      if (guildSettings.permissions.permissionNotice === newValue) return replySameValue(interaction, 'permissionNotice');
      guildSettings.permissions.permissionNotice = newValue;
      await guildSettings.save();
      returnUpdated(interaction, 'permissionNotice', newValue);
      break;
    }

    case 'modlog': {
      if (guildSettings.channels.modLog === newValue) return replySameValue(interaction, 'modLog');
      const channel = guild.channels.cache.get(newValue);
      if (channel.type !== 'GUILD_TEXT') {
        return interaction.reply({
          content: `${emojis.response.error} Provide a text channel instead!`,
          ephemeral: true
        });
      }
      guildSettings.channels.modLog = newValue;
      await guildSettings.save();
      returnUpdated(interaction, 'modLog', channel.name);
      break;
    }

    case 'command': {
      if (guildSettings.channels.restrictCmds === newValue) return replySameValue(interaction, 'commandChannel');
      const channel = guild.channels.cache.get(newValue);
      if (channel.type !== 'GUILD_TEXT') {
        return interaction.reply({
          content: `${emojis.response.error} Provide a text channel instead!`,
          ephemeral: true
        });
      }
      guildSettings.channels.restrictCmds = newValue;
      await guildSettings.save();
      returnUpdated(interaction, 'commandChannel', channel.name);
      break;
    }

    default: break;
  }
}, {
  required: true,
  permLevel: 'Administrator',
  throttling: {
    usages: 2,
    duration: 5
  },
  globalCommand: true,
  testCommand: false,
  data: {
    description: 'Configure the permission levels for your server, this determines what commands members can use',
    options: [
      {
        name: 'permissions',
        description: 'Change permission levels for your server',
        required: false,
        type: 2,
        options: [
          {
            name: 'modrole',
            description: 'Change the required role for the Moderator permission',
            type: 1,
            options: [
              {
                name: 'role',
                description: 'The required role',
                type: 8,
                required: true
              }
            ]
          },
          {
            name: 'adminrole',
            description: 'Change the required role for the Administrator permission',
            type: 1,
            options: [
              {
                name: 'role',
                description: 'The required role',
                type: 8,
                required: true
              }
            ]
          },
          {
            name: 'notice',
            description: 'Send a message when someone tries to use a command they don\'t have access to',
            type: 1,
            options: [
              {
                name: 'notice',
                description: 'Enable or disable the permissions notice',
                type: 5,
                required: true
              }
            ]
          }
        ]
      },
      {
        name: 'channels',
        description: 'Change dedicated channels for your server',
        required: false,
        type: 2,
        options: [
          {
            name: 'modlog',
            description: 'Change the modlog channel',
            type: 1,
            options: [
              {
                name: 'channel',
                description: 'The channel',
                type: 7,
                required: true
              }
            ]
          },
          {
            name: 'command',
            description: 'Change the command channel, if set, member\'s can only use commands in this channel',
            type: 1,
            options: [
              {
                name: 'channel',
                description: 'The channel',
                type: 7,
                required: true
              }
            ]
          }
        ]
      },
      {
        name: 'action',
        description: 'Other settings functionality',
        type: 2,
        required: false,
        options: [
          {
            name: 'reset',
            description: 'Reset your settings',
            type: 1
          },
          {
            name: 'view',
            description: 'View your settings',
            type: 1
          }
        ]
      }
    ],
  }
});

const replySameValue = (interaction, setting) => {
  return interaction.reply({
    content: `Setting "${setting}" already has that value!`,
    ephemeral: true
  });
};

const returnUpdated = (interaction, setting, newValue) => {
  return interaction.reply({
    content: `Setting \`${setting}\` successfully updated to **${newValue}**!`,
    ephemeral: true
  });
};

const addField = (interaction, embed, key, value, counter) => {
  const channel = interaction.guild.channels.cache.get(value);
  const role = interaction.guild.roles.cache.get(value);
  if (channel || role) return embed.addField(`__${counter}__ ${readableSettings[key]}`, `${role ? `${role.toString()}` : `${channel.toString()}`}`, false);
  if (typeof value === 'boolean' || value === 'true' || value === 'false') {
    embed.addField(`__${counter}__ ${readableSettings[key]}`, `${value === true ? '✅ Enabled' : '⛔ Disabled'}`, false);
  } else {
    embed.addField(`__${counter}__ ${readableSettings[key]}`, `${!value ? 'None!' : `${value}`}`, false);
  }
};
