const { getPermissionLevel } = require('../../handlers/permissions')
const { MessageEmbed } = require('discord.js')

exports.run = ({ client, message }) => {
  const { member, channel, guild } = message
  const perms = getPermissionLevel(member, channel, guild)
  const { permissionLevel, permissionName } = perms

  const permLevelEmbed = new MessageEmbed()
    .setColor('WHITE')
    .setDescription(`${member.toString()}, your permission level is: __${permissionLevel}__ - **${permissionName}**`)
  channel.send({ embeds: [permLevelEmbed] })
}

exports.config = {
  enabled: true,
  required: false,
  aliases: [],
  permLevel: 'User',
  clientPermissions: ['EMBED_LINKS'],
  userPermissions: []
}

exports.help = {
  shortDescription: 'Tells you your permission level for executing bot commands.',
  longDescription: 'Tells you your permission level for executing bot commands.',
  examples: []
}
