const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('facebook-create-child')
		.setDescription('Create Facebook Child')
        .addStringOption(option => 
            option.setName('name')
                .setDescription('Name of Child')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('parent-name')
                .setDescription('Name of Parent')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('link')
                .setDescription('link')
                .setRequired(true))
        .addBooleanOption(option => 
            option.setName('login-search')
                .setDescription('login on search for accurate distance parameter')
                .setRequired(true))
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
                .setRequired(false)
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
                )),
	async execute(interaction) {
		await interaction.reply(`Starting ${interaction.options.getString('name')} in ${interaction.options.getString('parent-name')}`);
	},
};