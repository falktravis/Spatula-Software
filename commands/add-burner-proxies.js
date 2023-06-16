const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('add-burner-proxies')
		.setDescription('Private command to add burner proxies')
        .addStringOption(option => 
            option.setName('proxy-list')
                .setDescription('list of proxies')
                .setRequired(true)),
	async execute(interaction) {
		await interaction.reply(`adding burner proxies...`);
	},
};