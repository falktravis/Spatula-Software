const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ebay-create')
		.setDescription('Create Ebay Interval')
        .addStringOption(option => 
            option.setName('name')
                .setDescription('name of interval')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('link')
                .setDescription('link')
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