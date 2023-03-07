const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ebay-delete')
		.setDescription('Delete Ebay Interval')
        .addStringOption(option => 
            option.setName('name')
                .setDescription('Name of Interval')
                .setRequired(true)),
	async execute(interaction) {
		await interaction.reply(`Deleting ${interaction.options.getString('name')}`);
	},
};