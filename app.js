/**
 *              TODO: Catch any errors and send them to testing channel
 *              TODO: Get some data about how many workers are running and resources being used
 *              TODO: Proxies
 *                  -Test and reduce data passed through proxies, mainly images
 *                  -Data center for now, need some extensive testing (this is what beta testing is for)
 *              TODO: Auto message, and on click
 *              TODO: Login in a more universal way
 *              TODO: Put multiple tabs on one worker?
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
const { Client, Events, GatewayIntentBits, Collection, IntegrationExpireBehavior } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.login(process.env.DISCORD_BOT_TOKEN);

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

const facebookWorkers = new Map();

//listen for commands
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;
	const command = interaction.client.commands.get(interaction.commandName);

    if(interaction.commandName === "facebook-create-parent"){
        if(interaction.options.getBoolean("auto-message") == true){
            //checks if there is a username a password for auto message
            if(interaction.options.getString("password") != null && interaction.options.getString("username") != null){
                facebookWorkers.set(interaction.user.id + interaction.options.getString("name"), {
                    parent: new Worker('./facebook-parent.js', { workerData:{
                        username: interaction.options.getString("username"),
                        password: interaction.options.getString("password"),
                        autoMessage: interaction.options.getBoolean("auto-message"),
                        channel: interaction.channelId,
                    }}),
                    autoMessage: interaction.options.getBoolean("auto-message"),
                    children: new Map()
                });
            }else{
                client.channels.cache.get(interaction.channelId).send({ content: 'Error with parent\n If auto-message is true, a username a password is required', ephemeral: true });
            }
        }else{
            facebookWorkers.set(interaction.user.id + interaction.options.getString("name"), {
                parent: new Worker('./facebook-parent.js', { workerData:{
                    autoMessage: interaction.options.getBoolean("auto-message"),
                    channel: interaction.channelId,
                }}),
                autoMessage: interaction.options.getBoolean("auto-message"),
                children: new Map()
            });
        }
        console.log(facebookWorkers);
    }
    else if(interaction.commandName === "facebook-create-child"){
        //checks if parent exists
        if(facebookWorkers.has(interaction.user.id + interaction.options.getString("parent-name"))){
            let start = interaction.options.getNumber("start");
            let end = interaction.options.getNumber("end");
    
            //time difference
            let timeDiff;
            if(start < end){
                timeDiff = end - start;
            }else{
                timeDiff = 24 - end + start;
            }
        
            //both times are between 1 and 25, the difference is less than or equal to 14
            if(start <= 24 && start >= 1 && end <= 24 && end >= 1 && end !== start && timeDiff <= 16){
                //get parent element from map and set new worker as a child
                console.log("Parent Auto Message: " + facebookWorkers.get(interaction.user.id + interaction.options.getString("parent-name")).autoMessage);
                facebookWorkers.get(interaction.user.id + interaction.options.getString("parent-name")).children.set(interaction.options.getString("name"), new Worker('./facebook-child.js', { workerData:{
                    name: interaction.options.getString("name"),
                    parent: interaction.options.getString("parent-name"),
                    link: interaction.options.getString("link"),
                    start: start * 60,
                    end: end * 60,
                    autoMessage: facebookWorkers.get(interaction.user.id + interaction.options.getString("parent-name")).autoMessage,
                    channel: interaction.channelId,
                }}));
            }else{
                client.channels.cache.get(interaction.channelId).send({ content: "Error with times\nTimes must be between 1 and 24 with no decimals\nThe interval it runs on must be less than or equal to 16 hours", ephemeral: true });
            }
        }else{
            client.channels.cache.get(interaction.channelId).send({ content: "Parent Does not Exist", ephemeral: true });
        }
        console.log(facebookWorkers);
    }
    else if(interaction.commandName === "facebook-delete-child"){
        if(facebookWorkers.has(interaction.user.id + interaction.options.getString("parent-name"))){
            let parent = facebookWorkers.get(interaction.user.id + interaction.options.getString("parent-name"));
            if(parent.children.has(interaction.options.getString("child-name"))){
                parent.children.get(interaction.options.getString("child-name")).terminate();
                parent.children.delete(interaction.user.id + interaction.options.getString("child-name"));
            }else{
                client.channels.cache.get(interaction.channelId).send({ content: "Child Does not Exist", ephemeral: true });
            }
        }else{
            client.channels.cache.get(interaction.channelId).send({ content: "Parent Does not Exist", ephemeral: true });
        }
        console.log(facebookWorkers);
    }
    else if(interaction.commandName === "facebook-delete-parent"){
        if(facebookWorkers.has(interaction.user.id + interaction.options.getString("name"))){
            let parent = facebookWorkers.get(interaction.user.id + interaction.options.getString("name"));
            parent.children.forEach((child) => {
                child.terminate();
            });
            parent.parent.terminate();
            facebookWorkers.delete(interaction.user.id + interaction.options.getString("name"));
        }else{
            client.channels.cache.get(interaction.channelId).send({ content: "Parent Does not Exist", ephemeral: true });
        }
        console.log(facebookWorkers);
    }

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}
});



/*
    *If we ever need to login to do something*

await mainPage.goto('https://www.facebook.com/');
await mainPage.type('#email', 'falk.travis@gmail.com');
await mainPage.type('#pass', 'Bru1ns#18');
await mainPage.click('button[name="login"]');

// Wait for login to complete and navigate to Facebook Marketplace
await mainPage.waitForNavigation();
*/