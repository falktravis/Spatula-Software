const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('facebook-create-child')
		.setDescription('Create Facebook Child')
        .addStringOption(option => 
            option.setName('name')
                .setDescription('Name of Child')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('parent-name')
                .setDescription('Name of Parent')
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
		await interaction.reply(`Starting ${interaction.options.getString('name')} in ${interaction.options.getString('parent-name')}`);
	},
};