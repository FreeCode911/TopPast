const express = require('express');
const path = require('path');
const fs = require('fs'); // Re-added the fs module
const crypto = require('crypto');
const dotenv = require('dotenv');

async function TopPast() {
		dotenv.config();

		const app = express();
		const maxContentLength = parseInt(process.env.MAX_CONTENT_LENGTH, 9999999999999999999999999999999);
		const githubToken = process.env.GITHUB_TOKEN;
		const githubRepo = process.env.GITHUB_REPO;
		const websiteUrl = process.env.WEBSITE_URL || 'http://localhost';
		const port = process.env.PORT || 8080;

		if (!githubToken || !githubRepo || !websiteUrl) {
				console.error(`
\x1b[31m================================\x1b[0m
\x1b[31m          ERROR: Configuration\x1b[0m
\x1b[31m================================\x1b[0m
				Missing or incorrect environment variables:`);

				if (!githubToken) {
						console.error(`\x1b[31m- GITHUB_TOKEN Not Found\x1b[0m`);
				} else {
						console.error(`\x1b[32m- GITHUB_TOKEN Found\x1b[0m`);
				}

				if (!githubRepo) {
						console.error(`\x1b[31m- GITHUB_REPO Not Found\x1b[0m`);
				} else {
						console.error(`\x1b[32m- GITHUB_REPO Found\x1b[0m`);
				}

				if (!websiteUrl) {
						console.error(`\x1b[31m- WEBSITE_URL Not Found\x1b[0m`);
				} else {
						console.error(`\x1b[32m- WEBSITE_URL Found\x1b[0m`);
				}

				console.error(`Please set them in your .env file.
\x1b[31m================================\x1b[0m
				`);
				process.exit(1); // Exit the process with an error code
		}

		async function getOctokit() {
				const { Octokit } = await import('@octokit/rest');
				return new Octokit({ auth: githubToken });
		}

		// Function to generate HTML content from the template
		function generateHtmlContent(title, content) {
				const templatePath = path.join(__dirname, 'public', 'template.html');
				let template = fs.readFileSync(templatePath, 'utf8'); // Using fs to read the template file
				template = template.replace(/{title}/g, title || 'Untitled');
				template = template.replace(/{content}/g, content);
				return template;
		}

		app.use(express.json());
		app.use(express.urlencoded({ extended: true }));

		app.get('/', (req, res) => {
				res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
						if (err) {
								console.error(`Error sending index page: ${err.message}`);
								res.status(500).send('Error loading index page.');
						}
				});
		});

		app.post('/paste', async (req, res) => {
				const { title, content } = req.body;

				if (!content || content.length > maxContentLength) {
						return res.status(400).send('Content is required and must be below the size limit.');
				}

				const pasteId = crypto.randomBytes(6).toString('hex');
				const octokit = await getOctokit();

				try {
						// Generate HTML content
						const htmlContent = generateHtmlContent(title, content);

						// Convert the content to Base64
						const base64Content = Buffer.from(htmlContent, 'utf8').toString('base64');

						// Upload to GitHub
						await octokit.repos.createOrUpdateFileContents({
								owner: githubRepo.split('/')[0],
								repo: githubRepo.split('/')[1],
								path: `pastes/${pasteId}.html`,
								message: `Added paste ${pasteId}`,
								content: base64Content
						});

						const fileUrl = `${websiteUrl}/pastes/${pasteId}`;
						res.json({ file_url: fileUrl });
				} catch (error) {
						console.error('Error saving paste to GitHub:', error.message);
						res.status(500).send('Error saving paste.');
				}
		});

		app.get('/p/:pasteId', async (req, res) => {
				const { pasteId } = req.params;
				const filePath = `pastes/${pasteId}.html`;
				const octokit = await getOctokit();

				try {
						const data = await octokit.repos.getContent({
								owner: githubRepo.split('/')[0],
								repo: githubRepo.split('/')[1],
								path: filePath
						});

						const content = Buffer.from(data.data.content, 'base64').toString('utf8');
						res.send(content);
				} catch (error) {
						console.error('Error retrieving paste from GitHub:', error.message);
						res.status(404).send('Paste not found');
				}
		});

		app.use((req, res, next) => {
				res.status(404).sendFile(path.join(__dirname, 'public', '404.html'), (err) => {
						if (err) {
								console.error(`Error sending 404 page: ${err.message}`);
								res.status(500).send('Error loading 404 page.');
						}
				});
		});

		app.listen(port, () => {
				console.log(`
\x1b[32m================================\x1b[0m
\x1b[32m     TopPast Running\x1b[0m
\x1b[32m================================\x1b[0m
\x1b[32mVersion v1.1\x1b[0m
\x1b[32mWebsite: https://lykcloud.me\x1b[0m
\x1b[32mDiscord: https://discord.com/invite/jKzn4aMu8Z\x1b[0m
\x1b[32m================================\x1b[0m
\x1b[32mTopPast By LegendYt4k\x1b[0m
\x1b[32m================================\x1b[0m
`);
				console.log(`\x1b[32mAnoUpload is running on Port :${port}\x1b[0m`);
		});
}

TopPast();
