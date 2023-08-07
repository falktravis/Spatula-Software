const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('delete-all-tasks')
		.setDescription('Admin command to close all tasks before restarting server'),
	async execute(interaction) {
		await interaction.editReply(`Deleting...`);
	},
};