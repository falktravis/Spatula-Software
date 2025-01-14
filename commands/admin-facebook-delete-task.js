const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('admin-facebook-delete-task')
		.setDescription('Delete Facebook Task')
		.addStringOption(option => 
            option.setName('user-id')
                .setDescription('Task User Id')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('task-name')
                .setDescription('Name of Task')
                .setRequired(true)),
	async execute(interaction) {
		await interaction.editReply(`Deleting ${interaction.options.getString('task-name')}`);
	},
};