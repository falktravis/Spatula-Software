const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('change-language')
		.setDescription('Admin command to change language for all accounts'),
	async execute(interaction) {
		await interaction.editReply(`Running...`);
	},
};