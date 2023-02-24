const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('run')
		.setDescription('Force run'),
	async execute(interaction) {
		await interaction.reply('Running...');
	},
};