/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */


const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const YAML = require('yamljs');

function verifyToken(token) {
  return jwt.decode(jwt.sign({ foo: 'bar' }, 'shhhhh'));
}

async function getSettings(octokit, owner, repo) {
  const result = await octokit.repos.getContents({
    owner: owner,
    repo: repo,
    path: 'galaxy.settings.yml',
  })
  const settings = YAML.parse(Buffer.from(result.data.content, 'base64').toString())
  return settings
}


async function verifyWebToken(receivedToken, settings) {
  // not tested yet
  const decoded_token = jwt.decode(receivedToken);
  const username = decoded_token.username;
  const server = decoded_token.server;
  // check that account is known
  if (!settings.accounts.some(function(account) {
    return account.server === server && account.username  == username
  })) {
    return false
  };
  // verify token with public key, ensure request has not been forged

}




module.exports = app => {
  // Your code here
  app.log('Yay, the app was loaded!')

  app.on('issues.opened', async context => {
    app.log(context)
    // const issueComment = context.issue({ body: 'Thanks for opening this issue!' })
    // return context.github.issues.createComment(issueComment)
  })
  const server = app.route()
  server.get('/whoami', async (req, res) => {
    var owner = 'mvdbeek';
    var repo = 'gh-app-test';
    var octokit = await app.auth()
    const { data: installation } = await octokit.apps.getRepoInstallation({ owner: owner, repo: repo })
    var octokit = await app.auth(installation.id)
    // const issues = await octokit.issues.createComment({owner: owner, repo: repo, isser_number: 3, body: "Hello from my app"})
    var contents = await getSettings(octokit, owner, repo);
    res.json(contents);
  })

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
}
