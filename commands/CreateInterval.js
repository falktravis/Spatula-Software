const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('create')
		.setDescription('Create interval')
        .addStringOption(option => 
            option.setName('name')
                .setDescription('name')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('link')
                .setDescription('link')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('min')
                .setDescription('minimum interval')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('max')
                .setDescription('maximum interval')
                .setRequired(true)),
	async execute(interaction) {
		await interaction.reply('Digging for gold...');
	},
};