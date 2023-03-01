const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('delete')
		.setDescription('Delete interval')
        .addStringOption(option => 
            option.setName('name')
                .setDescription('name')
                .setRequired(true)),
	async execute(interaction) {
		await interaction.reply('Deleting');
	},
};