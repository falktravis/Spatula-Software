const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('facebook-delete-parent')
		.setDescription('Delete Facebook Parent')
        .addStringOption(option => 
            option.setName('name')
                .setDescription('Name of Parent')
                .setRequired(true)),
	async execute(interaction) {
		await interaction.reply(`Deleting ${interaction.options.getString('name')} and all children`);
	},
};