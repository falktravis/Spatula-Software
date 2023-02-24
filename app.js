/**
 * TODO: Hook up the interval
 * TODO: Return more than just the link
 * TODO: Store about 50 listing links in an array
 * 
 */

require('dotenv').config();
const puppeteer = require('puppeteer');

let facebookLink = 'https://www.facebook.com/marketplace/108296955861705/search?maxPrice=0&query=couch&exact=false';
let minInterval = 5;
let maxInterval = 10;
let listingStorage = [];

//*discord.js stuff
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

//listen for commands
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	if (interaction.commandName === "interval") {
		minInterval = interaction.options.getInteger("min");
        maxInterval = interaction.options.getInteger("max");
	}
	if (interaction.commandName === "link") {
		facebookLink = interaction.options.getString("link");
	}
    if (interaction.commandName === "run") {
        (async () => {
            const browser = await puppeteer.launch({ headless: true });
            const page = await browser.newPage();
    
            // Navigate to Facebook login page
            await page.goto('https://www.facebook.com/');
    
            // Fill in email and password and submit the form
            await page.type('#email', 'falk.travis@gmail.com');
            await page.type('#pass', 'Bru1ns#18');
            await page.click('button[name="login"]');
    
            // Wait for login to complete and navigate to Facebook Marketplace
            await page.waitForNavigation();
            await page.goto(facebookLink, { waitUntil: 'networkidle2' });
            const newPosts = await page.evaluate(() => {
                const posts = Array.from(document.querySelectorAll(".x3ct3a4"));
                return posts.map(post => {
                    listingStorage.push(post.querySelector('a').href.substring(0, 58));
                    return post.querySelector('a').href.substring(0, 58);
                });
            });
            
            client.channels.cache.get(process.env.DISCORD_CHANNEL_ID).send(`New listing: ${newPosts[0]}`);
        })();
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}
});

/*
(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(facebookLink, { waitUntil: 'networkidle2' });

  setInterval(async () => {
    const newPosts = await page.evaluate(() => {
      const posts = Array.from(document.querySelectorAll(".x3ct3a4"));
      return posts.map(post => {
        const link = post.querySelector('a').href.substring(0, 58);
        const title = post.querySelector('a span').innerText;
        const price = post.querySelector('._l57xt').innerText;
        return { link, title, price };
        });
    });

    for (const post of newPosts) {
      const message = `New listing: ${post.title} (${post.price})\n${post.link}`;
      client.channels.cache.get(process.env.DISCORD_CHANNEL_ID).send(message);
    }
  }, Math.floor((Math.random() * (maxInterval - minInterval) + minInterval)/60000));

  // Close the browser when the app is terminated
  process.on('SIGINT', async () => {
    await browser.close();
    process.exit();
  });
})();*/

client.login(process.env.DISCORD_BOT_TOKEN);



/*


const message = `New listing: ${post.title} (${post.price})\n${post.link}`;
*/