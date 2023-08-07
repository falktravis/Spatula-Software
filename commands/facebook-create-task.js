const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('facebook-create-task')
		.setDescription('Create Facebook Task')
        .addStringOption(option => 
            option.setName('name')
                .setDescription('Name of Task')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('link')
                .setDescription('Facebook Marketplace link to search')
                .setRequired(true))
        .addNumberOption(option => 
            option.setName('message-type')
                .setDescription('Set the type of messaging for the task')
                .setRequired(true)
                .addChoices(				
                    { name: 'Auto Messaging', value: 1 },
                    { name: 'Manual Messaging', value: 2 },
                    { name: 'No Messaging', value: 3 },
                ))
        .addNumberOption(option => 
            option.setName('start')
                .setDescription('Start time, 24 hour time, no decimals, EST')
                .setRequired(true))
        .addNumberOption(option => 
            option.setName('end')
                .setDescription('End time, 24 hour time, no decimals, EST')
                .setRequired(true))
        .addNumberOption(option => 
            option.setName('distance')
                .setDescription('Maximum item distance from location')
                .setRequired(true)
                .addChoices(				
                    { name: '1', value: 1 },
                    { name: '2', value: 2 },
                    { name: '5', value: 3 },
                    { name: '10', value: 4 },
                    { name: '20', value: 5 },
                    { name: '40', value: 6 },
                    { name: '60', value: 7 },
                    { name: '80', value: 8 },
                    { name: '100', value: 9 },
                    { name: '250', value: 10 },
                    { name: '500', value: 11 },
                ))
        .addStringOption(option => 
            option.setName('message')
                .setDescription('Message content sent to seller')
                .setRequired(false)),
	async execute(interaction) {
		await interaction.editReply(`Starting ${interaction.options.getString('name')}`);
	},
};