const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('fansfirst-create-task')
		.setDescription('Create Fansfirst Task')
        .addStringOption(option => 
            option.setName('name')
                .setDescription('Name of Task')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('link')
                .setDescription('Fansfirst link to scan')
                .setRequired(true)),
	async execute(interaction) {
		await interaction.editReply(`Starting ${interaction.options.getString('name')}`);
	},
};