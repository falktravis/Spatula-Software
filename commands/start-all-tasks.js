const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('start-all-tasks')
		.setDescription('Admin command to start all tasks stored in the db'),
	async execute(interaction) {
		await interaction.editReply(`Starting...`);
	},
};