const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('add-facebook-accounts')
		.setDescription('Private command to add burner facebook accounts to the db')
        .addStringOption(option => 
            option.setName('path')
                .setDescription('.txt file path')
                .setRequired(true)),
	async execute(interaction) {
		await interaction.editReply(`adding accounts...`);
	},
};