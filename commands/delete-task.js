const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('delete-task')
		.setDescription('Delete Task')
        .addStringOption(option => 
            option.setName('task-name')
                .setDescription('Name of Task')
                .setRequired(true)),
	async execute(interaction) {
		await interaction.editReply(`Deleting ${interaction.options.getString('task-name')}`);
	},
};