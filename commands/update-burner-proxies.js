const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('update-burner-proxies')
		.setDescription('Private command to update burner proxies')
        .addStringOption(option => 
            option.setName('proxy-list')
                .setDescription('list of proxies')
                .setRequired(true)),
	async execute(interaction) {
		await interaction.reply(`updating burner proxies...`);
	},
};