const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('clean-database')
		.setDescription('Clean both main and burner databases'),
	async execute(interaction) {
		await interaction.reply(`Adding main proxies...`);
	},
};