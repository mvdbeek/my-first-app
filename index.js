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


async function verifyWebToken(receivedToken, settings, res) {
  // not tested yet
  const decoded_token = jwt.decode(receivedToken, {complete: true});
  const header = decoded_token.header;
  const payload = decoded_token.payload;
  const username = payload.username;
  const server = payload.server;
  // check that account is known
  if (!settings.accounts.some(function(account) {
    return account.server === server && account.username  == username
  })) {
    return false
  };
  // verify token with public key, ensure request has not been forged
  const jwt_endpoint = server + '/api/authenticate/jwk'
  const client = jwksClient({
    jwksUri: jwt_endpoint,
  });
  function getKey(header, callback){
    client.getSigningKey(header.kid || 'galaxy-identity' , function(err, key) {
      var signingKey = key.publicKey || key.rsaPublicKey;
      callback(null, signingKey);
    });
  }

  const verified_payload = jwt.verify(receivedToken, getKey, {}, function(err, decoded) {
    return res.json(decoded)
  });
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
    var token = 'eyJhbGciOiJSUzI1NiJ9.eyJzZXJ2ZXIiOiJodHRwOi8vbG9jYWxob3N0OjgwODAiLCJ1c2VybmFtZSI6Im12ZGJlZWsifQ.Lu6I3kAowSsmCRPc4AJ7KXVCLGbYYeXx-oAS8fR83Si0FhTI3lfr4NWSjd1zXr1s2bwSTl2ZR-hlwTvN_ZDZi00dv4IT-ctWmG5Uuk90PMeV2trK1DvrQfeqbBaQQ3-bIWI4D311nyKDAnK2ESHcZnfeVLi7T9t-BgAkliUUEWih34QEZfKsgtgYRfnoqArRGGqRLkPcXaP1UaLiCt0xsFc57SSQuh6bcZgi7Zmf8yxHtJhAXtMlEDyRXcFODka3tEbfrN0K1_199_0Lrbl9Nn5Awqz63xN-_h5TGN95q6lAfvskK1v8FPYKrCQmm30m5NRY5f6Ex6teN7K2TprhoA';
    var owner = 'mvdbeek';
    var repo = 'gh-app-test';
    var octokit = await app.auth()
    const { data: installation } = await octokit.apps.getRepoInstallation({ owner: owner, repo: repo })
    var octokit = await app.auth(installation.id)
    // const issues = await octokit.issues.createComment({owner: owner, repo: repo, isser_number: 3, body: "Hello from my app"})
    var contents = await getSettings(octokit, owner, repo);
    verifyWebToken(token, contents, res)
  })

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
}
