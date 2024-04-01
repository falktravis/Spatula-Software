const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('reset-proxies')
		.setDescription('Private command to return ordered proxies for reset')
		.addNumberOption(option => 
            option.setName('182947-limit')
                .setDescription('Maximum number of refreshes for 182947')
                .setRequired(true))
		.addNumberOption(option => 
			option.setName('184098-limit')
				.setDescription('Maximum number of refreshes for 184098')
				.setRequired(true)),
	async execute(interaction) {
		await interaction.editReply(`Deleting proxies`);
	},
};