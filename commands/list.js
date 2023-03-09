const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('list')
		.setDescription('List all workers'),
	async execute(interaction) {
		await interaction.reply("Workers:");
	},
};