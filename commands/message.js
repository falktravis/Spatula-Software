const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('message')
		.setDescription('Send a Facebook message')
		.addStringOption(option => 
            option.setName('message')
                .setDescription('message')
                .setRequired(true)),
	async execute(interaction) {
		await interaction.reply('Sending...');
	},
};