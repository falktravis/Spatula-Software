/**
 *              TODO: Figure out a way to make the number of links returned in each query constant
 *              TODO: Run interval only between certain times, workers can only run for a set amount of hours each day
 *              TODO: Catch any errors and send them to testing channel
 *              TODO: Get some data about how many workers are running and resources being used
 *              TODO: Proxies
 *              TODO: Don't get results from outside search, while maintaining number of results queried
 * 
 *                          TODO: Get that Shmoney
 * 
 * Keep in mind that storing a large number of worker threads in memory can be resource-intensive, so you may want to consider using a database or some other storage solution if you have a very large number of worker threads.
 */

require('dotenv').config();
const { Worker } = require('worker_threads');

//general set up
const fs = require('node:fs');
const path = require('node:path');
const { Client, Events, GatewayIntentBits, Collection } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

//command set up
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	} else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}

const workers = new Map();

//listen for commands
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;
	const command = interaction.client.commands.get(interaction.commandName);

    if(interaction.commandName === "create"){
        //sets the name of the worker, name + channel so users can't delete each others workers
        const name = interaction.options.getString("name") + interaction.channelId;
        workers.set(name, new Worker('./worker.js', { workerData:{
            name: interaction.options.getString("name"),
            link: interaction.options.getString("link"),
            min: interaction.options.getInteger("min"),
            max: interaction.options.getInteger("max"),
            channel: interaction.channelId,
        }}));
    }
    if(interaction.commandName === "delete"){
        const name = interaction.options.getString("name") + interaction.channelId;
        workers.get(name).terminate();
        workers.delete(name);
    }

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}
});

client.login(process.env.DISCORD_BOT_TOKEN);



/*
    *If we ever need to login to do something*

await mainPage.goto('https://www.facebook.com/');
await mainPage.type('#email', 'falk.travis@gmail.com');
await mainPage.type('#pass', 'Bru1ns#18');
await mainPage.click('button[name="login"]');

// Wait for login to complete and navigate to Facebook Marketplace
await mainPage.waitForNavigation();
*/