const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('create-facebook-user')
		.setDescription('Create a new Facebook User')
        .addStringOption(option => 
            option.setName('email')
                .setDescription('Email to be used to create the account')
                .setRequired(true))
		.addStringOption(option => 
			option.setName('first-name')
				.setDescription('Optional parameter to set the first name of your account')
				.setRequired(false))
		.addStringOption(option => 
			option.setName('last-name')
				.setDescription('Optional parameter to set the last name of your account')
				.setRequired(false)),
	async execute(interaction) {
		await interaction.reply(`Creating a user...`);
	},
};