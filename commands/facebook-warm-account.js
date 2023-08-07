const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('facebook-warm-account')
		.setDescription('Private command to warm account')
        .addStringOption(option => 
            option.setName('email-or-phone')
                .setDescription('user info of account to be warmed')
                .setRequired(true)),
	async execute(interaction) {
		await interaction.editReply(`warming account...`);
	},
};