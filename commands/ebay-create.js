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
                .setRequired(true)),
	async execute(interaction) {
		await interaction.reply(`Starting ${interaction.options.getString('name')}`);
	},
};