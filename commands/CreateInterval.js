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
                .setDescription('minimum interval in minutes')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('max')
                .setDescription('maximum interval in minutes')
                .setRequired(true))
        .addNumberOption(option => 
            option.setName('start')
                .setDescription('Start time, 24 hour time, no decimals, EST')
                .setRequired(true))
        .addNumberOption(option => 
            option.setName('end')
                .setDescription('End time, 24 hour time, no decimals, EST')
                .setRequired(true)),
	async execute(interaction) {
		await interaction.reply(`Starting ${interaction.options.getString('name')}`);
	},
};