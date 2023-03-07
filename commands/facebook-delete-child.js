const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('facebook-delete-child')
		.setDescription('Delete Facebook Child')
        .addStringOption(option => 
            option.setName('child-name')
                .setDescription('Name of Child')
                .setRequired(true))
		.addStringOption(option => 
			option.setName('parent-name')
				.setDescription('Name of Parent')
				.setRequired(true)),
	async execute(interaction) {
		await interaction.reply(`Deleting ${interaction.options.getString('name')}`);
	},
};