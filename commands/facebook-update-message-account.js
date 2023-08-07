const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('facebook-update-message-account')
		.setDescription('Update the account you use for Facebook Messaging')
        .addStringOption(option => 
            option.setName('cookies')
                .setDescription('Account cookies, check #facebook guide for more details')
                .setRequired(true)),
	async execute(interaction) {
		await interaction.editReply(`Updating Account...`);
	},
};