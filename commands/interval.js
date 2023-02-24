const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('interval')
		.setDescription('Set the interval')
        .addIntegerOption(option => 
            option.setName('min')
                .setDescription('minimum interval')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('max')
                .setDescription('maximum interval')
                .setRequired(true)),
	async execute(interaction) {
		await interaction.reply('Interval set');
	},
};