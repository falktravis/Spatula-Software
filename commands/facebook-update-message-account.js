const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('facebook-update-message-account')
		.setDescription('Update the account you use for Facebook Messaging')
        .addStringOption(option => 
            option.setName('username')
                .setDescription('Account Username')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('password')
                .setDescription('Account Password')
                .setRequired(true)),
	async execute(interaction) {
		await interaction.reply(`Updating Account...`);
	},
};