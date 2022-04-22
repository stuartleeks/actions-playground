const { createHash } = require('crypto');

async function getCommand({ context, core, github }) {
	console.log(context);
	console.log("==========================================================================================");
	console.log(context.payload);
	console.log("==========================================================================================");

	const commentUsername = context.payload.comment.user.login;
	const repoFullName = context.payload.repository.full_name;
	const repoParts = repoFullName.split("/");
	const repoOwner = repoParts[0];
	const repoName = repoParts[1];

	// only allow actions for users with write access
	if (!await userHasWriteAccessToRepo({ github }, commentUsername, repoOwner, repoName)) {
		console.log("Command: none [user doesn't have write permission]");
		return "none";
	}

	core.debug('Test debug');
	core.info('Test info');
	core.warning('Test warning');
	core.notice('Test notice');

	const commentLink = context.payload.comment.html_url;
	const commentBody = context.payload.comment.body;
	const commentFirstLine = commentBody.split("\n")[0];

	core.setOutput("testOutput1", false);
	core.setOutput("testOutput2", "Hello!");

	const prNumber = context.payload.issue.number;
	const pr = (await github.rest.pulls.get({ owner: repoOwner, repo: repoName, pull_number: prNumber })).data;
	console.log("==========================================================================================");
	console.log(pr);
	console.log("==========================================================================================");

	const prRefId = getRefIdForPr(prNumber);
	console.log(`prRefId: ${prRefId}`);
	core.setOutput("prRefId", prRefId);

	console.log(`Using head ref: ${pr.head.ref}`)
	const branchRefId = getRefIdForBranch(pr.head.ref);
	console.log(`branchRefId: ${branchRefId}`);

	const potentialMergeCommit = pr.merge_commit_sha;
	console.log(`potentialMergeCommit: ${potentialMergeCommit}`);
	core.setOutput("potentialMergeCommit", potentialMergeCommit);

	const prHeadSha = pr.head.sha;;
	console.log(`prHeadSha: ${prHeadSha}`);

	github.rest.issues.createComment({
		owner: repoOwner,
		repo: repoName,
		issue_number: prNumber,
		body: `:robot: Running pr-bot in response to [the comment](${commentLink}) by @${commentUsername}\nprHeadSha:\`${prHeadSha}\`\n(Runid: ${context.runId})`
	});


	const prFilesResponse = await github.paginate(github.rest.pulls.listFiles, {
		owner: repoOwner,
		repo: repoName,
		pull_number: prNumber
	});
	const prFiles = prFilesResponse.map(file => file.filename);
	console.log("==========================================================================================");
	console.log(prFiles);
	console.log("==========================================================================================");

	const docsRegexes = [/README\.md/, /\.md$/, /\.txt$/];
	const gotNonDocChanges = prFiles.some(file => docsRegexes.every(regex => !regex.test(file)));
	console.log(`gotNonDocChanges: ${gotNonDocChanges}`);
	console.log("==========================================================================================");

	const trimmedFirstLine = commentFirstLine.trim();
	var command = "none"
	if (trimmedFirstLine[0] === '/') {
		switch (trimmedFirstLine) {
			case "/test":
				console.log("Result: run-tests");
				command = "run-tests";
				break;
			case "/help":
				console.log("Result: show-help");
				await showHelp(github, repoOwner, repoName, prNumber);
				command = "none"; // command already handled :-)
				break;
			default:
				console.log("not recognised as a valid command");
				await showHelp(github, repoOwner, repoName, prNumber, trimmedFirstLine);
				command = "none";
				break;
		}
	} else {
		console.log("not a command")
		command = "none";
	}
	console.log(`command: ${command}`);
	core.setOutput("command", command);
	return command;
}

async function showHelp(github, repoOwner, repoName, prNumber, invalidCommand) {
	const leadingContent = invalidCommand ? `\`${invalidCommand}\` is not recognised as a valid command.` : "Hello!";

	const body = `${leadingContent}

You can use the following commands:

|command|description|
|-|-|
|\`/test\`               | build, deploy and run smoke tests on a PR|
|\`/test-extended\`      | build, deploy and run smoke & extended tests on a PR|
|\`/test-force-approve\` | force approval of the PR tests (i.e. skip the deployment checks)|
|\`/test-destroy-env\`   | delete the validation environment for a PR (e.g. to enable testing a deployment from a clean start after previous tests)|
|\`/help\`               | show this help|`;

	await github.rest.issues.createComment({
		owner: repoOwner,
		repo: repoName,
		issue_number: prNumber,
		body: body,
	});

}


async function userHasWriteAccessToRepo({ github }, username, repoOwner, repoName) {
	// Previously, we attempted to use github.event.comment.author_association to check for OWNER or COLLABORATOR
	// Unfortunately, that always shows MEMBER if you are in the microsoft org and have that set to publicly visible
	// (Can check via https://github.com/orgs/microsoft/people?query=<username>)

	// https://docs.github.com/en/rest/reference/collaborators#check-if-a-user-is-a-repository-collaborator
	let userHasWriteAccess = false;
	try {
		console.log(`Checking if user "${username}" has write access to ${repoOwner}/${repoName} ...`)
		const result = await github.request('GET /repos/{owner}/{repo}/collaborators/{username}', {
			owner: repoOwner,
			repo: repoName,
			username
		});
		userHasWriteAccess = result.status === 204;
	} catch (err) {
		if (err.status === 404) {
			console.log("User not found in collaborators");
		} else {
			console.log(`Error checking if user has write access: ${err.status} (${err.response.data.message}) `)
		}
	}
	console.log("User has write access: " + userHasWriteAccess);
	return userHasWriteAccess
}

function getRefIdForPr(prNumber) {
	// Determine newline is for compatibility with previous bash SHA calculation
	return createShortHash(`refs/pull/${prNumber}/merge\n`);
}
function getRefIdForBranch(branchName) {
	// Determine newline is for compatibility with previous bash SHA calculation
	return createShortHash(`refs/heads/${branchName}\n`);
}
function createShortHash(ref) {
	const hash = createHash('sha1').update(ref, 'utf8').digest('hex')
	return hash.substring(0, 8);
}

module.exports = {
	getCommand
}