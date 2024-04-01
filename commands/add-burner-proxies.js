const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('add-burner-proxies')
		.setDescription('Private command to add burner proxies')
        .addStringOption(option => 
            option.setName('proxy-list')
                .setDescription('list of proxies')
                .setRequired(true))
		.addStringOption(option => 
			option.setName('proxy-group')
				.setDescription('proxy group for refreshing')
				.setRequired(true)),
	async execute(interaction) {
		await interaction.editReply(`adding burner proxies...`);
	},
};