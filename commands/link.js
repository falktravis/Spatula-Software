const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('link')
		.setDescription('Set the link')
        .addStringOption(option => 
            option.setName('link')
                .setDescription('link')
                .setRequired(true)),
	async execute(interaction) {
		await interaction.reply('Link set');
	},
};