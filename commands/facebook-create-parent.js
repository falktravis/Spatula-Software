const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('facebook-create-parent')
		.setDescription('Create Facebook Parent')
        .addStringOption(option => 
            option.setName('name')
                .setDescription('Name of Parent')
                .setRequired(true))
        .addBooleanOption(option => 
            option.setName('auto-message')
                .setDescription('If true Spatula will automatically message the seller of every new listing')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('username')
                .setDescription('Facebook username, used for messaging')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('password')
                .setDescription('Facebook password, used for messaging')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('burner-logins')
                .setDescription('Burner logins used for searching, use this syntax (username:password, username:password, etc...)')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('message')
                .setDescription('Message content sent to seller')
                .setRequired(false)),
	async execute(interaction) {
		await interaction.reply(`Starting ${interaction.options.getString('name')}`);
	},
};