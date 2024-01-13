const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('all-workers')
		.setDescription('Admin command to list all active workers for diagnostic purposes'),
	async execute(interaction) {
		await interaction.editReply(`Starting...`);
	},
};